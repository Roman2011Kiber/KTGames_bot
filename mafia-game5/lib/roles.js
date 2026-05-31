import { t } from './i18n.js';

export function mafiaCount(n) {
  // 1 mafia per 5 players, rounded up: 1-5→1, 6-10→2, 11-15→3, 16-20→4
  return Math.ceil(n / 5);
}

export const ROLES = {
  mafia:    { team:'mafia', icon:'🩸', nightAction:'kill',        canTargetSelf:false },
  doctor:   { team:'town',  icon:'🩺', nightAction:'heal',        canTargetSelf:true  },
  sheriff:  { team:'town',  icon:'🔍', nightAction:'investigate', canTargetSelf:false },
  civilian: { team:'town',  icon:'🌹', nightAction:null,          canTargetSelf:false },
};

// Lazy getters so role names update when language changes
export const ROLE_LABEL = {
  get mafia()    { return t('role.mafia'); },
  get sheriff()  { return t('role.sheriff'); },
  get doctor()   { return t('role.doctor'); },
  get civilian() { return t('role.civilian'); },
};

export const ROLE_ICON = Object.fromEntries(Object.entries(ROLES).map(([k, v]) => [k, v.icon]));

export const ROLE_DESC = {
  get mafia()    { return t('roleDesc.mafia'); },
  get sheriff()  { return t('roleDesc.sheriff'); },
  get doctor()   { return t('roleDesc.doctor'); },
  get civilian() { return t('roleDesc.civilian'); },
};

export function roleTeam(role) { return ROLES[role]?.team || 'town'; }

export function buildDeck(n) {
  const deck = [];
  const mc = mafiaCount(n);
  for (let i = 0; i < mc; i++) deck.push('mafia');
  deck.push('doctor');
  deck.push('sheriff');
  while (deck.length < n) deck.push('civilian');
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
