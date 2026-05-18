import { h, mount } from "../lib/dom.js";
import { Shell, Card } from "../components/shell.js";
import { newRoomCode, newId } from "../lib/game.js";
import { saveRoom, loadRoom, loadNickname, saveNickname } from "../lib/storage.js";
import { AVATARS, pickRandom } from "../lib/names.js";
import { getTelegramUser, haptic } from "../lib/telegram.js";
import { notify } from "../lib/notify.js";
import { navigate } from "../lib/router.js";

export function OnlineLobbyPage(container) {
  const tgUser = getTelegramUser();
  const state = {
    name: tgUser?.name || loadNickname() || "",
    code: "",
    busy: false,
  };

  function ensureName() {
    const n = (tgUser?.name || state.name).trim();
    if (!n) { notify("Введіть ім'я перед створенням кімнати.", "error"); return null; }
    saveNickname(n);
    return n;
  }

  async function create() {
    const n = ensureName();
    if (!n) return;
    state.busy = true; render();
    haptic("medium");
    const c = newRoomCode();
    const hostId = tgUser?.id || newId();
    const avatar = pickRandom(AVATARS, 1)[0] || "🎭";
    const room = {
      id: newId(),
      code: c,
      createdAt: Date.now(),
      phase: "lobby",
      mode: "online",
      day: 0,
      hostId,
      players: [{ id: hostId, name: n, isHuman: true, role: "civilian", alive: true, avatar }],
      actions: {},
      votes: {},
      ready: {},
      chat: [],
      night: {},
      log: [{ day: 0, kind: "info", text: `Кімнату ${c} створено. Очікуємо гравців...` }],
      winner: null,
      started: false,
    };
    await saveRoom(c, room);
    localStorage.setItem(`mafia:me:${c}`, JSON.stringify({ id: hostId, name: n, avatar }));
    state.busy = false;
    navigate(`/online/${c}`);
  }

  async function join() {
    const c = state.code.trim().toUpperCase();
    if (!c) return;
    if (!ensureName()) return;
    state.busy = true; render();
    const found = await loadRoom(c);
    state.busy = false;
    if (!found) {
      notify("Кімнату не знайдено. Перевірте код.", "error");
      haptic("heavy"); render(); return;
    }
    navigate(`/online/${c}`);
  }

  function render() {
    const node = Shell({
      title: "Онлайн", bg: "bg-noir",
      children: [
        h("h1.font-display.text-4xl.gold-text.mb-2", null, "Онлайн-кімната"),
        h("p.muted.font-serif.italic.mb-6", null,
          "Створіть кімнату й поділіться кодом — друзі приєднаються за лічені секунди.",
        ),

        Card([
          h("label.label", null, [
            "Ваше ім'я ",
            tgUser && h("span.accent", null, "(з Telegram)"),
          ]),
          h("input.input", {
            value: state.name,
            placeholder: "Дон Корлеоне",
            disabled: !!tgUser,
            oninput: (e) => { state.name = e.target.value; },
          }),
        ], { extraClass: "mb-4" }),

        Card([
          h("div.font-display.text-lg.mb-3", null, "Створити нову кімнату"),
          h("button.btn.btn-blood", {
            onclick: create, disabled: state.busy,
          }, state.busy ? "..." : "Створити кімнату"),
        ], { extraClass: "mb-4" }),

        Card([
          h("div.font-display.text-lg.mb-3", null, "Приєднатися за кодом"),
          h("input.input.input-code", {
            value: state.code,
            placeholder: "ABCDE",
            maxLength: 6,
            oninput: (e) => { state.code = e.target.value.toUpperCase(); e.target.value = state.code; },
          }),
          h("button.btn.btn-ghost-gold.mt-4", {
            onclick: join, disabled: state.busy || !state.code.trim(),
          }, "Увійти"),
        ]),
      ],
    });
    mount(container, node);
  }

  render();
}
