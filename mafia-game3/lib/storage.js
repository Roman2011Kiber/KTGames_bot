/**
 * storage.js — Auto-switching storage layer.
 *
 * MODE A — Firestore (when firebaseConfig.apiKey is set):
 *   Game state lives in Firestore `rooms/{code}`.
 *   Phase advancement runs on the host's client.
 *   Works on any static hosting (Firebase Hosting, Vercel, etc.)
 *
 * MODE B — REST API (default, when firebaseConfig is empty):
 *   Game state lives in the bundled Express server.
 *   Works out-of-the-box on Replit with no extra setup.
 */

import { firebaseConfig } from './config.js';
import { buildDeck, ROLE_LABEL, roleTeam } from './roles.js';
import { BOT_NAMES, AVATARS } from './names.js';
import { initFirestoreDb, fs } from './firebase.js';

// ─────────────────────────────────────────────────────────────────────────────
// Firebase initialisation (lazy — only when apiKey provided)
// ─────────────────────────────────────────────────────────────────────────────

let _db = null;

async function getDb() {
  if (_db) return _db;
  if (!firebaseConfig?.apiKey) return null;
  _db = await initFirestoreDb(firebaseConfig);
  return _db;
}

// Eagerly init so the first user action isn't slow
getDb().catch(() => {});

const USE_FIRESTORE = Boolean(firebaseConfig?.apiKey);

// ─────────────────────────────────────────────────────────────────────────────
// localStorage helpers (same in both modes)
// ─────────────────────────────────────────────────────────────────────────────

export const saveNickname  = n  => { try { localStorage.setItem('mafia:nick', n); } catch {} };
export const loadNickname  = () => { try { return localStorage.getItem('mafia:nick') || ''; } catch { return ''; } };
export const saveLastGame  = g  => { try { localStorage.setItem('mafia:solo', JSON.stringify(g)); } catch {} };
export const loadLastGame  = () => { try { const s = localStorage.getItem('mafia:solo'); return s ? JSON.parse(s) : null; } catch { return null; } };
export const clearLastGame = () => { try { localStorage.removeItem('mafia:solo'); } catch {} };
export const saveMe = (code, info) => { try { localStorage.setItem(`mafia:me:${code}`, JSON.stringify(info)); } catch {} };
export const loadMe = code => { try { const r = localStorage.getItem(`mafia:me:${code}`); return r ? JSON.parse(r) : null; } catch { return null; } };

// ─────────────────────────────────────────────────────────────────────────────
// MODE B — REST API helpers
// ─────────────────────────────────────────────────────────────────────────────

const API = '/api/mafia';

