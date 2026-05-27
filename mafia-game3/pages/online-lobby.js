import { h, mount } from '../lib/dom.js';
import { Shell, Card } from '../components/shell.js';
import { createRoom, joinRoom, loadNickname, saveNickname, saveMe } from '../lib/storage.js';
import { getTelegramUser, haptic } from '../lib/telegram.js';
import { notify } from '../lib/notify.js';
import { navigate } from '../lib/router.js';
import { t } from '../lib/i18n.js';

export function OnlineLobbyPage(container) {
  const tgUser = getTelegramUser();
  const state = {
    name:      tgUser?.name || loadNickname() || '',
    code:      '',
    busy:      false,
    joinError: '',
  };

  // ── Create room ─────────────────────────────────────────────────────────────
  async function create() {
    const n = state.name.trim();
    if (!n) { notify(t('lobby.errNoName'), 'error'); return; }
    state.busy = true; render();
    haptic('medium');
    try {
      const r = await createRoom(n, {
        hostId:   tgUser?.id   ? String(tgUser.id) : undefined,
        photoUrl: tgUser?.avatar || '',
      });
      saveNickname(n);
      saveMe(r.code, { id: r.playerId, name: n, avatar: '🎭', photoUrl: tgUser?.avatar || '' });
      navigate(`/online/${r.code}`);
    } catch (e) {
      state.busy = false;
      notify(e.message || t('lobby.errNotFound'), 'error');
      render();
    }
  }

  // ── Join by code ─────────────────────────────────────────────────────────────
  async function join() {
    const c = state.code.trim().toUpperCase();
    const n = state.name.trim();
    if (!c) { state.joinError = t('lobby.errNoCode'); render(); return; }
    if (!n) { state.joinError = t('lobby.errNoName'); render(); return; }
    state.busy = true; state.joinError = ''; render();
    haptic('medium');
    try {
      const r = await joinRoom(c, n, {
        id:       tgUser?.id   ? String(tgUser.id) : undefined,
        photoUrl: tgUser?.avatar || '',
      });
      saveNickname(n);
      saveMe(r.code, { id: r.playerId, name: n, avatar: '🎭', photoUrl: tgUser?.avatar || '' });
      navigate(`/online/${r.code}`);
    } catch (e) {
      state.busy = false;
      state.joinError = e.message || t('lobby.errNotFound');
      render();
    }
  }

  // ── UI ──────────────────────────────────────────────────────────────────────
  function render() {
    mount(container, Shell({ title: t('lobby.title'), children: [
      h('h1.font-display.text-4xl.gold-text.mb-2', {}, t('lobby.title')),
      h('p.muted.font-serif.italic.mb-6', {}, t('lobby.subtitle')),

      Card([
        h('label.label', {}, tgUser ? t('lobby.nameLabel') : t('lobby.nameLabelGuest')),
        h('input.input', {
          value:       state.name,
          placeholder: t('lobby.namePlaceholder'),
          disabled:    !!tgUser,
          oninput:     e => (state.name = e.target.value),
        }),
      ], 'mb-4'),

      Card([
        h('div.font-display.text-lg.mb-3', {}, t('lobby.createTitle')),
        h('p.muted.text-sm.mb-3', {}, t('lobby.createSub')),
        h('button.btn.btn-blood', {
          onclick:  create,
          disabled: state.busy,
        }, state.busy ? t('lobby.creatingBtn') : t('lobby.createBtn')),
      ], 'mb-4'),

      Card([
        h('div.font-display.text-lg.mb-3', {}, t('lobby.joinTitle')),
        h('input.input.input-code', {
          value:       state.code,
          placeholder: 'ABCDE',
          maxlength:   6,
          style:       'letter-spacing:.15em;font-size:1.2rem;text-align:center;text-transform:uppercase',
          oninput:     e => { state.code = e.target.value.toUpperCase(); e.target.value = state.code; state.joinError = ''; },
          onkeydown:   e => { if (e.key === 'Enter') join(); },
        }),
        state.joinError && h('p', {
          style: 'color:#e74c3c;font-size:.82rem;margin-top:8px;text-align:center',
        }, '⚠️ ' + state.joinError),
        h('button.btn.btn-ghost-gold.mt-4', {
          onclick:  join,
          disabled: state.busy,
        }, state.busy ? t('lobby.joiningBtn') : t('lobby.joinBtn')),
      ]),
    ] }));
  }

  render();
}
