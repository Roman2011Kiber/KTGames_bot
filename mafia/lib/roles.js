// =====================================================================
//  Реєстр ролей. Щоб додати нову роль — просто додайте об'єкт сюди.
// ---------------------------------------------------------------------
//  Поля:
//    team           — "mafia" | "town"
//    label, icon, desc — для відображення
//    nightAction    — "kill" | "heal" | "investigate" | null
//    canTargetSelf  — чи можна обрати ціллю себе
//    knowsTeam      — чи бачить інших членів команди (мафія — так)
//    distribute(n)  — скільки таких ролей у грі (null = заповнити мирними)
//
//  Resolve order: heal → kill → investigate.
//  Town виграє коли мафії 0; Mafia виграє коли мафії >= town.
// =====================================================================

export function mafiaCountFor(n) {
  if (n <= 5) return 1;
  if (n <= 7) return 2;
  if (n <= 10) return 3;
  if (n <= 13) return 4;
  if (n <= 16) return 5;
  return 6;
}

export const ROLES = {
  mafia: {
    team: "mafia", label: "Мафія", icon: "🩸",
    desc: "Кожної ночі обираєте жертву разом із родиною. Перемагаєте, коли мафії стане не менше за мирних.",
    nightAction: "kill", canTargetSelf: false, knowsTeam: true,
    distribute: (n) => mafiaCountFor(n),
  },
  doctor: {
    team: "town", label: "Лікар", icon: "🩺",
    desc: "Кожної ночі лікуєте одного гравця, рятуючи його від кулі. Можна себе.",
    nightAction: "heal", canTargetSelf: true, knowsTeam: false,
    distribute: () => 1,
  },
  sheriff: {
    team: "town", label: "Шериф", icon: "🔍",
    desc: "Кожної ночі перевіряєте одного гравця: дізнаєтесь, чи він мафія.",
    nightAction: "investigate", canTargetSelf: false, knowsTeam: false,
    distribute: () => 1,
  },
  civilian: {
    team: "town", label: "Мирний житель", icon: "🌹",
    desc: "У вас немає особливих здібностей. Голосуйте мудро вдень — у цьому ваша сила.",
    nightAction: null, canTargetSelf: false, knowsTeam: false,
    distribute: () => null,
  },
};

export const ROLE_LABEL = Object.fromEntries(
  Object.entries(ROLES).map(([k, v]) => [k, v.label]),
);
export const ROLE_ICON = Object.fromEntries(
  Object.entries(ROLES).map(([k, v]) => [k, v.icon]),
);
export const ROLE_DESC = Object.fromEntries(
  Object.entries(ROLES).map(([k, v]) => [k, v.desc]),
);

export function roleTeam(role) {
  return ROLES[role]?.team || "town";
}

export function buildRoleDeck(n) {
  const deck = [];
  let fillerKey = "civilian";
  for (const [key, def] of Object.entries(ROLES)) {
    const count = def.distribute(n);
    if (count == null) { fillerKey = key; continue; }
    for (let i = 0; i < count; i++) deck.push(key);
  }
  while (deck.length < n) deck.push(fillerKey);
  if (deck.length > n) deck.length = n;
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