async function apiCall(path, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Помилка сервера');
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// MODE A — Firestore game-logic helpers
// ─────────────────────────────────────────────────────────────────────────────

const FS_NIGHT_ROLES = new Set(['mafia', 'doctor', 'sheriff']);

function fsNewId()   { return Math.random().toString(36).slice(2, 9); }
function fsNewCode() { return Math.random().toString(36).slice(2, 7).toUpperCase(); }

function fsAlive(room)    { return (room.players || []).filter(p => p.alive); }
function fsAddLog(log, e) { const n = [...(log || []), e]; return n.length > 80 ? n.slice(-80) : n; }

function fsTimerExpired(room, dur) {
  if (!room.phaseStartedAt) return false;
  return Date.now() - room.phaseStartedAt >= (dur || 60) * 1000;
}

function fsCheckWinner(players) {
  const alive = players.filter(p => p.alive);
  const m = alive.filter(p => p.role === 'mafia').length;
  const t = alive.filter(p => p.role !== 'mafia').length;
  if (m === 0) return 'town';
  if (m >= t) return 'mafia';
  return null;
}

function fsAllHumansActedNight(room) {
  return fsAlive(room)
    .filter(p => !p.isBot && FS_NIGHT_ROLES.has(p.role))
    .every(p => room.nightActions?.[p.id] !== undefined);
}

function fsAllHumansVoted(room) {
  return fsAlive(room)
    .filter(p => !p.isBot)
    .every(p => room.votes?.[p.id] !== undefined);
}

function fsAllHumansReady(room) {
  return fsAlive(room)
    .filter(p => !p.isBot)
    .every(p => room.ready?.[p.id]);
}

function fsFillBotNight(room) {
  const alive = fsAlive(room);
  const actions = { ...(room.nightActions || {}) };
  for (const p of alive) {
    if (!p.isBot || actions[p.id] !== undefined || !FS_NIGHT_ROLES.has(p.role)) continue;
    if (p.role === 'mafia') {
      const targets = alive.filter(t => t.role !== 'mafia');
      if (targets.length) actions[p.id] = { action: 'kill', target: targets[Math.floor(Math.random() * targets.length)].id };
    } else if (p.role === 'doctor') {
      actions[p.id] = { action: 'heal', target: alive[Math.floor(Math.random() * alive.length)].id };
    } else if (p.role === 'sheriff') {
      const targets = alive.filter(t => t.id !== p.id);
      if (targets.length) actions[p.id] = { action: 'investigate', target: targets[Math.floor(Math.random() * targets.length)].id };
    }
  }
  return actions;
}

function fsFillBotVotes(room) {
  const alive = fsAlive(room);
  const votes = { ...(room.votes || {}) };
  for (const p of alive) {
    if (!p.isBot || votes[p.id] !== undefined) continue;
    const targets = alive.filter(t => t.id !== p.id);
    if (!targets.length) { votes[p.id] = null; continue; }
    if (p.role === 'mafia') {
      const town = targets.filter(t => t.role !== 'mafia');
      const pool = town.length ? town : targets;
      votes[p.id] = pool[Math.floor(Math.random() * pool.length)].id;
    } else {
      votes[p.id] = targets[Math.floor(Math.random() * targets.length)].id;
    }
  }
  return votes;
}

function fsResolveNight(room) {
  const players = room.players.map(p => ({ ...p }));
  const actions  = room.nightActions || {};
  const invs     = { ...(room.investigations || {}) };
  let log = room.log || [];

  const healed = new Set();
  const healerMap = {};
  for (const [pid, a] of Object.entries(actions)) {
    if (a?.action === 'heal' && a.target) { healed.add(a.target); healerMap[a.target] = pid; }
  }

  const tally = {};
  for (const a of Object.values(actions)) { if (a?.action === 'kill' && a.target) tally[a.target] = (tally[a.target] || 0) + 1; }
  let killId = null, top = 0;
  for (const [id, c] of Object.entries(tally)) { if (c > top) { top = c; killId = id; } }

  let lastKilled = null;
  if (killId) {
    const v = players.find(p => p.id === killId);
    if (healed.has(killId)) {
      log = fsAddLog(log, { day: room.day, kind: 'save', text: `🩺 Лікар встиг! ${v?.name || 'Хтось'} врятований.` });
    } else if (v?.alive) {
      v.alive = false;
      lastKilled = v.name;
      log = fsAddLog(log, { day: room.day, kind: 'death', text: `${v.avatar} ${v.name} знайдено вранці. Він був ${ROLE_LABEL[v.role]?.toLowerCase() || v.role}.` });
      // If sheriff was killed by mafia, transfer role to a random living civilian
      if (v.role === 'sheriff') {
        const cands = players.filter(p => p.alive && p.role === 'civilian');
        if (cands.length) {
          cands[Math.floor(Math.random() * cands.length)].role = 'sheriff';
          log = fsAddLog(log, { day: room.day, kind: 'info', text: '🔍 Роль шерифа таємно передана іншому мешканцю міста.' });
        }
      }
    }
  } else {
    log = fsAddLog(log, { day: room.day, kind: 'info', text: 'Ніч пройшла спокійно. Ніхто не постраждав.' });
  }

  for (const [pid, a] of Object.entries(actions)) {
    if (a?.action === 'investigate' && a.target) {
      const t = players.find(p => p.id === a.target);
      if (t) invs[pid] = { targetName: t.name, isMafia: t.role === 'mafia' };
    }
  }

  for (const [pid, a] of Object.entries(actions)) {
    if (a?.action === 'shoot' && a.target) {
      const sheriff = players.find(p => p.id === pid);
      const target  = players.find(p => p.id === a.target);
      if (!sheriff?.alive || !target) continue;
      if (target.role === 'mafia') {
        if (!healed.has(target.id) && target.alive) {
          target.alive = false;
          log = fsAddLog(log, { day: room.day, kind: 'death', text: `🔫 Шериф ${sheriff.name} влучив! ${target.name} — мафія.` });
        }
      } else if (sheriff.alive) {
        sheriff.alive = false;
        log = fsAddLog(log, { day: room.day, kind: 'death', text: `💔 Шериф ${sheriff.name} помилився! ${target.name} невинний.` });
        const cands = players.filter(p => p.alive && p.role === 'civilian');
        if (cands.length) cands[Math.floor(Math.random() * cands.length)].role = 'sheriff';
      }
    }
  }

  // Track kill / save attribution for player stats
  const killLog = [...(room.killLog || [])];
  if (killId && healed.has(killId) && healerMap[killId]) {
    killLog.push({ kind: 'doctorSave', healer: healerMap[killId], saved: killId, day: room.day });
  }
  if (killId && !healed.has(killId)) {
    for (const [pid, a] of Object.entries(actions)) {
      if (a?.action === 'kill' && a.target === killId) {
        if (players.find(p => p.id === pid && p.role === 'mafia')) {
          killLog.push({ kind: 'mafiaKill', killer: pid, victim: killId, day: room.day });
        }
      }
    }
  }
  for (const [pid, a] of Object.entries(actions)) {
    if (a?.action === 'shoot' && a.target) {
      const t = players.find(p => p.id === a.target);
      if (t && t.role === 'mafia') {
        killLog.push({ kind: 'sheriffKill', killer: pid, victim: a.target, day: room.day });
      }
    }
  }

  const w = fsCheckWinner(players);
  const next = { ...room, players, log, investigations: invs, nightActions: {}, lastKilled, killLog, winner: w || null, phaseStartedAt: Date.now() };
  if (w) {
    next.phase = 'result';
    next.log = fsAddLog(next.log, { day: next.day, kind: 'win', text: w === 'town' ? '🌅 Місто перемогло!' : '🩸 Мафія захопила місто...' });
  } else {
    next.phase = 'day';
    next.log = fsAddLog(next.log, { day: next.day, kind: 'info', text: `☀️ День ${next.day}. Місто прокидається...` });
  }
  return next;
}

function fsResolveVotes(room) {
  const tally = {};
  for (const v of Object.values(room.votes || {})) { if (v) tally[v] = (tally[v] || 0) + 1; }
  let bestId = null, best = 0, tie = false;
  for (const [id, c] of Object.entries(tally)) {
    if (c > best) { best = c; bestId = id; tie = false; }
    else if (c === best && best > 0) tie = true;
  }

  const players = room.players.map(p => ({ ...p }));
  let log = room.log || [];

  // Track successful votes for player stats (voted for mafia who got eliminated)
  const killLog = [...(room.killLog || [])];
  if (!bestId || tie) {
    log = fsAddLog(log, { day: room.day, kind: 'vote', text: 'Місто не дійшло згоди. Нікого не вигнано.' });
  } else {
    const l = players.find(p => p.id === bestId);
    if (l) {
      l.alive = false;
      log = fsAddLog(log, { day: room.day, kind: 'vote', text: `🪦 ${l.avatar} ${l.name} вигнаний. Він був ${ROLE_LABEL[l.role]?.toLowerCase() || l.role}.` });
      if (l.role === 'mafia') {
        for (const [voterId, targetId] of Object.entries(room.votes || {})) {
          if (String(targetId) === String(bestId)) {
            killLog.push({ kind: 'successfulVote', voter: voterId, victim: bestId, day: room.day });
          }
        }
      }
    }
  }

  const w = fsCheckWinner(players);
  const newDay = w ? room.day : room.day + 1;
  const next = { ...room, players, log, killLog, votes: {}, nightActions: {}, winner: w || null, day: newDay, phaseStartedAt: Date.now() };
  if (w) {
    next.phase = 'result';
    next.log = fsAddLog(next.log, { day: next.day, kind: 'win', text: w === 'town' ? '🌅 Місто перемогло!' : '🩸 Мафія захопила місто...' });
  } else {
    next.phase = 'night';
    next.log = fsAddLog(next.log, { day: next.day, kind: 'info', text: `🌙 Ніч ${next.day}. Місто засинає...` });
  }
  return next;
}

/** Returns the next room state if phase should advance, or null. */
function fsTryAdvance(room) {
  if (room.phase === 'roles') {
    if (!fsAllHumansReady(room) && !fsTimerExpired(room, 45)) return null;
    const ready = { ...(room.ready || {}) };
    for (const p of room.players) { if (p.isBot) ready[p.id] = true; }
    return { ...room, ready, phase: 'night', day: 1, phaseStartedAt: Date.now(), log: fsAddLog(room.log, { day: 1, kind: 'info', text: '🌙 Ніч 1. Місто засинає...' }) };
  }
  if (room.phase === 'night') {
    if (!fsAllHumansActedNight(room) && !fsTimerExpired(room, room.nightDuration || 60)) return null;
    return fsResolveNight({ ...room, nightActions: fsFillBotNight(room) });
  }
  if (room.phase === 'day') {
    if (!fsAllHumansVoted(room) && !fsTimerExpired(room, room.dayDuration || 60)) return null;
    return fsResolveVotes({ ...room, votes: fsFillBotVotes(room) });
  }
  return null;
}

/** Personalise raw room data before handing to the UI (same logic as server-side buildResponse). */
function fsBuildResponse(room, playerId, revealRoles = false) {
  if (!room) return null;
  const myPlayer   = (room.players || []).find(p => p.id === playerId);
  const myRoleKey  = myPlayer?.role || null;
  const myRoleLbl  = myRoleKey ? (ROLE_LABEL[myRoleKey] || myRoleKey) : null;
  const isMyMafia  = myRoleKey === 'mafia';

  const voteCounts = {};
  for (const v of Object.values(room.votes || {})) { if (v) voteCounts[v] = (voteCounts[v] || 0) + 1; }

  const players = (room.players || []).map(p => {
    let role = 'Мирний';
    if (room.phase === 'result')                         role = ROLE_LABEL[p.role] || p.role;
    else if (p.id === playerId)                          role = ROLE_LABEL[p.role] || p.role;
    else if (isMyMafia && p.role === 'mafia')            role = 'Мафія';
    else if (revealRoles)                                role = ROLE_LABEL[p.role] || p.role;
    return { ...p, role };
  });

  return {
    ...room,
    players,
    myRole:         myRoleLbl,
    myAlive:        myPlayer ? myPlayer.alive : false,
    myPlayerId:     myPlayer?.id || null,
    hasVoted:       playerId ? room.votes?.[playerId] !== undefined : false,
    votes:          voteCounts,
    myInvestigation: playerId ? (room.investigations?.[playerId] || null) : null,
    mafiaChat:      isMyMafia ? (room.mafiaChat || []) : [],
  };
}

/** Run a Firestore transaction: read → apply fn → maybe advance → write. */
async function fsTx(code, fn) {
  const { doc, runTransaction } = await fs();
  const db  = await getDb();
  const ref = doc(db, 'rooms', code.toUpperCase());
  let result = null;
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Кімнату не знайдено');
    let room = snap.data();
    room = fn(room);             // apply action
    const adv = fsTryAdvance(room);
    const next = adv || room;
    tx.set(ref, next);
    result = next;
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported API — same interface regardless of mode
// ─────────────────────────────────────────────────────────────────────────────

export async function createRoom(name, opts = {}) {
  if (!USE_FIRESTORE) return apiCall('/rooms', 'POST', { name, ...opts });

  const { doc, setDoc } = await fs();
  const db   = await getDb();
  const code = fsNewCode();
  // Use the caller's TG ID as the host player ID when provided
  const pid  = opts.hostId ? String(opts.hostId) : fsNewId();
  const hostPlayer = {
    id: pid, name: name.trim(), avatar: '🎭', role: 'civilian', alive: true, isBot: false,
    ...(opts.photoUrl ? { photoUrl: opts.photoUrl } : {}),
  };
  const room = {
    code, hostId: pid, phase: 'lobby', day: 0,
    players: [hostPlayer],
    votes: {}, nightActions: {}, ready: {}, investigations: {},
    winner: null, lastKilled: null, log: [], chat: [], mafiaChat: [],
    botCount: 0, dayDuration: 60, nightDuration: 60,
    phaseStartedAt: 0, sheriffShotDay: null, createdAt: Date.now(),
  };
  await setDoc(doc(db, 'rooms', code), room);
  return { code, playerId: pid };
}

export async function joinRoom(code, name, opts = {}) {
  if (!USE_FIRESTORE) return apiCall(`/rooms/${code}/join`, 'POST', { name });

  const { doc, runTransaction } = await fs();
  const db  = await getDb();
  const ref = doc(db, 'rooms', code.toUpperCase());
  let playerId = null;
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Кімнату не знайдено');
    const room = snap.data();
    if (room.phase !== 'lobby') throw new Error('Гра вже почалась');

    // 1. If we have a TG ID, check whether this player is already in the room
    if (opts.id) {
      const byId = room.players.find(p => p.id === String(opts.id) && !p.isBot);
      if (byId) { playerId = byId.id; return; }
    }

    // 2. Check by exact name match (handles reconnect for non-TG users)
    const byName = room.players.find(p => p.name.toLowerCase() === name.trim().toLowerCase() && !p.isBot);
    if (byName) { playerId = byName.id; return; }

    // 3. New player
    if (room.players.filter(p => !p.isBot).length >= 15) throw new Error('Кімната заповнена');
    playerId = opts.id ? String(opts.id) : fsNewId();
    const newPlayer = {
      id: playerId, name: name.trim(), avatar: '🎭', role: 'civilian', alive: true, isBot: false,
      ...(opts.photoUrl ? { photoUrl: opts.photoUrl } : {}),
    };
    tx.set(ref, { ...room, players: [...room.players, newPlayer] });
  });
  return { playerId, code: code.toUpperCase() };
}

