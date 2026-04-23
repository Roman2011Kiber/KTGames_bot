import { h, clear } from "../lib/dom.js";
import { appendChatMessage } from "../lib/storage.js";
import { haptic } from "../lib/telegram.js";

// Чат для онлайн-кімнат. ChatController зберігає UI-стан (відкритий чи ні,
// скільки нових), а перерендер відбувається коли state кімнати оновлюється.
export function createChatController({ code, me }) {
  let state = { open: false, lastSeen: 0, room: null };
  let mounted = null;

  function setRoom(room) { state.room = room; render(); }
  function setMe(next) { me = next; render(); }
  function open() { state.open = true; state.lastSeen = (state.room?.chat?.length || 0); render(); }
  function close() { state.open = false; render(); }

  function unseenCount() {
    return Math.max(0, (state.room?.chat?.length || 0) - state.lastSeen);
  }

  async function send(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    haptic("light");
    await appendChatMessage(code, {
      id: Math.random().toString(36).slice(2),
      authorId: me?.id, authorName: me?.name || "Гість",
      text: trimmed.slice(0, 240), ts: Date.now(),
    });
  }

  function render() {
    if (!mounted) return;
    clear(mounted);
    if (!state.room) return;
    if (!state.open) {
      const fab = h("button.chat-fab", { onclick: open, title: "Чат" }, [
        "💬",
        unseenCount() > 0 && h("span.unseen", null, String(unseenCount())),
      ]);
      mounted.appendChild(fab);
      return;
    }
    let inputEl;
    let listEl;
    const messages = state.room.chat || [];
    state.lastSeen = messages.length;
    const panel = h("div.chat-panel", null, [
      h("div.chat-head", null, [
        h("span.chat-title", null, "Чат кімнати"),
        h("button.chat-close", { onclick: close, "aria-label": "Закрити" }, "×"),
      ]),
      h("div.chat-list", { ref: (el) => (listEl = el) },
        messages.length === 0
          ? h("div.chat-empty", null, "Поки тиша. Напишіть першу репліку.")
          : messages.map((m) => {
              const mine = m.authorId === me?.id;
              return h("div.chat-row" + (mine ? ".mine" : ""), null,
                h("div.chat-bubble", null, [
                  !mine && h("div.chat-author", null, m.authorName || "Гість"),
                  m.text,
                ]),
              );
            }),
      ),
      h("form.chat-form", {
        onsubmit: (e) => {
          e.preventDefault();
          if (!inputEl) return;
          const txt = inputEl.value;
          inputEl.value = "";
          send(txt);
        },
      }, [
        h("input.chat-input", {
          ref: (el) => (inputEl = el),
          placeholder: "Ваше повідомлення",
          maxLength: 240,
        }),
        h("button.chat-send", { type: "submit" }, "↑"),
      ]),
    ]);
    mounted.appendChild(panel);
    setTimeout(() => { if (listEl) listEl.scrollTop = listEl.scrollHeight; }, 0);
    setTimeout(() => inputEl?.focus(), 0);
  }

  return {
    mount(parent) {
      const host = h("div.chat-host");
      parent.appendChild(host);
      mounted = host;
      render();
    },
    setRoom, setMe,
  };
}
