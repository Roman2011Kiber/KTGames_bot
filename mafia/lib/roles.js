export function mafiaCount(n) {
  if (n <= 5) return 1; if (n <= 7) return 2; if (n <= 10) return 3;
  if (n <= 13) return 4; if (n <= 16) return 5; return 6;
}

export const ROLES = {
  mafia:    { team:'mafia', label:'Мафія',           icon:'🩸', nightAction:'kill',        canTargetSelf:false },
  doctor:   { team:'town',  label:'Лікар',            icon:'🩺', nightAction:'heal',        canTargetSelf:true  },
  sheriff:  { team:'town',  label:'Шериф',            icon:'🔍', nightAction:'investigate', canTargetSelf:false },
  civilian: { team:'town',  label:'Мирний житель',    icon:'🌹', nightAction:null,          canTargetSelf:false },
};

export const ROLE_DESC = {
  mafia:    'Кожної ночі разом із родиною обираєте жертву. Перемагаєте, коли мафіозі стає не менше за мирних.',
  doctor:   'Кожної ночі лікуєте одного гравця — можна і себе. Рятуєте від кулі.',
  sheriff:  'Вночі перевіряєте підозрюваного або відкриваєте вогонь. Якщо вбили невинного — гинете самі, роль передається іншому мирному.',
  civilian: 'Голосуйте мудро вдень — у цьому ваша єдина зброя.',
};

export const ROLE_LABEL = Object.fromEntries(Object.entries(ROLES).map(([k,v]) => [k, v.label]));
export const ROLE_ICON  = Object.fromEntries(Object.entries(ROLES).map(([k,v]) => [k, v.icon]));
export function roleTeam(role) { return ROLES[role]?.team || 'town'; }

export function buildDeck(n) {
  const deck = [];
  const mc = mafiaCount(n);
  for (let i = 0; i < mc; i++) deck.push('mafia');
  deck.push('doctor');
  deck.push('sheriff');
  while (deck.length < n) deck.push('civilian');
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
