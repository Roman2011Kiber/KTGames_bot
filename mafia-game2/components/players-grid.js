import { h } from '../lib/dom.js';
import { ROLE_ICON } from '../lib/phrases.js';

// English keys used in room after normalizeRoom
const ROLE_KEY_EN = { 'Мафія': 'mafia', 'Шериф': 'sheriff', 'Лікар': 'doctor', 'Мирний': 'civilian', 'Мирний житель': 'civilian' };

export function PlayersGrid(g, { meId, hostId, isHost = false, onKick, onPlayerClick, showRoles = false } = {}) {
  return h('div.players-grid', {}, g.players.map(p => {
    const cls = ['player-tile'];
    if (!p.alive) cls.push('dead');
    else if (p.id === (meId || g.humanId)) cls.push('me');
    if (hostId && p.id === hostId) cls.push('host');
    const canKick = isHost && onKick && p.id !== meId && p.id !== hostId;

    // Show role icon if showRoles is on
    const roleKey = p.role; // already English key after normalizeRoom
    const roleIcon = showRoles && roleKey && ROLE_ICON[roleKey] ? ROLE_ICON[roleKey] : null;

    return h('div.' + cls.join('.'), {
      style: onPlayerClick ? 'cursor:pointer' : '',
      onclick: onPlayerClick ? () => onPlayerClick(p) : undefined,
    }, [
      canKick && h('button.kick-btn', {
        title: 'Вигнати',
        onclick: e => { e.stopPropagation(); onKick(p.id); },
      }, '×'),
      h('div.avatar', {}, p.avatar || '🎭'),
      h('div.name', {}, p.name + (p.isBot ? ' 🤖' : '')),
      roleIcon && h('div', { style: 'font-size:.7rem;margin-top:2px;opacity:.85' }, roleIcon),
      !p.alive && h('div.dead-label', {}, 'Мертвий'),
      p.alive && p.id === (meId || g.humanId) && h('div.badge-me', {}, 'Ви'),
    ]);
  }));
}