export async function loadRoom(code, playerId = '') {
  if (!USE_FIRESTORE) return apiCall(`/rooms/${code}?playerId=${playerId}`);

  const { doc, getDoc } = await fs();
  const db   = await getDb();
  const snap = await getDoc(doc(db, 'rooms', code.toUpperCase()));
  if (!snap.exists()) throw new Error('Кімнату не знайдено');
  return fsBuildResponse(snap.data(), playerId);
}

export function subscribeRoom(code, playerId, cb, opts = {}) {
  if (!USE_FIRESTORE) {
    // Polling fallback
    let active = true, tid;
    async function poll() {
      if (!active) return;
      try { cb(await loadRoom(code, playerId)); } catch { cb(null); }
      if (active) tid = setTimeout(poll, 1500);
    }
    poll();
    return () => { active = false; clearTimeout(tid); };
  }

  // Real-time Firestore listener
  let unsub = () => {};
  (async () => {
    const { doc, onSnapshot } = await fs();
    const db  = await getDb();
    const ref = doc(db, 'rooms', code.toUpperCase());
    unsub = onSnapshot(ref, snap => {
      if (!snap.exists()) { cb(null); return; }
      cb(fsBuildResponse(snap.data(), playerId, opts.revealRoles || false));
    }, () => cb(null));
  })();
  return () => unsub();
}

