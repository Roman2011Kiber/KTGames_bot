import { h } from '../lib/dom.js';
import { Card } from './shell.js';

export function GameLog(g) {
  let listEl;
  const card = Card([
    h('div.text-xs.uppercase.tracking-mega.muted.mb-3', {}, 'Хроніка'),
    h('div.log-list', { ref: el => (listEl = el) },
      (g.log || []).map(l =>
        h('div.log-row.' + (l.kind || 'info'), {}, [
          h('span.log-day', {}, 'D' + (l.day ?? 0)),
          l.text,
        ])
      )
    ),
  ], 'mt-6');
  setTimeout(() => { if (listEl) listEl.scrollTop = listEl.scrollHeight; }, 0);
  return card;
}
