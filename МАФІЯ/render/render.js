import { db } from "../firebase/config.js"
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  //getFirestore,
  doc,
  setDoc,
  //getDoc,
  updateDoc,
  //deleteDoc,
  //collection,
  //addDoc,
  //getDocs,
  onSnapshot,
  query,
  where,
  //orderBy,
  //limit,
  //increment,
  //arrayUnion,
  //arrayRemove,
  //serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import {
  roomRef,
  createRoom,
  updateRoom,
  getRoom,
  listenRoom,
  getUserId,
  getUserName,
  createRoomCode
} from "../firebase/config.js";

import { state } from "../state.js"
import { renderLobby } from "./Lobby.js"

export function render() {
    const app = document.getElementById("app");
    switch (state.screen) {
        case "home":
        app.innerHTML = renderHome();
        break;
        case "create":
        app.innerHTML = renderCreate();
        break;
        case "join":
        app.innerHTML = renderJoin();
        break;
        case "lobby":
        app.innerHTML = renderLobby();
        break;
        case "roles":
        app.innerHTML = renderRoles();
        break;
        case "day":
        app.innerHTML = renderDay();
        break;
        case "night":
        app.innerHTML = renderNight();
        break;
        case "result":
        app.innerHTML = renderResult();
        break;
        default:
        app.innerHTML = renderHome();
    }
    bindEvents();
}

render();

function renderHome() {
  return `
    <div class="home-hero">
      <div class="emoji">🎭</div>
      <h1>Мафія</h1>
      <p class="subtitle">Грайте разом з різних пристроїв</p>
    </div>
    <div class="card">
      <h3>Нова гра</h3>
      <button class="btn btn-primary" id="btn-create">Створити кімнату</button>
    </div>
    <div class="card">
      <h3>Приєднатись</h3>
      <button class="btn btn-secondary" id="btn-join-screen">Ввести код кімнати</button>
    </div>
  `;
}

function renderCreate() {
  return `
    <h2>Нова кімната</h2>
    <div class="card">
      <input type="text" id="input-name" placeholder="Ваше ім'я" maxlength="20" autocomplete="off" />
      <button class="btn btn-primary" id="btn-do-create">Створити</button>
      <button class="btn btn-ghost" id="btn-back">← Назад</button>
    </div>
  `;
}

function renderJoin() {
  return `
    <h2>Приєднатись</h2>
    <div class="card">
      <input type="text" id="input-name" placeholder="Ваше ім'я" maxlength="20" autocomplete="off" />
      <input type="text" id="input-code" placeholder="Код кімнати (6 символів)" maxlength="6" autocomplete="off" style="text-transform:uppercase" />
      <button class="btn btn-primary" id="btn-do-join">Приєднатись</button>
      <button class="btn btn-ghost" id="btn-back">← Назад</button>
    </div>
  `;
}

function renderRoles() {
  const g = state.game;
  if (!g) return "";
  const me = g.players.find((p) => p.id === state.playerId);
  const myRole = me?.role;
  const isHost = g.hostId === state.playerId;

  if (!state.roleRevealed) {
    return `
      <h2>Ролі роздано</h2>
      <div class="card role-card">
        <div class="role-icon">🙈</div>
        <p style="margin-bottom:16px;color:#888">Натисни щоб побачити свою роль.<br>Інші не повинні бачити екран!</p>
        <button class="btn btn-primary" id="btn-reveal-role">Показати мою роль</button>
      </div>
      ${
        isHost
          ? `<div style="margin-top:16px;color:#888;font-size:0.85rem;text-align:center">Зачекай поки всі подивляться ролі,<br>потім натисни щоб почати день</div>
           <button class="btn btn-secondary" id="btn-start-day" style="margin-top:10px">Всі готові → День 1</button>`
          : `<div class="waiting-msg"><span class="spinner"></span> Хост скоро почне перший день...</div>`
      }
    `;
  }

  const roleInfo = getRoleInfo(myRole);
  return `
    <h2>Твоя роль</h2>
    <div class="card role-card">
      <div class="role-icon">${roleInfo.icon}</div>
      <div class="role-name ${roleInfo.cls}">${myRole}</div>
      <p class="role-desc">${roleInfo.desc}</p>
    </div>
    ${
      isHost
        ? `<button class="btn btn-secondary" id="btn-start-day" style="margin-top:16px">Всі готові → День 1</button>`
        : `<div class="waiting-msg" style="margin-top:16px"><span class="spinner"></span> Чекаємо поки хост почне перший день...</div>`
    }
    <button class="btn btn-ghost" id="btn-hide-role" style="margin-top:10px">Приховати роль</button>
  `;
}

function renderDay() {
  const g = state.game;
  if (!g) return "";
  const me = g.players.find((p) => p.id === state.playerId);
  const myRole = me?.role;
  const amAlive = me?.alive;
  const isHost = g.hostId === state.playerId;

  const alivePlayers = g.players.filter((p) => p.alive);
  const totalAlive = alivePlayers.length;
  const voteCount = Object.values(g.votes).reduce((a, b) => a + b, 0);

  return `
    <div class="phase-badge">
      <span class="phase-dot day"></span>
      <span>День ${g.day}</span>
      ${myRole ? `<span style="margin-left:auto;color:#666">${getRoleInfo(myRole).icon} ${myRole}</span>` : ""}
    </div>
    <h2>Голосування</h2>
    ${!amAlive ? '<div class="waiting-msg">Ти вибув. Спостерігай за грою 👀</div>' : ""}
    ${
      g.hasVoted
        ? `<div class="waiting-msg"><span class="spinner"></span> Проголосував! Чекаємо інших (${voteCount}/${totalAlive})...</div>`
        : amAlive
          ? '<p style="color:#aaa;margin-bottom:12px;font-size:0.9rem">Кого підозрюєш у тому, що він мафія?</p>'
          : ""
    }
    <div class="card">
      <ul class="player-list">
        ${g.players
          .map((p) => {
            const voteCount = g.votes[p.id] || 0;
            const isMe = p.id === state.playerId;
            const canVote = amAlive && !g.hasVoted && p.alive && !isMe;
            return `
            <li class="player-item${p.alive ? "" : " dead"}">
              <div class="vote-bar">
                <span>${isMe ? ' <span style="color:#888;font-size:0.75rem">(ти)</span>' : ""}</span>
                ${voteCount > 0 ? `<span class="vote-count">🗳 ${voteCount}</span>` : ""}
              </div>
              ${
                canVote
                  ? `<button class="btn btn-primary btn-small" data-vote="${p.id}">Голос</button>`
                  : ""
              }
            </li>
          `;
          })
          .join("")}
      </ul>
    </div>
  `;
}

