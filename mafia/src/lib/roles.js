// =====================================================================
//  Реєстр ролей. Щоб додати нову роль — просто додайте об'єкт сюди.
// ---------------------------------------------------------------------
//  Поля кожної ролі:
//    team           — "mafia" | "town" (у яку команду грає)
//    label          — назва українською
//    icon           — емодзі-маркер
//    desc           — короткий опис для гравця
//    nightAction    — "kill" | "heal" | "investigate" | null
//                     визначає що відбувається з ціллю вночі
//    canTargetSelf  — чи можна обрати ціллю себе
//    knowsTeam      — чи бачить інших членів своєї команди (мафія -- так)
//    distribute     — функція (n) => скільки таких ролей у грі.
//                     Поверніть число або null (буде заповнено мирними).
//
//  Resolve order при підрахунку ночі:
//    1) лікування (heal)  — захист спрацьовує перед вбивством
//    2) вбивство (kill)
//    3) перевірка (investigate)
//    Це рахується автоматично з типу `nightAction`.
//
//  Перемога:
//    - town виграє коли team === "mafia" живих стає 0
//    - mafia виграє коли мафії >= ніж town
//
//  Приклади розширень (закоментовані):
//    don         — лідер мафії, вбиває замість звичайного мафіозі
//    bodyguard   — захищає іншого ціною свого життя
//    journalist  — публічно оголошує одну роль на день
//    serial-killer — третя команда, вбиває сама
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
    team: "mafia",
    label: "Мафія",
    icon: "🩸",
    desc: "Кожної ночі обираєте жертву разом із родиною. Перемагаєте, коли мафії стане не менше за мирних.",
    nightAction: "kill",
    canTargetSelf: false,
    knowsTeam: true,
    distribute: (n) => mafiaCountFor(n),
  },
  doctor: {
    team: "town",
    label: "Лікар",
    icon: "🩺",
    desc: "Кожної ночі лікуєте одного гравця, рятуючи його від кулі. Можна себе.",
    nightAction: "heal",
    canTargetSelf: true,
    knowsTeam: false,
    distribute: () => 1,
  },
  sheriff: {
    team: "town",
    label: "Шериф",
    icon: "🔍",
    desc: "Кожної ночі перевіряєте одного гравця: дізнаєтесь, чи він мафія.",
    nightAction: "investigate",
    canTargetSelf: false,
    knowsTeam: false,
    distribute: () => 1,
  },
  civilian: {
    team: "town",
    label: "Мирний житель",
    icon: "🌹",
    desc: "У вас немає особливих здібностей. Голосуйте мудро вдень — у цьому ваша сила.",
    nightAction: null,
    canTargetSelf: false,
    knowsTeam: false,
    distribute: () => null, // null = заповнити решту
  },

  // === Приклади для майбутніх ролей (розкоментуйте, щоб увімкнути) ===
  //
  // don: {
  //   team: "mafia", label: "Дон", icon: "🎩",
  //   desc: "Лідер мафії. Його голос вирішальний при виборі жертви.",
  //   nightAction: "kill", canTargetSelf: false, knowsTeam: true,
  //   distribute: (n) => (n >= 8 ? 1 : 0),
  // },
  //
  // bodyguard: {
  //   team: "town", label: "Охоронець", icon: "🛡️",
  //   desc: "Захищає обраного ціною свого життя.",
  //   nightAction: "heal", canTargetSelf: false, knowsTeam: false,
  //   distribute: (n) => (n >= 10 ? 1 : 0),
  // },
};

// Допоміжні селектори
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

export function roleSummaryFor(n) {
  const counts = {};
  for (const r of buildRoleDeck(n)) counts[r] = (counts[r] || 0) + 1;
  return counts;
}

// Які ролі мають нічні дії (порядок резолва: heal -> kill -> investigate)
export const NIGHT_ORDER = ["heal", "kill", "investigate"];
