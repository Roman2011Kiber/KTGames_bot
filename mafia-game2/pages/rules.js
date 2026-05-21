import { h, mount } from '../lib/dom.js';
import { Shell, Card } from '../components/shell.js';
import { ROLE_LABEL, ROLE_ICON, ROLE_DESC } from '../lib/roles.js';

const ROLES_LIST = ['mafia', 'doctor', 'sheriff', 'civilian'];

export function RulesPage(container) {
  const node = Shell({ title: 'Правила', children: [
    h('h1.font-display.text-4xl.gold-text.mb-2', {}, 'Як грати'),
    h('p.muted.font-serif.italic.mb-6', {}, 'Класична Мафія — просто та глибоко.'),
    h('div.stack-4', {}, [
      Card([h('div.font-display.text-lg.accent.mb-2', {}, '🌙 Ніч'), h('p.text-sm.muted', {}, 'Місто засинає. Мафія обирає жертву. Лікар намагається врятувати когось, а Шериф — перевірити підозрюваного або вистрілити.')]),
      Card([h('div.font-display.text-lg.accent.mb-2', {}, '🌅 День'), h('p.text-sm.muted', {}, 'Ви дізнаєтесь, хто загинув вночі. Місто обговорює та голосує — кого вигнати.')]),
      Card([h('div.font-display.text-lg.accent.mb-2', {}, '🏆 Перемога'), h('p.text-sm.muted', {}, 'Мирні перемагають, коли всю мафію вигнано. Мафія перемагає, коли її стає не менше за мирних.')]),
      h('h2.font-display.text-2xl.mt-8.mb-3', {}, 'Ролі'),
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