function renderNight() {
  const g = state.game;
  if (!g) return "";
  const me = g.players.find((p) => p.id === state.playerId);
  const myRole = me?.role;
  const amAlive = me?.alive;
  const isMafia = myRole === "Мафія" && amAlive;

  if (state.nightKilled) {
    return `
      <div class="phase-badge">
        <span class="phase-dot night"></span>
        <span>Ніч ${g.day}</span>
      </div>
      <div class="waiting-msg" style="margin-top:32px">
        <span class="spinner"></span> Чекаємо завершення ночі...
      </div>
    `;
  }

  return `
    <div class="phase-badge">
      <span class="phase-dot night"></span>
      <span>Ніч ${g.day}</span>
      ${myRole ? `<span style="margin-left:auto;color:#666">${getRoleInfo(myRole).icon} ${myRole}</span>` : ""}
    </div>
    <h2>Настала ніч</h2>
    ${
      isMafia
        ? `<p style="color:#e74c3c;margin-bottom:12px;font-size:0.9rem">Ти — мафія. Обери жертву:</p>
         <div class="card">
           <ul class="player-list">
             ${g.players
               .filter((p) => p.alive && p.id !== state.playerId)
               .map(
                 (p) => `
               <li class="player-item">
                 <span>${escHtml(p.name)}</span>
                 <button class="btn btn-primary btn-small" data-kill="${p.id}">Вбити</button>
               </li>
             `,
               )
               .join("")}
           </ul>
         </div>`
        : `<div class="waiting-msg" style="margin-top:32px">
           <span class="spinner"></span> 
           ${amAlive ? "Місто спить. Мафія діє..." : "Ти вибув. Спостерігай 👀"}
         </div>`
    }
  `;
}

function renderResult() {
  const g = state.game;
  if (!g) return "";
  const isMafiaWin = g.winner === "mafia";

  return `
    <div class="card winner-banner">
      <div class="winner-icon">${isMafiaWin ? "🔫" : "⚖️"}</div>
      <div class="winner-text ${isMafiaWin ? "mafia" : "civil"}">
        ${isMafiaWin ? "Перемогла мафія!" : "Перемогли мирні!"}
      </div>
      <p style="color:#888;margin-top:8px">Гра завершена</p>
    </div>
    <div class="card">
      <h3>Ролі гравців</h3>
      <ul class="player-list">
        ${g.players
          .map((p) => {
            const ri = getRoleInfo(p.role);
            return `
            <li class="player-item${p.alive ? "" : " dead"}">
              <span>${ri.icon}${p.id === state.playerId ? ' <span style="color:#888;font-size:0.75rem">(ти)</span>' : ""}</span>
              <span class="tag ${ri.tagCls}">${p.role || "?"}</span>
            </li>
          `;
          })
          .join("")}
      </ul>
    </div>
    <button class="btn btn-primary" id="btn-new-game" style="margin-top:8px">Нова гра</button>
  `;
}

function bindEvents() {
  const on = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", fn);
  };

  on("btn-create", () => {
    state.screen = "create";
    render();
  });

  on("btn-join-screen", () => {
    state.screen = "join";
    render();
  });

  on("btn-back", () => {
    state.screen = "home";
    render();
  });

  // 🔥 СТВОРИТИ КІМНАТУ
  on("btn-do-create", async () => {
    const inputName = document.getElementById("input-name")?.value;

    const playerId = getUserId();
    const name = getUserName(inputName);

    if (!name) return;

    const code = createRoomCode();

    const room = {
      code,
      hostId: playerId,
      phase: "lobby",
      players: {
        [playerId]: {
          id: playerId,
          name,
          alive: true
        }
      }
    };

    await createRoom(code, room);

    state.code = code;
    state.playerId = playerId;
    state.playerName = name;
    state.game = room;
    state.screen = "lobby";

    listenRoom(code);

    render();
  });

  // 🔥 ПРИЄДНАТИСЬ
  on("btn-do-join", async () => {
    const inputName = document.getElementById("input-name")?.value;
    const code = document.getElementById("input-code")?.value?.toUpperCase();

    const playerId = getUserId();
    const name = getUserName(inputName);

    if (!name || !code) return;

    const room = await getRoom(code);
    if (!room) return;

    const players = room.players || {};

    players[playerId] = {
      id: playerId,
      name,
      alive: true
    };

    await updateRoom(code, { players });

    state.code = code;
    state.playerId = playerId;
    state.playerName = name;
    state.game = room;
    state.screen = "lobby";

    listenRoom(code);

    render();
  });

  on("btn-leave", () => {
    state.screen = "home";
    state.code = null;
    state.playerId = null;
    state.game = null;
    render();
  });
}