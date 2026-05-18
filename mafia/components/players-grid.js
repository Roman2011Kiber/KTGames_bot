import { h } from '../lib/dom.js';

export function PlayersGrid(g, { meId, hostId, isHost = false, onKick } = {}) {
  return h('div.players-grid', {}, g.players.map(p => {
    const cls = ['player-tile'];
    if (!p.alive) cls.push('dead');
    else if (p.id === (meId || g.humanId)) cls.push('me');
    if (hostId && p.id === hostId) cls.push('host');
    const canKick = isHost && onKick && p.id !== meId && p.id !== hostId;
    return h('div.' + cls.join('.'), {}, [
      canKick && h('button.kick-btn', { title: 'Вигнати', onclick: e => { e.stopPropagation(); onKick(p.id); } }, '×'),
      h('div.avatar', {}, p.avatar || '🎭'),
      h('div.name', {}, p.name + (p.isBot ? ' 🤖' : '')),
      !p.alive && h('div.dead-label', {}, 'Мертвий'),
      p.alive && p.id === (meId || g.humanId) && h('div.badge-me', {}, 'Ви'),
    ]);
  }));
}