export async function updateSettings(code, playerId, settings) {
  if (!USE_FIRESTORE) return apiCall(`/rooms/${code}/settings`, 'POST', { playerId, ...settings });

  await fsTx(code, room => {
    if (room.hostId !== playerId) throw new Error('Тільки ведучий може змінити налаштування');
    const { dayDuration, nightDuration, botCount } = settings;
    return {
      ...room,
      ...(dayDuration  != null ? { dayDuration:  Number(dayDuration) }  : {}),
      ...(nightDuration != null ? { nightDuration: Number(nightDuration) } : {}),
      ...(botCount     != null ? { botCount: Math.min(12, Math.max(0, Number(botCount))) } : {}),
    };
  });
  return { ok: true };
}

export async function startGame(code, playerId) {
  if (!USE_FIRESTORE) return apiCall(`/rooms/${code}/start`, 'POST', { playerId });

  const { doc, runTransaction } = await fs();
  const db  = await getDb();
  const ref = doc(db, 'rooms', code.toUpperCase());
  let result = null;
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Кімнату не знайдено');
    const room = snap.data();
    if (room.hostId !== playerId) throw new Error('Тільки ведучий може розпочати');
    if (room.phase !== 'lobby')   throw new Error('Гра вже розпочата');

    const humans = room.players.filter(p => !p.isBot);
    const usedNames = new Set(humans.map(p => p.name));
    const availNames = BOT_NAMES.filter(n => !usedNames.has(n));
    const bots = Array.from({ length: room.botCount || 0 }, (_, i) => ({
      id: fsNewId(),
      name: availNames[i % availNames.length] || `Бот ${i + 1}`,
      avatar: AVATARS[i % AVATARS.length] || '🤖',
      role: 'civilian', alive: true, isBot: true,
    }));

    const all = [...humans, ...bots];
    if (all.length < 4) throw new Error('Потрібно мінімум 4 гравці');

    const deck    = buildDeck(all.length);
    const players = all.map((p, i) => ({ ...p, role: deck[i] }));
    const started = {
      ...room, players, phase: 'roles', day: 0,
      phaseStartedAt: Date.now(), votes: {}, nightActions: {}, ready: {}, investigations: {},
      log: fsAddLog(room.log, { day: 0, kind: 'info', text: `🎭 Гру розпочато! ${all.length} гравців.` }),
    };
    tx.set(ref, started);
    result = fsBuildResponse(started, playerId);
  });
  return result;
}

