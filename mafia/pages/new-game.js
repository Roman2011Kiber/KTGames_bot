import { h, mount } from '../lib/dom.js';
import { Shell, Card } from '../components/shell.js';
import { createSolo, ROLE_LABEL, mafiaCount } from '../lib/game.js';
import { saveLastGame, loadNickname, saveNickname } from '../lib/storage.js';
import { AVATARS } from '../lib/names.js';
import { getTelegramUser, haptic } from '../lib/telegram.js';
import { navigate } from '../lib/router.js';

const ROLE_OPTS = [
  { value: 'random', label: 'Випадкова' },
  { value: 'mafia',    label: ROLE_LABEL.mafia    },
  { value: 'doctor',   label: ROLE_LABEL.doctor   },
  { value: 'sheriff',  label: ROLE_LABEL.sheriff  },
  { value: 'civilian', label: ROLE_LABEL.civilian },
];

export function NewGamePage(container) {
  const tgUser = getTelegramUser();
  const state = { name: tgUser?.name || loadNickname() || '', total: 6, role: 'random', avatar: AVATARS[0] };

  function start() {
    haptic('medium');
    const humanName = (tgUser?.name || state.name).trim() || 'Гравець';
    saveNickname(humanName);
    const g = createSolo({ humanName, humanAvatar: state.avatar, total: state.total, forcedRole: state.role === 'random' ? null : state.role });
    saveLastGame(g);
    navigate('/game');
  }

  function render() {
    mount(container, Shell({ title: 'Нова партія', children: [
      h('h1.font-display.text-4xl.gold-text.mb-6', {}, 'Збираємо стіл'),
      Card([
        h('label.label', {}, "Ваше ім'я"),
        h('input.input', { value: state.name, placeholder: 'Дон Корлеоне', disabled: !!tgUser, oninput: e => (state.name = e.target.value) }),
        h('label.label', { style: 'margin-top:20px' }, 'Аватар'),
        h('div.row.wrap.gap-2', {}, AVATARS.slice(0, 12).map(a =>
          h('button.avatar-pick' + (state.avatar === a ? '.selected' : ''), { onclick: () => { state.avatar = a; haptic('light'); render(); } }, a)
        )),
      ], 'mb-4'),
      Card([
        h('label.label', {}, ['Кількість гравців: ', h('span.accent', {}, String(state.total))]),
        h('input.slider', { type: 'range', min: 4, max: 20, value: state.total, oninput: e => { state.total = +e.target.value; render(); } }),
        h('div.slider-marks', {}, [h('span', {}, '4'), h('span', {}, '10'), h('span', {}, '15'), h('span', {}, '20')]),
        h('p.text-xs.muted.mt-3', {}, `${mafiaCount(state.total)} мафіозі · 1 лікар · 1 шериф · ${state.total - mafiaCount(state.total) - 2} мирних`),
      ], 'mb-4'),
      Card([
        h('label.label', {}, 'Бажана роль'),
        h('div.role-grid', {}, ROLE_OPTS.map(r =>
          h('button.role-btn' + (state.role === r.value ? '.selected' : ''), { onclick: () => { state.role = r.value; haptic('light'); render(); } }, r.label)
        )),
      ], 'mb-6'),
      h('button.btn.btn-blood.pulse', { onclick: start }, 'Почати партію'),
    ] }));
  }
  render();
}
