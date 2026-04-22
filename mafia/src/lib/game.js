import { BOT_NAMES, AVATARS, pickRandom } from "./names";
import {
  ROLES,
  ROLE_LABEL,
  ROLE_ICON,
  ROLE_DESC,
  buildRoleDeck,
  roleTeam,
  mafiaCountFor,
} from "./roles";

export { ROLE_LABEL, ROLE_ICON, ROLE_DESC, ROLES, mafiaCountFor };

export const PHASE_LABEL = {
  "lobby": "Лобі",
  "role-reveal": "Розкриття ролі",
  "night-mafia": "Ніч",
  "night-resolve": "Світанок",
  "day-discussion": "Обговорення",
  "day-vote": "Голосування",
  "ended": "Гру закінчено",
};

export function newId() {
  return Math.random().toString(36).slice(2, 9);
}

export function newRoomCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

export function createSoloGame(opts) {
  const total = Math.max(4, Math.min(20, opts.totalPlayers));
  const botCount = total - 1;
  const botNames = pickRandom(BOT_NAMES, botCount);
  const avatars = pickRandom(AVATARS, total);
  const humanAvatar = opts.humanAvatar || avatars.pop() || "🎭";

  const roles = buildRoleDeck(total);
  if (opts.forcedRole) {
    const idx = roles.indexOf(opts.forcedRole);
    if (idx > 0) [roles[0], roles[idx]] = [roles[idx], roles[0]];
  }

  const humanId = newId();
  const players = [
    {
      id: humanId,
      name: opts.humanName || "Ви",
      isHuman: true,
      role: roles[0],
      alive: true,
      avatar: humanAvatar,
    },
    ...botNames.map((name, i) => ({
      id: newId(),
      name,
      isHuman: false,
      isBot: true,
      role: roles[i + 1],
      alive: true,
      avatar: avatars[i] || "🎭",
    })),
  ];

  return {
    id: newId(),
    createdAt: Date.now(),
    phase: "role-reveal",
    day: 0,
    players,
    humanId,
    night: {},
    votes: {},
    log: [
      {
        day: 0,
        kind: "info",
        text: `Місто з ${total} мешканців засинає... Серед них приховались ${roles.filter(r => roleTeam(r) === "mafia").length} мафіозі.`,
      },
    ],
    winner: null,
    mode: "solo",
  };
}

export function alivePlayers(g) {
  return g.players.filter((p) => p.alive);
}
export function aliveByTeam(g, team) {
  return alivePlayers(g).filter((p) => roleTeam(p.role) === team);
}
export function findById(g, id) {
  return g.players.find((p) => p.id === id);
}

export function checkWinner(g) {
  const m = aliveByTeam(g, "mafia").length;
  const t = aliveByTeam(g, "town").length;
  if (m === 0) return "town";
  if (m >= t) return "mafia";
  return null;
}

export function appendLog(log, entry) {
  // Keep log capped so Firestore doc stays small.
  const next = [...log, entry];
  return next.length > 80 ? next.slice(-80) : next;
}

// =================== AI heuristics ===================