export async function cancelRoom(code, playerId) {
  if (!USE_FIRESTORE) return apiCall(`/rooms/${code}`, 'DELETE', { playerId });

  await fsTx(code, room => {
    if (room.hostId !== playerId) throw new Error('Тільки ведучий');
    return { ...room, phase: 'cancelled' };
  });
  return { ok: true };
}

export async function revealRole(code, playerId) {
  if (!USE_FIRESTORE) return apiCall(`/rooms/${code}/reveal`, 'POST', { playerId });

  const raw = await fsTx(code, room => {
    if (room.phase !== 'roles') throw new Error('Не час розкривати ролі');
    return { ...room, ready: { ...(room.ready || {}), [playerId]: true } };
  });
  return fsBuildResponse(raw, playerId);
}

export async function castVote(code, voterId, targetId) {
  if (!USE_FIRESTORE) return apiCall(`/rooms/${code}/vote`, 'POST', { voterId, targetId: targetId || null });

  const raw = await fsTx(code, room => {
    if (room.phase !== 'day') throw new Error('Зараз не день');
    const voter = room.players.find(p => p.id === voterId && p.alive);
    if (!voter) throw new Error('Гравець не знайдений');
    return { ...room, votes: { ...(room.votes || {}), [voterId]: targetId || null } };
  });
  return fsBuildResponse(raw, voterId);
}

