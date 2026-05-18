import { h, mount } from "../lib/dom.js";
import { Shell, Card } from "../components/shell.js";
import { createSoloGame, ROLE_LABEL, mafiaCountFor } from "../lib/game.js";
import { saveLastGame, loadNickname, saveNickname } from "../lib/storage.js";
import { getTelegramUser, haptic } from "../lib/telegram.js";
import { AVATARS } from "../lib/names.js";
import { navigate } from "../lib/router.js";

const ROLE_OPTS = [
  { value: "random", label: "Випадкова" },
  { value: "mafia", label: ROLE_LABEL.mafia },
  { value: "doctor", label: ROLE_LABEL.doctor },
  { value: "sheriff", label: ROLE_LABEL.sheriff },
  { value: "civilian", label: ROLE_LABEL.civilian },
];

export function NewGamePage(container) {
  const tgUser = getTelegramUser();
  const state = {
    name: tgUser?.name || loadNickname() || "",
    count: 6,
    role: "random",
    avatar: AVATARS[0],
  };

  function start() {
    haptic("medium");
    const finalName = (state.name.trim() || tgUser?.name || "Гравець");
    saveNickname(finalName);
    const g = createSoloGame({
      humanName: finalName,
      humanAvatar: state.avatar,
      totalPlayers: state.count,
      forcedRole: state.role === "random" ? undefined : state.role,
    });
    saveLastGame(g);
    navigate("/game");
  }

  function render() {
    const node = Shell({
      title: "Нова партія",
      bg: "bg-noir",
      children: [
        h("h1.font-display.text-4xl.gold-text.mb-6", null, "Збираємо стіл"),

        Card([
          h("label.label", null, "Ваше ім'я"),
          h("input.input", {
            value: state.name,
            placeholder: "Дон Корлеоне",
            oninput: (e) => { state.name = e.target.value; },
          }),
          h("label.label", { style: { marginTop: "20px" } }, "Аватар"),
          h("div.row.wrap.gap-2", null, AVATARS.slice(0, 12).map((a) =>
            h("button.avatar-pick" + (state.avatar === a ? ".selected" : ""), {
              onclick: () => { state.avatar = a; haptic("light"); render(); },
            }, a),
          )),
        ], { extraClass: "mb-4" }),

        Card([
          h("label.label", null, [
            "Кількість гравців: ",
            h("span.accent", null, String(state.count)),
          ]),
          h("input.slider", {
            type: "range", min: 4, max: 20, value: state.count,
            oninput: (e) => { state.count = Number(e.target.value); render(); },
          }),
          h("div.slider-marks", null, [
            h("span", null, "4"), h("span", null, "10"),
            h("span", null, "15"), h("span", null, "20"),
          ]),
          h("p.text-xs.muted.mt-3", null,
            `${mafiaCountFor(state.count)} мафіозі, 1 лікар, 1 шериф, решта (${state.count - mafiaCountFor(state.count) - 2}) — мирні.`,
          ),
        ], { extraClass: "mb-4" }),

        Card([
          h("label.label", null, "Бажана роль"),
          h("div.role-grid", null, ROLE_OPTS.map((r) =>
            h("button.role-btn" + (state.role === r.value ? ".selected" : ""), {
              onclick: () => { state.role = r.value; haptic("light"); render(); },
            }, r.label),
          )),
        ], { extraClass: "mb-6" }),

        h("button.btn.btn-blood.pulse", { onclick: start }, "Почати партію"),
      ],
    });
    mount(container, node);
  }

  render();
}
