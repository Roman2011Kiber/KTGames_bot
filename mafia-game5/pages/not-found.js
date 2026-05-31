import { h, mount } from '../lib/dom.js';
import { Shell } from '../components/shell.js';
import { t } from '../lib/i18n.js';

export function NotFoundPage(container) {
  mount(container, Shell({ title: '404', children: [
    h('div.card.text-center', {}, [
      h('div.font-display.text-3xl.gold-text', {}, t('notfound.title')),
      h('p.muted.font-serif.italic.mt-3', {}, t('notfound.desc')),
      h('a.btn.btn-ghost-gold.mt-4', { href: '#/', style: 'display:inline-block;width:auto;padding:10px 24px' }, t('notfound.home')),
    ]),
  ] }));
}