export async function nightKill(code, killerId, targetId) {
  if (!USE_FIRESTORE) return apiCall(`/rooms/${code}/night-kill`, 'POST', { playerId: killerId, targetId });

  const raw = await fsTx(code, room => {
    if (room.phase !== 'night') throw new Error('Зараз не ніч');
    const p = room.players.find(pl => pl.id === killerId && pl.alive && pl.role === 'mafia');
    if (!p) throw new Error('Гравець не є мафією');
    return { ...room, nightActions: { ...(room.nightActions || {}), [killerId]: { action: 'kill', target: targetId } } };
  });
  return fsBuildResponse(raw, killerId);
}

export async function nightHeal(code, playerId, targetId) {
  if (!USE_FIRESTORE) return apiCall(`/rooms/${code}/night-heal`, 'POST', { playerId, targetId });

  const raw = await fsTx(code, room => {
    if (room.phase !== 'night') throw new Error('Зараз не ніч');
    const p = room.players.find(pl => pl.id === playerId && pl.alive && pl.role === 'doctor');
    if (!p) throw new Error('Гравець не є лікарем');
    return { ...room, nightActions: { ...(room.nightActions || {}), [playerId]: { action: 'heal', target: targetId } } };
  });
  return fsBuildResponse(raw, playerId);
}

export async function nightInvestigate(code, playerId, targetId) {
  if (!USE_FIRESTORE) return apiCall(`/rooms/${code}/night-investigate`, 'POST', { playerId, targetId });

  const raw = await fsTx(code, room => {
    if (room.phase !== 'night') throw new Error('Зараз не ніч');
    const p = room.players.find(pl => pl.id === playerId && pl.alive && pl.role === 'sheriff');
    if (!p) throw new Error('Гравець не є шерифом');
    const target = room.players.find(pl => pl.id === targetId && pl.alive);
    if (!target) throw new Error('Ціль не знайдена');
    const invs = { ...(room.investigations || {}), [playerId]: { targetName: target.name, isMafia: target.role === 'mafia' } };
    return {
      ...room,
      nightActions:   { ...(room.nightActions || {}), [playerId]: { action: 'investigate', target: targetId } },
      investigations: invs,
    };
  });
  return fsBuildResponse(raw, playerId);
}

