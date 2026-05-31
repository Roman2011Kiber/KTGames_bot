/**
 * phrases.js — Game phrases, role labels, and UI strings
 * ────────────────────────────────────────────────────────
 * All values are lazy getters — they read the current language from i18n.js
 * each time they are accessed, so changing the language instantly affects
 * every render without requiring any import changes in other files.
 */

import { t, getLang } from './i18n.js';

// ── Role names ────────────────────────────────────────────────────────────────
export const ROLE_LABEL = {
  get mafia()    { return t('role.mafia'); },
  get sheriff()  { return t('role.sheriff'); },
  get doctor()   { return t('role.doctor'); },
  get civilian() { return t('role.civilian'); },
};

// ── Role icons (universal) ────────────────────────────────────────────────────
export const ROLE_ICON = {
  mafia:    '🩸',
  sheriff:  '🔍',
  doctor:   '🩺',
  civilian: '🌹',
};

// ── Role descriptions ─────────────────────────────────────────────────────────
export const ROLE_DESC = {
  get mafia()    { return t('roleDesc.mafia.short'); },
  get sheriff()  { return t('roleDesc.sheriff.short'); },
  get doctor()   { return t('roleDesc.doctor.short'); },
  get civilian() { return t('roleDesc.civilian.short'); },
};

// ── Phase speech (text-to-speech / log) ──────────────────────────────────────
export const SPEECH = {
  night:      (day)        => t('speech.night',     { day }),
  dayKilled:  (name)       => t('speech.dayKilled', { name }),
  dayPeace:   ()           => t('speech.dayPeace'),
  roleReveal: (label, desc)=> t('speech.roleReveal',{ label, desc }),
  mafiaWin:   ()           => t('speech.mafiaWin'),
  civWin:     ()           => t('speech.civWin'),
};

// ── Lobby / game / result UI strings ─────────────────────────────────────────
export const UI = {
  lobby: {
    get waitingForHost()  { return t('ui.lobby.waitingForHost'); },
    get startBtn()        { return t('ui.lobby.startBtn'); },
    get settingsBtn()     { return t('ui.lobby.settingsBtn'); },
    get inviteBtn()       { return t('ui.lobby.inviteBtn'); },
    get needMorePlayers() {
      return (n) => getLang() === 'en'
        ? `Need ${n} more player${n === 1 ? '' : 's'}`
        : `Потрібно ще ${n} учасник${n === 1 ? '' : n < 5 ? 'и' : 'ів'}`;
    },
    get playersCount() {
      return (humans, bots) => getLang() === 'en'
        ? `Players: ${humans}${bots ? ` · Bots: ${bots}` : ''}`
        : `Гравців: ${humans}${bots ? ` · Ботів: ${bots}` : ''}`;
    },
  },
  game: {
    get nightLabel()       { return (n) => getLang() === 'en' ? `Night ${n}` : `Ніч ${n}`; },
    get dayLabel()         { return (n) => getLang() === 'en' ? `Day ${n}`   : `День ${n}`; },
    get youEliminated()    { return t('ui.game.youEliminated'); },
    get watching()         { return t('ui.game.watching'); },
    get chooseVictim()     { return t('ui.game.chooseVictim'); },
    get yourVoteCounted()  { return t('ui.game.yourVoteCounted'); },
    get abstain()          { return t('ui.game.abstain'); },
    get voting()           { return t('ui.game.voting'); },
    get voteCounts()       { return t('ui.game.voteCounts'); },
    get mafiaChat()        { return t('ui.game.mafiaChat'); },
    get mafiaChatHint()    { return t('ui.game.mafiaChatHint'); },
    get mafiaChatQuiet()   { return t('ui.game.mafiaChatQuiet'); },
    get nightWaiting()     { return '🌙'; },
    get nightTitle()       { return t('ui.game.nightTitle'); },
    get nightSubtitle()    { return t('ui.game.nightSubtitle'); },
    get sheriffShoot()     { return t('ui.game.sheriffShoot'); },
    get sheriffWarning()   { return t('ui.game.sheriffWarning'); },
    get sheriffWait()      { return t('ui.game.sheriffWait'); },
    get shotFired()        { return t('ui.game.shotFired'); },
    get choiceMade()       { return t('ui.game.choiceMade'); },
  },
  result: {
    winIcon:  '🏆',
    loseIcon: '💀',
    get winTitle()  { return t('ui.result.winTitle'); },
    get loseTitle() { return t('ui.result.loseTitle'); },
    get civWin()    { return t('ui.result.civWin'); },
    get mafiaWin()  { return t('ui.result.mafiaWin'); },
  },
};
