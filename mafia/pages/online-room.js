// Об'єднана сторінка: лобі + хід гри в одній «кімнаті».
import { h, mount } from "../lib/dom.js";
import { Shell, Card } from "../components/shell.js";
import { PlayersGrid } from "../components/players-grid.js";
import { GameLog } from "../components/game-log.js";
import { RoleBadge } from "../components/role-badge.js";
import { openModal, closeModal } from "../components/modal.js";
import { createChatController } from "../components/chat.js";
import {
  PHASE_LABEL, ROLES, ROLE_DESC, ROLE_LABEL, ROLE_ICON,
  alivePlayers, findById, startOnlineGame, appendLog,
  resolveNightActions, resolveVotes,
  expectedNightActorIds, expectedVoterIds,
  newId, mafiaCountFor,
} from "../lib/game.js";
import {
  subscribeRoom, patchRoom, saveRoom, deleteRoom,
  loadNickname, saveNickname,
} from "../lib/storage.js";
import { AVATARS, pickRandom } from "../lib/names.js";
import { getTelegramUser, haptic, hapticNotify } from "../lib/telegram.js";
import { notify } from "../lib/notify.js";
import { navigate } from "../lib/router.js";

const MIN_PLAYERS = 4;

export function OnlineRoomPage(container, code) {
  const tgUser = getTelegramUser();
  let me = loadMe(code) || (tgUser ? { id: tgUser.id, name: tgUser.name, avatar: pickRandom(AVATARS, 1)[0] || "🎭" } : null);
  let room = null;
  let revealed = false;

  const chat = createChatController({ code, me });

  const unsub = subscribeRoom(code, async (state) => {
    if (!state) {
      notify("Кімнату закрито.", "error");
      navigate("/online");
      return;
    }
    room = state;
    chat.setRoom(state);

    // Якщо нас немає в гравцях і гра ще не почалась — спробуємо приєднатися.
    if (me && state.phase === "lobby" && !state.players.find((p) => p.id === me.id)) {
      await joinAsPlayer();
    }

    // Якщо ми в грі та з'явилася роль — запам'ятати, щоб показати reveal один раз.
    if (state.phase === "role-reveal" && !revealed && me && state.players.find((p) => p.id === me.id)) {
      revealed = true;
      const player = state.players.find((p) => p.id === me.id);
      showRoleReveal(player, async () => {
        // Кожен гравець, прочитавши роль, помічає себе ready
        await patchRoom(code, { [`ready.${me.id}`]: true });
      });
    }

    // Хост авто-просуває гру з role-reveal у night-mafia коли всі готові
    if (state.phase === "role-reveal" && me?.id === state.hostId) {
      const allReady = state.players.every((p) => state.ready?.[p.id]);
      if (allReady) {
        await patchRoom(code, {
          phase: "night-mafia",
          day: 1,
          ready: {},
          log: appendLog(state.log, { day: 1, kind: "info", text: "🌙 Ніч 1. Місто засинає..." }),
        });
      }
    }

    // Хост резолвить ніч, коли всі дієві ролі надіслали дію
    if (state.phase === "night-mafia" && me?.id === state.hostId) {
      const expected = expectedNightActorIds(state);
      const ok = expected.every((id) => state.actions?.[id]);
      if (ok && expected.length > 0) {
        const next = resolveNightActions(state, state.actions || {});
        await saveRoom(code, { ...next, actions: {} });
      } else if (expected.length === 0) {
        const next = resolveNightActions(state, {});
        await saveRoom(code, { ...next, actions: {} });
      }
    }

    // Хост рахує голоси коли всі живі проголосували
    if (state.phase === "day-vote" && me?.id === state.hostId) {
      const voters = expectedVoterIds(state);
      const all = voters.every((id) => state.votes?.[id]);
      if (all && voters.length > 0) {
        const next = resolveVotes(state, state.votes);
        await saveRoom(code, { ...next, votes: {} });
      }
    }

    render();
  });

  if (!me) {
    askForIdentity((info) => {
      me = info;
      saveMe(code, info);
      chat.setMe(info);
      // приєднання відбудеться у наступному snapshot
    });
  }

  async function joinAsPlayer() {
    if (!room || !me) return;
    if (room.players.find((p) => p.id === me.id)) return;
    if (room.players.length >= 20) return;
    const next = {
      ...room,
      players: [...room.players, {
        id: me.id, name: me.name, avatar: me.avatar,
        role: "civilian", alive: true, isHuman: true,
      }],
      log: appendLog(room.log, { day: 0, kind: "info", text: `${me.avatar} ${me.name} приєднується.` }),
    };
    await saveRoom(code, next);
  }

  function render() {
    if (!room) return;
    if (room.phase === "lobby") return renderLobby();
    return renderGame();
  }

  function renderLobby() {
    const isHost = me?.id === room.hostId;
    const inviteUrl = `${location.origin}${location.pathname}#/online/${code}`;

    const start = async () => {
      if (room.players.length < MIN_PLAYERS) {
        notify(`Мінімум ${MIN_PLAYERS} гравці для початку.`, "error");
        return;
      }
      haptic("medium");
      const started = startOnlineGame(room);
      await saveRoom(code, started);
    };

    const leave = async () => {
      const next = {
        ...room,
        players: room.players.filter((p) => p.id !== me.id),
        log: appendLog(room.log, { day: 0, kind: "info", text: `${me.name} вийшов.` }),
      };
      if (next.players.length === 0) {
        await deleteRoom(code);
      } else {
        if (room.hostId === me.id) next.hostId = next.players[0].id;
        await saveRoom(code, next);
      }
      navigate("/online");
    };

    const node = Shell({
      title: `Кімната ${code}`, bg: "bg-noir", back: "/online",
      children: [
        h("h1.font-display.text-4xl.gold-text.mb-1", null, code),
        h("p.muted.font-serif.italic.mb-6", null,
          isHost ? "Поділіться кодом або посиланням і чекайте на гравців." : "Очікуємо, поки господар почне гру."),

        Card([
          h("div.text-xs.uppercase.tracking-mega.muted.mb-3", null,
            `Гравці (${room.players.length}/20)`),
          PlayersGrid(room, { meId: me?.id, hostId: room.hostId }),
        ], { extraClass: "mb-4" }),

        Card([
          h("div.font-display.text-lg.mb-3", null, "Запросити друзів"),
          h("div.text-xs.muted.mb-2", null, "Посилання"),
          h("input.input-text", {
            value: inviteUrl, readOnly: true,
            style: { width: "100%", marginBottom: "8px" },
            onclick: (e) => e.target.select(),
          }),
          h("button.btn.btn-ghost-gold", {
            onclick: async () => {
              try {
                await navigator.clipboard.writeText(inviteUrl);
                notify("Посилання скопійовано.", "success");
              } catch {
                notify("Скопіюйте посилання вручну.", "info");
              }
            },
          }, "Скопіювати посилання"),
        ], { extraClass: "mb-4" }),

        isHost
          ? h("button.btn.btn-blood.pulse", {
              onclick: start, disabled: room.players.length < MIN_PLAYERS,
            }, room.players.length < MIN_PLAYERS
              ? `Чекаємо ще ${MIN_PLAYERS - room.players.length}`
              : `Почати гру (${mafiaCountFor(room.players.length)} мафіозі)`)
          : h("div.card.text-center.muted.font-serif.italic", null,
              "Очікуємо початку гри..."),

        h("button.btn.btn-ghost.mt-3", { onclick: leave }, "Вийти з кімнати"),
      ],
    });
    mount(container, node);
    chat.mount(node);
  }

  function renderGame() {
    const meP = findById(room, me?.id);
    if (!meP) {
      const node = Shell({
        title: `Кімната ${code}`, bg: "bg-noir",
        children: [
          h("div.card.text-center", null, [
            h("div.font-display.text-lg.mb-2", null, "Гра вже триває"),
            h("p.text-sm.muted.font-serif.italic", null,
              "У цій кімнаті вже почалася партія без вас."),
            h("button.btn.btn-ghost-gold.mt-4", {
              onclick: () => navigate("/online"),
            }, "До списку кімнат"),
          ]),
        ],
      });
      mount(container, node);
      return;
    }

    const isNight = room.phase.startsWith("night");
    const isDay = room.phase.startsWith("day");
    const ended = room.phase === "ended";
    const bg = isNight ? "bg-night" : isDay ? "bg-day" : "bg-noir";

    const node = Shell({
      title: PHASE_LABEL[room.phase], bg, back: "/online",
      children: [
        h("div.row-between.mb-3", null, [
          h("div", null, [
            h("div.text-xs.uppercase.tracking-mega.muted", null,
              `${isNight ? "🌙 Ніч" : isDay ? "🌅 День" : "Гра"} ${room.day || 1} · ${code}`),
            h("h1.font-display.text-3xl.gold-text", null, PHASE_LABEL[room.phase]),
          ]),
          RoleBadge(meP),
        ]),
        PlayersGrid(room, { meId: me.id }),
        h("div.mt-5", null, renderPhase(meP)),
        GameLog(room),
      ],
    });
    mount(container, node);
    chat.mount(node);
  }

  function renderPhase(meP) {
    if (room.phase === "role-reveal") {
      return Card([
        h("div.text-center.muted.font-serif.italic", null,
          "Усі дивляться свої ролі..."),
      ]);
    }
    if (room.phase === "night-mafia") return renderNight(meP);
    if (room.phase === "day-discussion") return renderDayDiscussion(meP);
    if (room.phase === "day-vote") return renderVoting(meP);
    if (room.phase === "ended") return renderEnd(meP);
    return null;
  }

  function renderNight(meP) {
    const def = ROLES[meP.role];
    const action = meP.alive ? def?.nightAction : null;
    const submitted = !!room.actions?.[meP.id];
    const candidates = alivePlayers(room).filter((p) => def?.canTargetSelf ? true : p.id !== meP.id);

    if (!meP.alive) {
      return Card([
        h("div.text-center.muted.font-serif.italic", null,
          "Ви спостерігаєте з-за лаштунків. Очікуємо, поки інші зроблять хід."),
      ]);
    }

    if (!action) {
      return Card([
        h("div.text-center.py-4.muted.font-serif.italic", null,
          `Ви — ${def?.label?.toLowerCase() || "мирний"}. Очікуйте на ранок.`),
      ]);
    }

    if (submitted) {
      // Можливо, вже є результат перевірки
      const myInv = room.night?.investigations?.find((i) => i.sheriffId === meP.id);
      return Card([
        h("div.text-center.muted.font-serif.italic", null, "Ваш хід зроблено. Очікуємо інших..."),
        myInv && h("div.text-center.mt-3", null, [
          h("div.text-xs.uppercase.tracking-mega.muted", null, "Останній звіт"),
          h("div.font-display.text-lg.mt-1", null, `${myInv.targetName} — ${myInv.isMafia ? "МАФІЯ" : "не мафія"}`),
        ]),
      ]);
    }

    const ui = { target: null };
    let pickerEl;
    let submitBtn;
    const renderPicker = () => h("div.target-grid", null, candidates.map((p) =>
      h("button.target-tile" + (ui.target === p.id ? ".picked" : ""), {
        onclick: () => { ui.target = p.id; haptic("light"); refresh(); },
      }, [
        h("div.av", null, p.avatar),
        h("div.nm", null, p.name),
      ]),
    ));
    const refresh = () => {
      const next = renderPicker();
      pickerEl.replaceWith(next); pickerEl = next;
      submitBtn.disabled = !ui.target;
    };
    pickerEl = renderPicker();
    submitBtn = h("button.btn.btn-blood.mt-4", {
      onclick: async () => {
        if (!ui.target) return;
        haptic("medium");
        await patchRoom(code, { [`actions.${meP.id}`]: { action, target: ui.target } });
      },
      disabled: true,
    }, "Підтвердити");

    const title = action === "kill" ? "🩸 Кого прибрати цієї ночі?"
      : action === "heal" ? "🩺 Кого вилікувати?"
      : action === "investigate" ? "🔍 Кого перевірити?" : "Ваш хід";

    return Card([
      h("div.font-display.text-lg.mb-1", null, title),
      def.canTargetSelf && h("div.text-xs.muted.mb-3", null, "Можна обрати себе."),
      pickerEl,
      submitBtn,
    ]);
  }

  function renderDayDiscussion(meP) {
    const isHost = me?.id === room.hostId;
    return Card([
      h("div.font-display.text-lg.mb-2", null, "🌅 Світанок"),
      h("p.text-sm.muted.font-serif.italic", null,
        "Спілкуйтесь у чаті, обговорюйте підозри. Господар запускає голосування."),
      isHost
        ? h("button.btn.btn-ghost-gold.mt-4", {
            onclick: async () => {
              haptic("medium");
              await patchRoom(code, { phase: "day-vote", votes: {} });
            },
          }, "До голосування")
        : h("div.text-xs.muted.mt-4.text-center", null,
            "Очікуємо, поки господар почне голосування."),
    ]);
  }

  function renderVoting(meP) {
    const aliveOthers = alivePlayers(room).filter((p) => p.id !== meP.id);
    const submitted = !!room.votes?.[meP.id];

    if (!meP.alive) {
      return Card([
        h("div.text-center.muted.font-serif.italic", null,
          "Ви мертві й не голосуєте. Місто вирішує без вас."),
      ]);
    }

    if (submitted) {
      const target = findById(room, room.votes[meP.id]);
      return Card([
        h("div.text-center.muted.font-serif.italic", null,
          `Ваш голос прийнято: ${target?.name || ""}. Очікуємо інших...`),
      ]);
    }

    const ui = { pick: null };
    let pickerEl, submitBtn;
    const renderPicker = () => h("div.target-grid", null, aliveOthers.map((p) =>
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
      submitBtn.disabled = !ui.pick;
    };
    pickerEl = renderPicker();
    submitBtn = h("button.btn.btn-blood.mt-4", {
      onclick: async () => {
        if (!ui.pick) return;
        haptic("medium");
        await patchRoom(code, { [`votes.${meP.id}`]: ui.pick });
      },
      disabled: true,
    }, "Голосувати");

    return Card([
      h("div.font-display.text-lg.mb-3", null, "⚖️ Кого вигнати з міста?"),
      pickerEl,
      submitBtn,
    ]);
  }

  function renderEnd(meP) {
    const won =
      (room.winner === "mafia" && meP.role === "mafia") ||
      (room.winner === "town" && meP.role !== "mafia");
    const isHost = me?.id === room.hostId;
    return h("div.card.text-center", null, [
      h("div.text-xs.uppercase.tracking-mega.muted", null, "Фінал"),
      h("h2.font-display.text-5xl.mt-3" + (won ? ".gold-text" : ".blood-text"), null,
        won ? "ПЕРЕМОГА" : "ПОРАЗКА"),
      h("p.muted.font-serif.italic.mt-3", null,
        room.winner === "town" ? "Місто очистилось від мафії." : "Мафія перемогла. Місто впало в темряву."),
      h("div.result-grid", null, room.players.map((p) =>
        h("div.result-tile" + (p.role === "mafia" ? ".mafia" : ""), null, [
          h("div.av", null, p.avatar),
          h("div.nm", null, p.name),
          h("div.rl", null, `${ROLE_ICON[p.role]} ${ROLE_LABEL[p.role]}`),
        ]),
      )),
      h("div.row.gap-2.mt-6", null, [
        isHost && h("button.btn.btn-blood.flex-1", {
          onclick: async () => {
            const reset = {
              ...room, phase: "lobby", started: false, day: 0,
              players: room.players.map((p) => ({ ...p, role: "civilian", alive: true })),
              log: [{ day: 0, kind: "info", text: `Нова партія в кімнаті ${code}.` }],
              actions: {}, votes: {}, ready: {}, night: {}, winner: null,
            };
            await saveRoom(code, reset);
          },
        }, "Нова партія"),
        h("button.btn.btn-ghost-gold.flex-1", {
          onclick: () => navigate("/"),
        }, "В меню"),
      ]),
    ]);
  }

  function showRoleReveal(player, onClose) {
    let revealedLocal = false;
    function paint() {
      const content = h("div.text-center", null, !revealedLocal
        ? [
            h("div.text-xs.uppercase.tracking-mega.muted", null, "Ваша таємна роль"),
            h("button.reveal-card.mt-6", {
              onclick: () => { revealedLocal = true; haptic("heavy"); paint(); },
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
              }, "ГОТОВО"),
            ]),
          ],
      );
      closeModal();
      openModal(content, { dismissable: false });
    }
    paint();
  }

  function askForIdentity(onReady) {
    const ui = {
      name: tgUser?.name || loadNickname() || "",
      avatar: pickRandom(AVATARS, 1)[0] || "🎭",
    };
    let nameInput;
    function paint() {
      const content = h("div", null, [
        h("div.text-center.text-xs.uppercase.tracking-mega.muted.mb-3", null, "Як вас звати в кімнаті?"),
        h("input.input", {
          ref: (el) => (nameInput = el),
          value: ui.name, placeholder: "Ваше ім'я",
          oninput: (e) => { ui.name = e.target.value; },
        }),
        h("div.label.mt-4", null, "Аватар"),
        h("div.row.wrap.gap-2", null, AVATARS.slice(0, 12).map((a) =>
          h("button.avatar-pick" + (ui.avatar === a ? ".selected" : ""), {
            onclick: () => { ui.avatar = a; haptic("light"); paint(); },
          }, a),
        )),
        h("button.btn.btn-blood.mt-6", {
          onclick: () => {
            const trimmed = ui.name.trim();
            if (!trimmed) { notify("Введіть ім'я.", "error"); return; }
            saveNickname(trimmed);
            const info = { id: tgUser?.id || newId(), name: trimmed, avatar: ui.avatar };
            closeModal();
            onReady(info);
          },
        }, "Увійти"),
      ]);
      closeModal();
      openModal(content, { dismissable: false });
      setTimeout(() => nameInput?.focus(), 0);
    }
    paint();
  }

  // cleanup
  return () => {
    try { unsub(); } catch { /* */ }
    closeModal();
  };
}

function loadMe(code) {
  try {
    const raw = localStorage.getItem(`mafia:me:${code}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveMe(code, info) {
  try { localStorage.setItem(`mafia:me:${code}`, JSON.stringify(info)); } catch { /* */ }
}
