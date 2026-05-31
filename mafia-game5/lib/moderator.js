/**
 * moderator.js — Moderator access control.
 *
 * Two ways to grant moderator rights:
 *  1. Add Telegram user IDs (as strings) to MODERATOR_IDS below.
 *  2. Self-register via the Settings page (stored in localStorage).
 *
 * Moderators get:
 *   • See any player's TG ID in their profile
 *   • Change player roles mid-game (Firestore mode)
 *   • Edit leaderboard stats
 *   • "Show all roles" setting (reveals roles on the board)
 */
export const MODERATOR_IDS = [
  // '123456789',   ← paste Telegram user IDs here (strings)
];

const LOCAL_KEY = 'mafia:local_mods';

function getLocalMods() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); }
  catch { return []; }
}

export function isLocalMod(tgId) {
  if (!tgId) return false;
  return getLocalMods().includes(String(tgId));
}

export function addLocalMod(tgId) {
  if (!tgId) return;
  const ids = getLocalMods();
  if (!ids.includes(String(tgId))) ids.push(String(tgId));
  localStorage.setItem(LOCAL_KEY, JSON.stringify(ids));
}

export function removeLocalMod(tgId) {
  if (!tgId) return;
  const ids = getLocalMods().filter(id => id !== String(tgId));
  localStorage.setItem(LOCAL_KEY, JSON.stringify(ids));
}

/**
 * Returns true if the given TG user ID belongs to a moderator.
 * - No tgId (browser / non-Telegram context) → always moderator (for testing).
 * - Otherwise checks the hardcoded list and the localStorage self-registered list.
 * @param {string|number|null|undefined} tgId
 */
export function isModerator(tgId) {
  // Outside Telegram (no user ID) → grant full mod access for browser testing
  if (!tgId) return true;
  const id = String(tgId);
  return MODERATOR_IDS.includes(id) || getLocalMods().includes(id);
}
