import { state } from "../state.js"

export function renderLobby() {
  const g = state.game;

    if (!g) {
    return `<div class="waiting-msg"><span class="spinner"></span> Завантаження...</div>`;
  }

  const players = g.players || {};
  const list = Object.values(players);

  const isHost = g.hostId === state.playerId;
  const canStart = g.players && g.players.length >= 4;

  return `
    <h2>Кімната</h2>

    <div class="card" style="text-align:center">
      <div class="code-label">Код кімнати</div>
      <div class="code-badge">${g.code}</div>
    </div>

    <div class="card">
      <h3>Гравці (${list.length}/10)</h3>

      <ul class="player-list">
        ${list.map(p => `
            <li class="player-item">
              <span>
                ${p.name}
                ${p.id === state.playerId ? '<span style="color:#888;font-size:0.8rem">(ти)</span>' : ""}
              </span>

              ${p.id === g.hostId ? '<span class="tag tag-host">Хост</span>' : ""}
            </li>
        `).join("")}
      </ul>

      ${list.length < 4
          ? `<p style="color:#888;font-size:0.85rem;margin-top:8px">
              Потрібно ще ${4 - list.length} гравців
            </p>`
          : ""
      }
    </div>

    ${isHost
        ? `<button class="btn btn-primary" id="btn-start" ${canStart ? "" : "disabled"}>
            Почати гру
          </button>`
        : `<div class="waiting-msg">
            <span class="spinner"></span>
            Чекаємо поки хост почне гру...
          </div>`}

    <button class="btn btn-ghost" id="btn-leave" style="margin-top:10px">
      Вийти
    </button>
  `;
}
