import { BOT_NAMES, AVATARS, pickRandom } from './names.js';
import { ROLES, ROLE_LABEL, ROLE_ICON, ROLE_DESC, buildDeck, roleTeam, mafiaCount } from './roles.js';
export { ROLES, ROLE_LABEL, ROLE_ICON, ROLE_DESC, roleTeam, mafiaCount };

export const DEFAULT_SETTINGS = {
  botCount: 0,
  nightTimer: 60,
  discussTimer: 90,
  voteTimer: 60,
  sheriffCanKill: true,
};

export const PHASE_LABEL = {
  'lobby': 'Лобі', 'role-reveal': 'Розкриття ролі',
  'night-mafia': 'Ніч', 'night-resolve': 'Світанок',
  'day-discussion': 'Обговорення', 'day-vote': 'Голосування', 'ended': 'Фінал',
};

export const newId = () => Math.random().toString(36).slice(2, 9);
export const newCode = () => Math.random().toString(36).slice(2, 7).toUpperCase();

export const alive = g => g.players.filter(p => p.alive);
export const aliveTeam = (g, team) => alive(g).filter(p => roleTeam(p.role) === team);
export const byId = (g, id) => g.players.find(p => p.id === id);

export function winner(g) {
  const m = aliveTeam(g, 'mafia').length;
  const t = aliveTeam(g, 'town').length;
  if (m === 0) return 'town';
  if (m >= t) return 'mafia';
  return null;
}

export function addLog(log, entry) {
  const next = [...log, entry];
  return next.length > 80 ? next.slice(-80) : next;
}

// ── Bot AI ──────────────────────────────────────────────────────────────────

