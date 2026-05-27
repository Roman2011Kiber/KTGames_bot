import { h, mount } from '../lib/dom.js';
import { Shell, Card } from '../components/shell.js';
import { createSolo, ROLE_LABEL, mafiaCount } from '../lib/game.js';
import { saveLastGame, loadNickname, saveNickname } from '../lib/storage.js';
import { AVATARS } from '../lib/names.js';
import { getTelegramUser, haptic } from '../lib/telegram.js';
import { navigate } from '../lib/router.js';
import { t } from '../lib/i18n.js';

export function NewGamePage(container) {
  const tgUser = getTelegramUser();
  const state = { name: tgUser?.name || loadNickname() || '', total: 6, role: 'random', avatar: AVATARS[0] };

  function roleOpts() {
    return [
      { value: 'random',   label: t('newgame.randomRole') },
      { value: 'mafia',    label: ROLE_LABEL.mafia    },
      { value: 'doctor',   label: ROLE_LABEL.doctor   },
      { value: 'sheriff',  label: ROLE_LABEL.sheriff  },
      { value: 'civilian', label: ROLE_LABEL.civilian },
    ];
  }

  function start() {
    haptic('medium');
    const humanName = (tgUser?.name || state.name).trim() || t('newgame.defaultName');
    saveNickname(humanName);
    const g = createSolo({ humanName, humanAvatar: state.avatar, total: state.total, forcedRole: state.role === 'random' ? null : state.role });
    saveLastGame(g);
    navigate('/game');
  }

  function render() {
    mount(container, Shell({ title: t('newgame.title'), children: [
      h('h1.font-display.text-4xl.gold-text.mb-6', {}, t('newgame.h1')),
      Card([
        h('label.label', {}, t('newgame.nameLabel')),
        h('input.input', { value: state.name, placeholder: t('newgame.placeholder'), disabled: !!tgUser, oninput: e => (state.name = e.target.value) }),
        h('label.label', { style: 'margin-top:20px' }, t('newgame.avatarLabel')),
        h('div.row.wrap.gap-2', {}, AVATARS.slice(0, 12).map(a =>
          h('button.avatar-pick' + (state.avatar === a ? '.selected' : ''), { onclick: () => { state.avatar = a; haptic('light'); render(); } }, a)
        )),
      ], 'mb-4'),
      Card([
        h('label.label', {}, [t('newgame.playersLabel', { n: '' }), h('span.accent', {}, String(state.total))]),
        h('input.slider', { type: 'range', min: 4, max: 20, value: state.total, oninput: e => { state.total = +e.target.value; render(); } }),
        h('div.slider-marks', {}, [h('span', {}, '4'), h('span', {}, '10'), h('span', {}, '15'), h('span', {}, '20')]),
        h('p.text-xs.muted.mt-3', {}, t('newgame.composition', { m: mafiaCount(state.total), c: state.total - mafiaCount(state.total) - 2 })),
      ], 'mb-4'),
      Card([
        h('label.label', {}, t('newgame.roleLabel')),
        h('div.role-grid', {}, roleOpts().map(r =>
          h('button.role-btn' + (state.role === r.value ? '.selected' : ''), { onclick: () => { state.role = r.value; haptic('light'); render(); } }, r.label)
        )),
      ], 'mb-6'),
      h('button.btn.btn-blood.pulse', { onclick: start }, t('newgame.startBtn')),
    ] }));
  }
  render();
}
