/**
 * settings.js — Persistent user preferences (localStorage).
 *
 * Moderator-only keys:
 *   showAllRoles  — reveal every player's role on the board during game
 *
 * Everyone:
 *   (more can be added here without being cheating)
 */

const KEY = 'mafia_app_settings';

const DEFAULTS = {
  showAllRoles: false,   // mod only: show all roles on the board
};

export function getSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSetting(key, value) {
  const s = getSettings();
  s[key] = value;
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}