export function aiPickTarget(g, actor, action) {
  const def = ROLES[actor.role];
  let pool = alivePlayers(g);
  if (!def?.canTargetSelf) pool = pool.filter((p) => p.id !== actor.id);
  if (action === "kill") {
    const enemies = pool.filter((p) => roleTeam(p.role) !== roleTeam(actor.role));
    if (enemies.length) pool = enemies;
  }
  if (action === "heal" && Math.random() < 0.25 && def?.canTargetSelf) {
    return actor.id;
  }
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

export function aiDayVote(g, voter) {
  const candidates = alivePlayers(g).filter((p) => p.id !== voter.id);
  if (!candidates.length) return null;
  if (roleTeam(voter.role) === "mafia") {
    const town = candidates.filter((p) => roleTeam(p.role) !== "mafia");
    const pool = town.length ? town : candidates;
    return pool[Math.floor(Math.random() * pool.length)].id;
  }
  return candidates[Math.floor(Math.random() * candidates.length)].id;
}

// =================== Resolution ===================

// Collect bot actions for the night (used both in solo and online).
export function collectBotNightActions(g, existingActions = {}) {
  const actions = { ...existingActions };
  for (const p of alivePlayers(g)) {
    if (!p.isBot) continue;
    const def = ROLES[p.role];
    if (!def?.nightAction) continue;
    if (actions[p.id]) continue;
    const target = aiPickTarget(g, p, def.nightAction);
    if (target) actions[p.id] = { action: def.nightAction, target };
  }
  return actions;
}

// Resolve all night actions atomically. Order: heal -> kill -> investigate.
export function resolveNightActions(g, actions) {
  let players = g.players.map((p) => ({ ...p }));
  let log = [...g.log];
  const investigations = []; // {sheriffId, targetId, isMafia}

  // 1) heal protections
  const protectedIds = new Set();
  for (const [pid, a] of Object.entries(actions)) {
    if (a?.action === "heal" && a.target) protectedIds.add(a.target);
  }

  // 2) kills (mafia votes — pick majority)
  const killTally = {};
  for (const [pid, a] of Object.entries(actions)) {
    if (a?.action === "kill" && a.target) {
      killTally[a.target] = (killTally[a.target] || 0) + 1;
    }
  }
  let victimId = null;
  let topVotes = 0;
  for (const [tid, c] of Object.entries(killTally)) {
    if (c > topVotes) { topVotes = c; victimId = tid; }
  }

  if (victimId) {
    if (protectedIds.has(victimId)) {
      const v = players.find((p) => p.id === victimId);
      log = appendLog(log, {
        day: g.day, kind: "save",
        text: `Лікар встиг втрутитись — ${v?.name || "хтось"} врятований!`,
      });
    } else {
      const victim = players.find((p) => p.id === victimId);
      if (victim?.alive) {
        victim.alive = false;
        log = appendLog(log, {
          day: g.day, kind: "death",
          text: `${victim.avatar}  ${victim.name} знайдено вранці. Він був ${ROLE_LABEL[victim.role].toLowerCase()}.`,
        });
      }
    }
  } else {
    log = appendLog(log, {
      day: g.day, kind: "info",
      text: "Ніч пройшла спокійно. Ніхто не постраждав.",
    });
  }

  // 3) investigations (private, not added to public log)
  for (const [pid, a] of Object.entries(actions)) {
    if (a?.action === "investigate" && a.target) {
      const target = players.find((p) => p.id === a.target);
      if (target) {
        investigations.push({
          sheriffId: pid, targetId: target.id,
          targetName: target.name,
          isMafia: roleTeam(target.role) === "mafia",
        });
      }
    }
  }

  const next = { ...g, players, log, phase: "day-discussion", night: { investigations } };
  const winner = checkWinner(next);
  if (winner) finishGame(next, winner);
  return next;
}

export function resolveVotes(g, votes) {
  const tally = {};
  for (const v of Object.values(votes || {})) {
    if (!v) continue;
    tally[v] = (tally[v] || 0) + 1;
  }
  let bestId = null, bestCount = 0, tie = false;
  for (const [id, c] of Object.entries(tally)) {
    if (c > bestCount) { bestCount = c; bestId = id; tie = false; }
    else if (c === bestCount) tie = true;
  }
  let players = g.players.map((p) => ({ ...p }));
  let log = [...g.log];
  if (!bestId || tie || bestCount === 0) {
    log = appendLog(log, {
      day: g.day, kind: "vote",
      text: "Місто не дійшло згоди. Сьогодні ніхто не покинув гру.",
    });
  } else {
    const lynched = players.find((p) => p.id === bestId);
    if (lynched) {
      lynched.alive = false;
      log = appendLog(log, {
        day: g.day, kind: "vote",
        text: `🪦 ${lynched.avatar}  ${lynched.name} вигнаний голосуванням. Він був ${ROLE_LABEL[lynched.role].toLowerCase()}.`,
      });
    }
  }
  const next = {
    ...g, players, log, votes: {}, phase: "night-mafia",
    day: g.day + 1, night: {},
  };
  const winner = checkWinner(next);
  if (winner) finishGame(next, winner);
  else {
    next.log = appendLog(next.log, {
      day: next.day, kind: "info",
      text: `🌙 Ніч ${next.day}. Місто засинає...`,
    });
  }
  return next;
}

function finishGame(g, winner) {
  g.winner = winner;
  g.phase = "ended";
  g.log = appendLog(g.log, {
    day: g.day, kind: "win",
    text: winner === "town"
      ? "🌅 Місто перемогло! Усю мафію виявлено."
      : "🩸 Мафія захопила місто...",
  });
}

// =================== Online helpers ===================

// Build initial online game state when host clicks Start.
export function startOnlineGame(lobby) {
  const total = lobby.players.length;
  const deck = buildRoleDeck(total);
  const players = lobby.players.map((p, i) => ({
    ...p, role: deck[i], alive: true, isBot: false,
  }));
  return {
    ...lobby,
    phase: "role-reveal",
    day: 0,
    players,
    night: {},
    votes: {},
    actions: {},
    ready: {},
    log: [{
      day: 0, kind: "info",
      text: `Гру розпочато з ${total} гравцями. Ніч наближається...`,
    }],
    winner: null,
    started: true,
  };
}

export function expectedNightActorIds(g) {
  // Returns ids of alive players whose role has a night action.
  return alivePlayers(g)
    .filter((p) => ROLES[p.role]?.nightAction)
    .map((p) => p.id);
}

export function expectedVoterIds(g) {
  return alivePlayers(g).map((p) => p.id);
}
