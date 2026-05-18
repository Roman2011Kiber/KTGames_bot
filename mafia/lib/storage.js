/**
 * storage.js — REST API wrapper (replaces Firebase)
 * All online room functions talk to our Express API server.
 * Solo game still uses localStorage only.
 */

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

// ── Nickname / Solo cache ──────────────────────────────────────────────────────
export const saveNickname  = n  => { try { localStorage.setItem('mafia:nick', n); } catch {} };
export const loadNickname  = () => { try { return localStorage.getItem('mafia:nick') || ''; } catch { return ''; } };
export const saveLastGame  = g  => { try { localStorage.setItem('mafia:solo', JSON.stringify(g)); } catch {} };
export const loadLastGame  = () => { try { const s = localStorage.getItem('mafia:solo'); return s ? JSON.parse(s) : null; } catch { return null; } };
export const clearLastGame = () => { try { localStorage.removeItem('mafia:solo'); } catch {} };

// ── Room identity ─────────────────────────────────────────────────────────────
export const saveMe = (code, info) => { try { localStorage.setItem(`mafia:me:${code}`, JSON.stringify(info)); } catch {} };
export const loadMe = code => { try { const r = localStorage.getItem(`mafia:me:${code}`); return r ? JSON.parse(r) : null; } catch { return null; } };

// ── Room API ──────────────────────────────────────────────────────────────────

export async function createRoom(name, opts = {}) {
  return apiCall('/rooms', 'POST', { name, ...opts });
  // returns { code, playerId }
}

export async function joinRoom(code, name) {
  return apiCall(`/rooms/${code}/join`, 'POST', { name });
  // returns { playerId, code }
}

export async function loadRoom(code, playerId = '') {
  return apiCall(`/rooms/${code}?playerId=${playerId}`);
}

// Polling-based subscribe (replaces Firebase onSnapshot)
export function subscribeRoom(code, playerId, cb) {
  let active = true;
  let tid;
  async function poll() {
    if (!active) return;
    try { cb(await loadRoom(code, playerId)); } catch { cb(null); }
    if (active) tid = setTimeout(poll, 1500);
  }
  poll();
  return () => { active = false; clearTimeout(tid); };
}

export async function updateSettings(code, playerId, settings) {
  return apiCall(`/rooms/${code}/settings`, 'POST', { playerId, ...settings });
}

export async function startGame(code, playerId) {
  return apiCall(`/rooms/${code}/start`, 'POST', { playerId });
}

export async function cancelRoom(code, playerId) {
  return apiCall(`/rooms/${code}`, 'DELETE', { playerId });
}

export async function revealRole(code, playerId) {
  return apiCall(`/rooms/${code}/reveal`, 'POST', { playerId });
}

export async function castVote(code, voterId, targetId) {
  return apiCall(`/rooms/${code}/vote`, 'POST', { voterId, targetId: targetId || 0 });
}

// Mafia night kill
export async function nightKill(code, killerId, targetId) {
  return apiCall(`/rooms/${code}/night-kill`, 'POST', { playerId: killerId, targetId });
}

// Doctor heal (fixes missing doctor action)
export async function nightHeal(code, playerId, targetId) {
  return apiCall(`/rooms/${code}/night-heal`, 'POST', { playerId, targetId });
}

// Sheriff investigate — safe, reveals mafia/town alignment
export async function nightInvestigate(code, playerId, targetId) {
  return apiCall(`/rooms/${code}/night-investigate`, 'POST', { playerId, targetId });
}

// Sheriff shoot — risky kill, wrong guess kills sheriff
export async function sheriffShoot(code, playerId, targetId) {
  return apiCall(`/rooms/${code}/sheriff-shoot`, 'POST', { playerId, targetId });
}

// Skip night action — marks human as "acted" so phase can advance
export async function nightSkip(code, playerId) {
  return apiCall(`/rooms/${code}/night-skip`, 'POST', { playerId });
}

// appendChat: called by chat.js component with { authorId, authorName, text }
export async function appendChat(code, msg) {
  return apiCall(`/rooms/${code}/chat`, 'POST', { playerId: msg.authorId, text: msg.text });
}

export async function appendMafiaChat(code, playerId, text) {
  return apiCall(`/rooms/${code}/mafia-chat`, 'POST', { playerId, text });
}

export async function kickPlayer(code, hostId, playerId) {
  return apiCall(`/rooms/${code}/kick`, 'POST', { playerId: hostId, kickedId: playerId });
}

// ── Legacy stubs (used by solo game logic, no-ops for online) ─────────────────
export async function createRoomFirebase()  { throw new Error('use createRoom()'); }
export async function saveRoom()            { /* no-op: server manages state */ }
export async function patchRoom()           { /* no-op: server manages state */ }
export async function deleteRoom()          { /* no-op */ }