export function botPickTarget(g, actor, action) {
  let pool = alive(g).filter(p => ROLES[actor.role]?.canTargetSelf ? true : p.id !== actor.id);
  if (action === 'kill') {
    const enemies = pool.filter(p => roleTeam(p.role) !== roleTeam(actor.role));
    if (enemies.length) pool = enemies;
  }
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

export function botVote(g, voter) {
  const pool = alive(g).filter(p => p.id !== voter.id);
  if (!pool.length) return null;
  if (roleTeam(voter.role) === 'mafia') {
    const town = pool.filter(p => roleTeam(p.role) !== 'mafia');
    return (town.length ? town : pool)[Math.floor(Math.random() * (town.length || pool.length))].id;
  }
  return pool[Math.floor(Math.random() * pool.length)].id;
}

export function fillBotNightActions(g, existing = {}) {
  const actions = { ...existing };
  for (const p of alive(g)) {
    if (!p.isBot || actions[p.id]) continue;
    const def = ROLES[p.role];
    if (!def?.nightAction) continue;
    const isSheriff = p.role === 'sheriff';
    const action = isSheriff && g.settings?.sheriffCanKill && Math.random() < 0.3
      ? 'sheriffKill' : def.nightAction;
    const target = botPickTarget(g, p, action === 'sheriffKill' ? 'kill' : action);
    if (target) actions[p.id] = { action, target };
  }
  return actions;
}

// ── Night resolution ─────────────────────────────────────────────────────────

export function resolveNight(g, actions) {
  const players = g.players.map(p => ({ ...p }));
  let log = [...g.log];
  const investigations = [];

  // 1. Collect heals
  const healed = new Set();
  for (const a of Object.values(actions)) {
    if (a?.action === 'heal' && a.target) healed.add(a.target);
  }

  // 2. Mafia kill — majority vote
  const tally = {};
  for (const a of Object.values(actions)) {
    if (a?.action === 'kill' && a.target) tally[a.target] = (tally[a.target] || 0) + 1;
  }
  let killId = null, topVotes = 0;
  for (const [id, c] of Object.entries(tally)) { if (c > topVotes) { topVotes = c; killId = id; } }

  if (killId) {
    if (healed.has(killId)) {
      const v = players.find(p => p.id === killId);
      log = addLog(log, { day: g.day, kind: 'save', text: `Лікар встиг! ${v?.name || 'Хтось'} врятований.` });
    } else {
      const v = players.find(p => p.id === killId);
      if (v?.alive) { v.alive = false; log = addLog(log, { day: g.day, kind: 'death', text: `${v.avatar} ${v.name} знайдено вранці. Він був ${ROLE_LABEL[v.role]?.toLowerCase()}.` }); }
    }
  } else {
    log = addLog(log, { day: g.day, kind: 'info', text: 'Ніч пройшла спокійно. Ніхто не постраждав.' });
  }

  // 3. Sheriff investigate
  for (const [pid, a] of Object.entries(actions)) {
    if (a?.action === 'investigate' && a.target) {
      const t = players.find(p => p.id === a.target);
      if (t) investigations.push({ sheriffId: pid, targetId: t.id, targetName: t.name, isMafia: roleTeam(t.role) === 'mafia' });
    }
  }

  // 4. Sheriff kill
  for (const [pid, a] of Object.entries(actions)) {
    if (a?.action === 'sheriffKill' && a.target) {
      const sheriff = players.find(p => p.id === pid);
      const target = players.find(p => p.id === a.target);
      if (!sheriff?.alive || !target) continue;

      if (roleTeam(target.role) === 'mafia') {
        if (healed.has(target.id)) {
          log = addLog(log, { day: g.day, kind: 'save', text: `Шериф вистрілив, але лікар врятував ${target.name}.` });
        } else {
          target.alive = false;
          log = addLog(log, { day: g.day, kind: 'death', text: `🔫 Шериф ${sheriff.name} влучив! ${target.avatar} ${target.name} — мафія — загинув.` });
        }
      } else {
        sheriff.alive = false;
        log = addLog(log, { day: g.day, kind: 'death', text: `💔 Шериф ${sheriff.name} помилився! ${target.name} невинний. Шериф загинув.` });
        const newSheriffCandidates = players.filter(p => p.alive && p.role === 'civilian');
        if (newSheriffCandidates.length) {
          const ns = newSheriffCandidates[Math.floor(Math.random() * newSheriffCandidates.length)];
          ns.role = 'sheriff';
          log = addLog(log, { day: g.day, kind: 'info', text: `${ns.avatar} ${ns.name} стає новим Шерифом.` });
        }
      }
    }
  }

  const next = { ...g, players, log, phase: 'day-discussion', night: { investigations } };
  const w = winner(next);
  if (w) { next.winner = w; next.phase = 'ended'; next.log = addLog(next.log, { day: next.day, kind: 'win', text: w === 'town' ? '🌅 Місто переможило! Всю мафію виявлено.' : '🩸 Мафія захопила місто...' }); }
  return next;
}

// ── Day voting ───────────────────────────────────────────────────────────────

export function resolveVotes(g, votes) {
  const tally = {};
  for (const v of Object.values(votes || {})) { if (v) tally[v] = (tally[v] || 0) + 1; }
  let bestId = null, best = 0, tie = false;
  for (const [id, c] of Object.entries(tally)) {
    if (c > best) { best = c; bestId = id; tie = false; }
    else if (c === best) tie = true;
  }
  const players = g.players.map(p => ({ ...p }));
  let log = [...g.log];
  if (!bestId || tie || best === 0) {
    log = addLog(log, { day: g.day, kind: 'vote', text: 'Місто не дійшло згоди. Сьогодні нікого не вигнано.' });
  } else {
    const l = players.find(p => p.id === bestId);
    if (l) { l.alive = false; log = addLog(log, { day: g.day, kind: 'vote', text: `🪦 ${l.avatar} ${l.name} вигнаний. Він був ${ROLE_LABEL[l.role]?.toLowerCase()}.` }); }
  }
  const next = { ...g, players, log, votes: {}, phase: 'night-mafia', day: g.day + 1, night: {}, actions: {} };
  const w = winner(next);
  if (w) { next.winner = w; next.phase = 'ended'; next.log = addLog(next.log, { day: next.day, kind: 'win', text: w === 'town' ? '🌅 Місто перемогло!' : '🩸 Мафія захопила місто...' }); }
  else next.log = addLog(next.log, { day: next.day, kind: 'info', text: `🌙 Ніч ${next.day}. Місто засинає...` });
  next.phaseStartedAt = Date.now();
  return next;
}

// ── Solo game factory ────────────────────────────────────────────────────────

export function createSolo({ humanName, humanAvatar, total, forcedRole }) {
  total = Math.max(4, Math.min(20, total));
  const botNames = pickRandom(BOT_NAMES, total - 1);
  const botAvatars = pickRandom(AVATARS.filter(a => a !== humanAvatar), total - 1);
  const deck = buildDeck(total);
  if (forcedRole) { const i = deck.indexOf(forcedRole); if (i > 0) [deck[0], deck[i]] = [deck[i], deck[0]]; }
  const humanId = newId();
  const players = [
    { id: humanId, name: humanName || 'Ви', isHuman: true, role: deck[0], alive: true, avatar: humanAvatar || '🎭' },
    ...botNames.map((name, i) => ({ id: newId(), name, isHuman: false, isBot: true, role: deck[i + 1], alive: true, avatar: botAvatars[i] || '🎭' })),
  ];
  return {
    id: newId(), createdAt: Date.now(), mode: 'solo', phase: 'role-reveal', day: 0,
    players, humanId, night: {}, votes: {}, actions: {}, winner: null,
    log: [{ day: 0, kind: 'info', text: `Місто з ${total} мешканців. Серед них — ${mafiaCount(total)} мафіозі.` }],
  };
}

// ── Online game start ────────────────────────────────────────────────────────

export function startOnline(lobby) {
  const humans = (lobby.players || []).filter(p => !p.isBot);
  const s = lobby.settings || DEFAULT_SETTINGS;
  const usedNames = new Set(humans.map(p => p.name));
  const usedAvatars = new Set(humans.map(p => p.avatar));
  const botNames   = pickRandom(BOT_NAMES.filter(n => !usedNames.has(n)),   s.botCount);
  const botAvatars = pickRandom(AVATARS.filter(a => !usedAvatars.has(a)), s.botCount);
  const bots = botNames.map((name, i) => ({ id: newId(), name, isHuman: false, isBot: true, role: 'civilian', alive: true, avatar: botAvatars[i] || '🤖' }));
  const all = [...humans, ...bots];
  const deck = buildDeck(all.length);
  const players = all.map((p, i) => ({ ...p, role: deck[i], alive: true }));
  return {
    ...lobby, phase: 'role-reveal', day: 0, players, night: {}, votes: {}, actions: {}, ready: {}, winner: null, started: true,
    log: [{ day: 0, kind: 'info', text: `Гру розпочато! ${all.length} гравців (${bots.length} ботів). Ніч наближається...` }],
    phaseStartedAt: Date.now(),
  };
}

export const humanNightActors = g => alive(g).filter(p => !p.isBot && ROLES[p.role]?.nightAction).map(p => p.id);
export const humanVoters      = g => alive(g).filter(p => !p.isBot).map(p => p.id);
