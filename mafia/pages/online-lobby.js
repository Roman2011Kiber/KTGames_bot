import { h, mount } from '../lib/dom.js';
import { Shell, Card } from '../components/shell.js';
import { createRoom, joinRoom, loadNickname, saveNickname, saveMe, loadMe } from '../lib/storage.js';
import { getTelegramUser, haptic } from '../lib/telegram.js';
import { notify } from '../lib/notify.js';
import { navigate } from '../lib/router.js';

export function OnlineLobbyPage(container) {
  const tgUser = getTelegramUser();
  const state = {
    name: tgUser?.name || loadNickname() || '',
    code: '',
    busy: false,
  };

  async function create() {
    const n = state.name.trim();
    if (!n) { notify("Введіть ім'я", 'error'); return; }
    state.busy = true; render();
    haptic('medium');
    try {
      // Create with defaults — host configures settings inside the lobby
      const r = await createRoom(n);
      saveNickname(n);
      saveMe(r.code, { id: r.playerId, name: n, avatar: '🎭' });
      navigate(`/online/${r.code}`);
    } catch (e) {
      state.busy = false;
      notify(e.message || 'Помилка. Спробуйте ще.', 'error');
      render();
    }
  }

  async function join() {
    const c = state.code.trim().toUpperCase();
    const n = state.name.trim();
    if (!c) return;
    if (!n) { notify("Введіть ім'я", 'error'); return; }
    state.busy = true; render();
    try {
      const existing = loadMe(c);
      if (existing) {
        saveNickname(n);
        navigate(`/online/${c}`);
        return;
      }
      const r = await joinRoom(c, n);
      saveNickname(n);
      saveMe(c, { id: r.playerId, name: n, avatar: '🎭' });
      navigate(`/online/${c}`);
    } catch (e) {
      state.busy = false;
      notify(e.message || 'Кімнату не знайдено або гра вже розпочата.', 'error');
      render();
    }
  }

  function render() {
    mount(container, Shell({ title: 'Онлайн', children: [
      h('h1.font-display.text-4xl.gold-text.mb-2', {}, 'Онлайн-кімната'),
      h('p.muted.font-serif.italic.mb-6', {}, 'Створіть кімнату й поділіться кодом — друзі приєднаються за лічені секунди.'),
      Card([
        h('label.label', {}, tgUser ? "Ім'я (з Telegram)" : "Ваше ім'я"),
        h('input.input', {
          value: state.name,
          placeholder: 'Дон Корлеоне',
          disabled: !!tgUser,
          oninput: e => (state.name = e.target.value),
        }),
      ], 'mb-4'),
      Card([
        h('div.font-display.text-lg.mb-3', {}, 'Створити нову кімнату'),
        h('p.muted.text-sm.mb-3', {}, 'Налаштування таймерів та ботів — всередині кімнати після створення.'),
        h('button.btn.btn-blood', { onclick: create, disabled: state.busy }, state.busy ? '...' : 'Створити кімнату'),
      ], 'mb-4'),
      Card([
        h('div.font-display.text-lg.mb-3', {}, 'Приєднатися за кодом'),
        h('input.input.input-code', {
          value: state.code,
          placeholder: 'ABCDE',
          maxlength: 6,
          oninput: e => { state.code = e.target.value.toUpperCase(); e.target.value = state.code; },
        }),
        h('button.btn.btn-ghost-gold.mt-4', {
          onclick: join,
          disabled: state.busy || !state.code.trim(),
        }, 'Увійти до кімнати'),
      ]),
    ] }));
  }

  render();
}
