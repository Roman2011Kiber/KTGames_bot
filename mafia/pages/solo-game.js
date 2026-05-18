import { h, mount } from "../lib/dom.js";
import { Shell, Card } from "../components/shell.js";
import { PlayersGrid } from "../components/players-grid.js";
import { GameLog } from "../components/game-log.js";
import { RoleBadge } from "../components/role-badge.js";
import { openModal, closeModal } from "../components/modal.js";
import {
  PHASE_LABEL, ROLES, ROLE_DESC, ROLE_LABEL, ROLE_ICON,
  alivePlayers, findById, appendLog,
  collectBotNightActions, resolveNightActions,
  aiDayVote, resolveVotes, mafiaCountFor,
} from "../lib/game.js";
import { loadLastGame, saveLastGame, clearLastGame } from "../lib/storage.js";
import { haptic, hapticNotify } from "../lib/telegram.js";
import { navigate } from "../lib/router.js";

export function SoloGamePage(container) {
  let g = loadLastGame();
  if (!g) { navigate("/"); return; }

  if (g.phase === "role-reveal") {
    showRoleReveal(findById(g, g.humanId), () => {
      g = {
        ...g,
        phase: "night-mafia", day: 1,
        log: appendLog(g.log, { day: 1, kind: "info", text: "🌙 Ніч 1. Місто засинає..." }),
      };
      save(); render();
    });
  }

  function save() { saveLastGame(g); }
  function update(next) { g = next; save(); render(); }

  function render() {
    const human = findById(g, g.humanId);
    const isNight = g.phase.startsWith("night");
    const isDay = g.phase.startsWith("day");
    const ended = g.phase === "ended";
    const bg = isNight ? "bg-night" : isDay ? "bg-day" : "bg-noir";

    const node = Shell({
      title: PHASE_LABEL[g.phase],
      bg,
      children: [
        h("div.row-between.mb-3", null, [
          h("div", null, [
            h("div.text-xs.uppercase.tracking-mega.muted", null,
              `${isNight ? "🌙 Ніч" : isDay ? "🌅 День" : "Гра"} ${g.day || 1}`),
            h("h1.font-display.text-3xl.gold-text", null, PHASE_LABEL[g.phase]),
          ]),
          RoleBadge(human),
        ]),

        PlayersGrid(g),

        h("div.mt-5", null, renderPhaseBlock()),

        GameLog(g),
      ],
    });
    mount(container, node);

    function renderPhaseBlock() {
      if (g.phase === "night-mafia") return renderNight(human);
      if (g.phase === "day-discussion") return renderDayDisc();
      if (g.phase === "day-vote") return renderVoting(human);
      if (ended) return renderEnd(human);
      return null;
    }
  }

  function renderNight(human) {
    const def = ROLES[human.role];
    const action = human.alive ? def?.nightAction : null;
    const candidates = alivePlayers(g).filter((p) => def?.canTargetSelf ? true : p.id !== human.id);
    const ui = { target: null, submitted: false };

    function submit() {
      if (ui.submitted) return;
      if (action && !ui.target) return;
      ui.submitted = true; haptic("medium");
      const actions = action && ui.target ? { [human.id]: { action, target: ui.target } } : {};
      const all = collectBotNightActions(g, actions);
      setTimeout(() => {
        const next = resolveNightActions({ ...g }, all);
        const myInv = next.night?.investigations?.find((i) => i.sheriffId === human.id);
        if (myInv) showInvestigation({ name: myInv.targetName, isMafia: myInv.isMafia });
        update(next);
      }, 600);
    }

    if (!human.alive) {
      return Card([
        h("div.text-center.muted.font-serif.italic", null,
          "Ви спостерігаєте за грою з-за лаштунків... Ніч триває."),
        h("button.btn.btn-ghost-gold.mt-4", { onclick: submit }, "Перейти до ранку"),
      ]);
    }

    let body;
    if (action) {
      const title = action === "kill" ? "🩸 Кого прибрати цієї ночі?"
        : action === "heal" ? "🩺 Кого вилікувати?"
        : action === "investigate" ? "🔍 Кого перевірити?"
        : "Ваш хід";
      let pickerEl;
      const renderPicker = () => h("div.target-grid", null, candidates.map((p) =>
        h("button.target-tile" + (ui.target === p.id ? ".picked" : ""), {
          onclick: () => { ui.target = p.id; haptic("light"); refreshPicker(); refreshSubmit(); },
        }, [
          h("div.av", null, p.avatar),
          h("div.nm", null, p.name),
        ]),
      ));
      const refreshPicker = () => {
        const next = renderPicker();
        pickerEl.replaceWith(next); pickerEl = next;
      };
      pickerEl = renderPicker();
      body = h("div", null, [
        h("div.font-display.text-lg.mb-1", null, title),
        def.canTargetSelf && h("div.text-xs.muted.mb-3", null, "Можна обрати себе."),
        pickerEl,
      ]);
    } else {
      body = h("div.text-center.py-4.muted.font-serif.italic", null,
        `Ви — ${def?.label?.toLowerCase() || "мирний"}. Спіть спокійно... Місто пробудиться на світанку.`);
    }

    let submitBtn;
    const refreshSubmit = () => {
      const ready = !action || !!ui.target;
      submitBtn.disabled = !ready || ui.submitted;
    };
    submitBtn = h("button.btn.btn-blood.mt-4", {
      onclick: submit, disabled: !action ? false : true,
    }, "Завершити ніч");
    setTimeout(refreshSubmit, 0);

    return Card([body, submitBtn]);
  }

  function renderDayDisc() {
    return Card([
      h("div.font-display.text-lg.mb-2", null, "🌅 Світанок"),
      h("p.text-sm.muted.font-serif.italic", null,
        "Місто прокинулось. Перегляньте хроніку нижче, обговоріть події та перейдіть до голосування."),
      h("button.btn.btn-ghost-gold.mt-4", {
        onclick: () => { haptic("medium"); update({ ...g, phase: "day-vote", votes: {} }); },
      }, "До голосування"),
    ]);
  }

  function renderVoting(human) {
    const aliveExceptSelf = alivePlayers(g).filter((p) => p.id !== human.id);
    const ui = { pick: null, submitted: false };

    function submit() {
      if (ui.submitted) return;
      if (human.alive && !ui.pick) return;
      ui.submitted = true; haptic("medium");
      const votes = {};
      if (human.alive && ui.pick) votes[human.id] = ui.pick;
      for (const p of alivePlayers(g)) {
        if (p.id === human.id) continue;
        if (!p.isBot) continue;
        const v = aiDayVote(g, p);
        if (v) votes[p.id] = v;
      }
      setTimeout(() => {
        const next = resolveVotes(g, votes);
        update(next);
        if (next.winner) {
          hapticNotify(next.winner === "town" && human.role !== "mafia" ? "success" : "error");
        }
      }, 600);
    }

    if (!human.alive) {
      return Card([
        h("div.text-center.muted.font-serif.italic.mb-4", null,
          "Ви мертві й не можете голосувати. Місто вирішує без вас."),
        h("button.btn.btn-ghost-gold", { onclick: submit }, "Підрахувати голоси"),
      ]);
    }

    let pickerEl;
    let submitBtn;
    const renderPicker = () => h("div.target-grid", null, aliveExceptSelf.map((p) =>
      h("button.target-tile" + (ui.pick === p.id ? ".picked" : ""), {
        onclick: () => { ui.pick = p.id; haptic("light"); refresh(); },
      }, [
        h("div.av", null, p.avatar),
        h("div.nm", null, p.name),
      ]),
    ));
    const refresh = () => {
      const next = renderPicker();
      pickerEl.replaceWith(next); pickerEl = next;
      submitBtn.disabled = !ui.pick || ui.submitted;
    };
    pickerEl = renderPicker();
    submitBtn = h("button.btn.btn-blood.mt-4", { onclick: submit, disabled: true }, "Голосувати");

    return Card([
      h("div.font-display.text-lg.mb-3", null, "⚖️ Кого вигнати з міста?"),
      pickerEl,
      submitBtn,
    ]);
  }

  function renderEnd(human) {
    const won =
      (g.winner === "mafia" && human.role === "mafia") ||
      (g.winner === "town" && human.role !== "mafia");
    return h("div.card.text-center", null, [
      h("div.text-xs.uppercase.tracking-mega.muted", null, "Фінал"),
      h("h2.font-display.text-5xl.mt-3" + (won ? ".gold-text" : ".blood-text"), null,
        won ? "ПЕРЕМОГА" : "ПОРАЗКА"),
      h("p.muted.font-serif.italic.mt-3", null,
        g.winner === "town" ? "Місто очистилось від мафії." : "Мафія перемогла. Місто впало в темряву."),
      h("div.result-grid", null, g.players.map((p) =>
        h("div.result-tile" + (p.role === "mafia" ? ".mafia" : ""), null, [
          h("div.av", null, p.avatar),
          h("div.nm", null, p.name),
          h("div.rl", null, `${ROLE_ICON[p.role]} ${ROLE_LABEL[p.role]}`),
        ]),
      )),
      h("div.row.gap-2.mt-6", null, [
        h("button.btn.btn-blood.flex-1", {
          onclick: () => { clearLastGame(); navigate("/new"); },
        }, "Нова партія"),
        h("button.btn.btn-ghost-gold.flex-1", {
          onclick: () => { clearLastGame(); navigate("/"); },
        }, "В меню"),
      ]),
    ]);
  }

  render();
}