export async function sheriffShoot(code, playerId, targetId) {
  if (!USE_FIRESTORE) return apiCall(`/rooms/${code}/sheriff-shoot`, 'POST', { playerId, targetId });

  const raw = await fsTx(code, room => {
    if (room.phase !== 'night') throw new Error('Стріляти можна лише вночі');
    const p = room.players.find(pl => pl.id === playerId && pl.alive && pl.role === 'sheriff');
    if (!p) throw new Error('Гравець не є шерифом');
    return {
      ...room,
      sheriffShotDay: room.day,
      nightActions: { ...(room.nightActions || {}), [playerId]: { action: 'shoot', target: targetId } },
    };
  });
  return fsBuildResponse(raw, playerId);
}

export async function nightSkip(code, playerId) {
  if (!USE_FIRESTORE) return apiCall(`/rooms/${code}/night-skip`, 'POST', { playerId });

  const raw = await fsTx(code, room => {
    if (room.phase !== 'night') throw new Error('Зараз не ніч');
    return { ...room, nightActions: { ...(room.nightActions || {}), [playerId]: { action: 'skip', target: null } } };
  });
  return fsBuildResponse(raw, playerId);
}

export async function appendChat(code, msg) {
  if (!USE_FIRESTORE) return apiCall(`/rooms/${code}/chat`, 'POST', { playerId: msg.authorId, text: msg.text });

  const { doc, updateDoc, arrayUnion } = await fs();
  const db = await getDb();
  await updateDoc(doc(db, 'rooms', code.toUpperCase()), {
    chat: arrayUnion({ playerName: msg.authorName || msg.authorId, text: msg.text.slice(0, 500), ts: Date.now() }),
  });
  return { ok: true };
}

export async function appendMafiaChat(code, playerId, text) {
  if (!USE_FIRESTORE) return apiCall(`/rooms/${code}/mafia-chat`, 'POST', { playerId, text });

  const { doc, runTransaction } = await fs();
  const db  = await getDb();
  const ref = doc(db, 'rooms', code.toUpperCase());
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data();
    const p = room.players.find(pl => pl.id === playerId && pl.role === 'mafia');
    if (!p) return;
    const mafiaChat = [...(room.mafiaChat || []), { playerName: p.name, text: text.slice(0, 500), ts: Date.now() }];
    tx.set(ref, { ...room, mafiaChat: mafiaChat.slice(-100) });
  });
  return { ok: true };
}

export async function kickPlayer(code, hostId, playerId) {
  if (!USE_FIRESTORE) return apiCall(`/rooms/${code}/kick`, 'POST', { playerId: hostId, kickedId: playerId });

  await fsTx(code, room => {
    if (room.hostId !== hostId) throw new Error('Тільки ведучий');
    return { ...room, players: room.players.filter(p => p.id !== playerId) };
  });
  return { ok: true };
}

/**
 * Moderator: change a specific player's role mid-game.
 * Does NOT trigger phase advancement. Firestore mode only.
 */
export async function modSetPlayerRole(code, targetId, newRole) {
  if (!USE_FIRESTORE) throw new Error('Зміна ролі доступна лише у Firestore-режимі');
  const VALID = ['mafia', 'sheriff', 'doctor', 'civilian'];
  if (!VALID.includes(newRole)) throw new Error('Невірна роль');

  const { doc, runTransaction } = await fs();
  const db  = await getDb();
  const ref = doc(db, 'rooms', code.toUpperCase());
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Кімнату не знайдено');
    const room = snap.data();
    const players = room.players.map(p => p.id === targetId ? { ...p, role: newRole } : p);
    tx.set(ref, { ...room, players });
  });
  return { ok: true };
}

/**
 * hostTick — called by the host's client on a timer to advance
 * phase when the countdown expires.  No-op in REST mode (the
 * server handles timers on every GET poll).
 */
export async function hostTick(code, myId) {
  if (!USE_FIRESTORE) return; // REST server handles this

  const { doc, runTransaction } = await fs();
  const db  = await getDb();
  const ref = doc(db, 'rooms', code.toUpperCase());
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data();
    if (room.hostId !== myId) return; // only host drives transitions
    const adv = fsTryAdvance(room);
    if (adv) tx.set(ref, adv);
  });
}

// ── Legacy stubs ───────────────────────────────────────────────────────────────
export async function createRoomFirebase()  { throw new Error('use createRoom()'); }
export async function saveRoom()            { /* no-op */ }
export async function patchRoom()           { /* no-op */ }
export async function deleteRoom()          { /* no-op */ }
