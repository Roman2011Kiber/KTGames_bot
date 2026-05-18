import { h, mount } from '../lib/dom.js';
import { Shell } from '../components/shell.js';

export function NotFoundPage(container) {
  mount(container, Shell({ title: '404', children: [
    h('div.card.text-center', {}, [
      h('div.font-display.text-3xl.gold-text', {}, 'Загублено в провулку'),
      h('p.muted.font-serif.italic.mt-3', {}, 'Цієї сторінки немає на мапі міста.'),
      h('a.btn.btn-ghost-gold.mt-4', { href: '#/', style: 'display:inline-block;width:auto;padding:10px 24px' }, 'На головну'),
    ]),
  ] }));
}