function showRoleReveal(player, onClose) {
  let revealed = false;
  let modalCloser;
  function paint() {
    const content = h("div.text-center", null,
      !revealed
        ? [
            h("div.text-xs.uppercase.tracking-mega.muted", null, "Ваша таємна роль"),
            h("button.reveal-card.mt-6", {
              onclick: () => { revealed = true; haptic("heavy"); paint(); },
            }, [
              h("div.text-3xl.mb-2", null, "🃏"),
              h("div.font-display.tracking-widest", null, "ВІДКРИТИ"),
            ]),
          ]
        : [
            h("div.text-xs.uppercase.tracking-mega.muted", null, "Ваша таємна роль"),
            h("div.fade-in", null, [
              h("div.text-6xl.mt-3", null, ROLE_ICON[player.role]),
              h("div.font-display.text-3xl.gold-text.mt-3", null, ROLE_LABEL[player.role]),
              h("p.text-sm.muted.font-serif.italic.mt-3", { style: { maxWidth: "320px", margin: "12px auto 0" } },
                ROLE_DESC[player.role]),
              h("button.btn.btn-blood.mt-6", {
                onclick: () => { closeModal(); onClose(); },
              }, "ПОЧАТИ"),
            ]),
          ],
    );
    if (modalCloser) closeModal();
    modalCloser = openModal(content, { dismissable: false });
  }
  paint();
}

function showInvestigation(data) {
  const content = h("div.text-center", null, [
    h("div.font-display.text-xs.uppercase.tracking-mega.muted", null, "Результат перевірки"),
    h("div.text-4xl.mt-2", null, data.isMafia ? "🩸" : "🌹"),
    h("div.font-display.text-2xl.mt-3", null, data.name),
    h("div" + (data.isMafia ? ".blood-text" : ".emerald") + ".text-lg.mt-2", null,
      data.isMafia ? "Це МАФІЯ." : "Це не мафія."),
    h("button.btn.btn-ghost-gold.mt-6", {
      onclick: () => { closeModal(); hapticNotify("success"); },
      style: { width: "auto", padding: "10px 24px" },
    }, "Закрити"),
  ]);
  openModal(content);
}
