import { h, clear } from '../lib/dom.js';
import { appendChat } from '../lib/storage.js';
import { haptic } from '../lib/telegram.js';

export function createChat({ code, me }) {
  let _me = me, _room = null, open = false, lastSeen = 0, el = null;

  function setRoom(room) { _room = room; render(); }
  function setMe(next) { _me = next; }
  function unseen() { return Math.max(0, (_room?.chat?.length || 0) - lastSeen); }

  async function send(text) {
    text = text.trim();
    if (!text) return;
    haptic('light');
    try {
      await appendChat(code, {
        id: Math.random().toString(36).slice(2),
        authorId: _me?.id,
        authorName: _me?.name || 'Гість',
        text: text.slice(0, 240),
        ts: Date.now(),
      });
    } catch {}
  }

  function buildMessages(msgs) {
    if (msgs.length === 0) {
      return [h('div.chat-empty', {}, 'Ще тихо. Напишіть першу репліку.')];
    }
    return msgs.map(m => {
      const mine = m.authorName === _me?.name || m.authorId === _me?.id;
      return h('div.chat-row' + (mine ? '.mine' : ''), {}, h('div.chat-bubble', {}, [
        !mine && h('div.chat-author', {}, m.authorName || 'Гість'),
        m.text,
      ]));
    });
  }

  function render() {
    if (!el) return;
    if (!_room) return;

    if (!open) {
      // Closed: just the FAB button — safe to rebuild, no input involved
      clear(el);
      el.appendChild(h('button.chat-fab', {
        onclick: () => { open = true; lastSeen = _room?.chat?.length || 0; render(); },
      }, ['💬', unseen() > 0 && h('span.unseen', {}, String(unseen()))]));
      return;
    }

    // ── Panel is open ────────────────────────────────────────────────────────
    // KEY FIX: if the panel already exists in the DOM, only update the
    // messages list — never touch the <input> so the keyboard stays open.
    const existingPanel = el.querySelector('.chat-panel');
    if (existingPanel) {
      const listEl = existingPanel.querySelector('.chat-list');
      if (listEl) {
        const msgs = _room.chat || [];
        lastSeen = msgs.length;
        const atBottom = listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight < 60;
        clear(listEl);
        buildMessages(msgs).forEach(node => listEl.appendChild(node));
        if (atBottom) listEl.scrollTop = listEl.scrollHeight;
      }
      return; // input untouched — keyboard stays open
    }

    // First time opening: build the full panel
    clear(el);
    let inputEl, listEl;
    const msgs = _room.chat || [];
    lastSeen = msgs.length;

    el.appendChild(h('div.chat-panel', {}, [
      h('div.chat-head', {}, [
        h('span.chat-title', {}, 'Чат кімнати'),
        h('button.chat-close', { onclick: () => { open = false; render(); } }, '×'),
      ]),
      h('div.chat-list', { ref: e => (listEl = e) }, buildMessages(msgs)),
      h('form.chat-form', {
        onsubmit: e => {
          e.preventDefault();
          const t = inputEl?.value || '';
          if (inputEl) inputEl.value = '';
          send(t);
        },
      }, [
        h('input.chat-input', {
          ref: e => (inputEl = e),
          placeholder: 'Повідомлення',
          maxlength: 240,
          // prevent page scroll from dismissing keyboard on mobile
          autocomplete: 'off',
          autocorrect: 'off',
          spellcheck: false,
        }),
        h('button.chat-send', { type: 'submit' }, '↑'),
      ]),
    ]));
    setTimeout(() => {
      if (listEl) listEl.scrollTop = listEl.scrollHeight;
    }, 0);
  }

  return {
    mount(parent) { el = h('div', {}, null); parent.appendChild(el); render(); },
    setRoom, setMe,
  };
}
