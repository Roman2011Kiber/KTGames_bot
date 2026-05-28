/**
 * moderator.js — Moderator access control.
 *
 * Add Telegram user IDs (as strings) to MODERATOR_IDS.
 * Moderators get:
 *   • See any player's TG ID in their profile
 *   • Change player roles mid-game (day phase)
 *   • Edit leaderboard stats
 *   • "Show all roles" setting (reveals roles on the board)
 */
export const MODERATOR_IDS = [
  1722506770
  // '123456789',   ← paste your Telegram ID here (without quotes around the comment)
];

/**
 * Returns true if the given TG user ID belongs to a moderator.
 * @param {string|number|null|undefined} tgId
 */
export function isModerator(tgId) {
  if (!tgId) return false;
  return MODERATOR_IDS.includes(String(tgId));
}
