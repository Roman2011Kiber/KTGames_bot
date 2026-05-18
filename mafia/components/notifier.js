import { h, clear } from '../lib/dom.js';
import { subscribeNotify } from '../lib/notify.js';

export function mountNotifier() {
  const root = document.getElementById('notifier-root');
  if (!root) return;
  subscribeNotify(items => {
    clear(root);
    if (!items.length) return;
    root.appendChild(h('div.notifier', {}, items.map(i => h('div.toast.' + i.kind, {}, i.text))));
  });
}
