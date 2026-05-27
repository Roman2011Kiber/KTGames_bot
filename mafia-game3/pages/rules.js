import { h, mount } from '../lib/dom.js';
import { Shell, Card } from '../components/shell.js';
import { ROLE_LABEL, ROLE_ICON, ROLE_DESC } from '../lib/roles.js';
import { t } from '../lib/i18n.js';

const ROLES_LIST = ['mafia', 'doctor', 'sheriff', 'civilian'];

export function RulesPage(container) {
  const node = Shell({ title: t('rules.title'), children: [
    h('h1.font-display.text-4xl.gold-text.mb-2', {}, t('rules.h1')),
    h('p.muted.font-serif.italic.mb-6', {}, t('rules.subtitle')),
    h('div.stack-4', {}, [
      Card([h('div.font-display.text-lg.accent.mb-2', {}, t('rules.night.title')), h('p.text-sm.muted', {}, t('rules.night.desc'))]),
      Card([h('div.font-display.text-lg.accent.mb-2', {}, t('rules.day.title')),   h('p.text-sm.muted', {}, t('rules.day.desc'))]),
      Card([h('div.font-display.text-lg.accent.mb-2', {}, t('rules.win.title')),   h('p.text-sm.muted', {}, t('rules.win.desc'))]),
      h('h2.font-display.text-2xl.mt-8.mb-3', {}, t('rules.rolesTitle')),
      ...ROLES_LIST.map(r => Card([
        h('div.row.gap-3', { style: 'align-items:flex-start' }, [
          h('span.text-3xl', {}, ROLE_ICON[r]),
          h('div', {}, [h('div.font-display.text-lg', {}, ROLE_LABEL[r]), h('div.text-sm.muted.mt-1', {}, ROLE_DESC[r])]),
        ]),
      ])),
    ]),
  ] });
  mount(container, node);
}
