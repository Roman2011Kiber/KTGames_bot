import { h, mount, clear } from '../lib/dom.js';
import { Shell, Card } from '../components/shell.js';
import { PlayersGrid } from '../components/players-grid.js';
import { GameLog } from '../components/game-log.js';
import { openModal, closeModal } from '../components/modal.js';
import { createChat } from '../components/chat.js';
import { notify } from '../lib/notify.js';
import { haptic, getTelegramUser } from '../lib/telegram.js';
import { navigate } from '../lib/router.js';
import { speak } from '../lib/sound.js';
import { AVATARS } from '../lib/names.js';
import { ROLE_LABEL, ROLE_ICON, ROLE_DESC, SPEECH, UI } from '../lib/phrases.js';
import {
  loadMe, saveMe, loadNickname, saveNickname,
  subscribeRoom, startGame, revealRole,
  castVote, nightKill, nightHeal, nightInvestigate, nightSkip, sheriffShoot,
  kickPlayer, updateSettings, appendMafiaChat, joinRoom, hostTick, modSetPlayerRole,
} from '../lib/storage.js';
import { recordMyStats, getPlayerStats } from '../lib/stats.js';
import { isModerator } from '../lib/moderator.js';
import { getSettings } from '../lib/settings.js';

// ── Role mapping ──────────────────────────────────────────────────────────────
const ROLE_KEY = { 'Мафія': 'mafia', 'Шериф': 'sheriff', 'Лікар': 'doctor', 'Мирний': 'civilian' };

// ── Avatar ────────────────────────────────────────────────────────────────────
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function playerAvatar(p) {
  if (p.isBot) return '🤖';
  return AVATARS[hashCode(p.name) % AVATARS.length] || '🎭';
}

// ── Phase announcements ───────────────────────────────────────────────────────
let _lastPhase = null;
function announcePhase(room, myRole) {
  if (room.phase === _lastPhase) return;
  _lastPhase = room.phase;
  if (room.phase === 'night') {
    speak(SPEECH.night(room.day), { rate: 0.85, pitch: 0.9 });
  } else if (room.phase === 'day') {
    const killed = room.lastKilled;
    if (killed) speak(SPEECH.dayKilled(killed), { rate: 0.85 });
    else speak(SPEECH.dayPeace(), { rate: 0.87 });
  } else if (room.phase === 'roles' && myRole) {
    setTimeout(() => speak(SPEECH.roleReveal(ROLE_LABEL[myRole] || myRole, ROLE_DESC[myRole] || ''), { rate: 0.86 }), 700);
  } else if (room.phase === 'result') {
    if (room.winner === 'mafia') speak(SPEECH.mafiaWin(), { rate: 0.82, pitch: 0.88 });
    else speak(SPEECH.civWin(), { rate: 0.85, pitch: 1.0 });
  }
}

// ── Normalize room from API ───────────────────────────────────────────────────
function normalizeRoom(apiRoom, me) {
  if (!apiRoom) return null;
  const players = (apiRoom.players || []).map(p => ({
    ...p,
    avatar: playerAvatar(p),
    role: ROLE_KEY[p.role] || p.role || 'civilian',
    isHuman: !p.isBot,
  }));
  const chat = (apiRoom.chat || []).map(m => ({
    id: m.ts || Math.random(),
    authorId: (me && m.playerName === me.name) ? me.id : m.playerName,
    authorName: m.playerName,
    text: m.text,
    ts: m.ts,
  }));
  const log = (apiRoom.log || []).map(l => ({
    day: l.day ?? apiRoom.day ?? 0,
    kind: l.kind || 'info',
    text: l.text,
  }));
  const myRole = ROLE_KEY[apiRoom.myRole] || null;
  return { ...apiRoom, players, chat, log, myRole, humanId: me?.id };
}

// ── Timer ─────────────────────────────────────────────────────────────────────
function timeLeft(room) {
  if (!room.phaseStartedAt) return null;
  const dur = room.phase === 'night' ? room.nightDuration : room.dayDuration;
  if (!dur) return null;
  const elapsed = Math.floor((Date.now() - room.phaseStartedAt) / 1000);
  return Math.max(0, dur - elapsed);
}
function fmtTime(secs) {
  if (secs == null) return '';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

// ── Profile stat helpers ──────────────────────────────────────────────────────
function statBox(label, value) {
  return h('div', {
    style: 'background:rgba(255,255,255,.05);border-radius:8px;padding:10px;text-align:center',
  }, [
    h('div.font-display.gold-text', { style: 'font-size:1.25rem' }, String(value)),
    h('div.muted', { style: 'font-size:.72rem;margin-top:2px' }, label),
  ]);
}
function renderProfileStats(stats) {
  const wr = stats.gamesPlayed > 0 ? Math.round((stats.wins || 0) / stats.gamesPlayed * 100) : 0;
  const kills = (stats.mafiaKills || 0) + (stats.sheriffKills || 0);
  return h('div', {}, [
    h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:8px' }, [
      statBox('🎮 Ігор', stats.gamesPlayed || 0),
      statBox('🏆 Перемог', stats.wins || 0),
      statBox('💀 Вбивств', kills),
      statBox('🎯 Win rate', wr + '%'),
    ]),
    (stats.mafiaKills > 0 || stats.sheriffKills > 0) && h('div', { style: 'margin-top:8px;font-size:.78rem;color:var(--muted)' }, [
      stats.mafiaKills  > 0 && h('span', { style: 'margin-right:12px' }, `🩸 Як мафія: ${stats.mafiaKills}`),
      stats.sheriffKills > 0 && h('span', {}, `🔫 Як шериф: ${stats.sheriffKills}`),
    ]),
  ]);
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function OnlineRoomPage(container, { code }) {
  const tgUser = getTelegramUser();
  const isMod  = isModerator(tgUser?.id);
  let me = loadMe(code);
  let room = null;
  let unsub = null;
  let timerEl = null;
  let timerTid = null;
  let hostTimerTid = null;
  let chatCtrl = null;
  let mafiaInputEl = null;
  let prevPhase = null;
  let statsRecorded = false;

  // Per-phase action state
  let voteLocked   = false;
  let killLocked   = false;
  let shootLocked  = false;
  let healLocked   = false;
  let revealDone   = false;

  // ── Chat lifecycle ─────────────────────────────────────────────────────────
  function destroyChat() {
    if (chatCtrl) { chatCtrl.destroy(); chatCtrl = null; }
  }

  // ── Surrender ──────────────────────────────────────────────────────────────
  function onSurrender() {
    haptic('medium');
    openModal(h('div', {}, [
      h('div.font-display.text-xl.gold-text.mb-3', {}, '🏳 Покинути гру?'),
      h('p.muted.mb-4', {}, 'Ви вийдете з кімнати та не зможете повернутись у цю гру.'),
      h('div', { style: 'display:flex;gap:10px' }, [
        h('button.btn.btn-ghost-gold', { onclick: closeModal, style: 'flex:1' }, 'Залишитись'),
        h('button.btn.btn-blood', {
          style: 'flex:1',
          onclick: () => { closeModal(); destroyChat(); navigate('/online'); },
        }, 'Покинути'),
      ]),
    ]));
  }

  // ── Player profile modal ───────────────────────────────────────────────────
  function openProfile(player) {
    if (!player) return;
    haptic('light');
    const isMe    = me && String(player.id) === String(me.id);
    const isHostMe = me && room && room.hostId === me.id;
    const inLobby = room?.phase === 'lobby';
    const canKick = isHostMe && inLobby && !isMe && !player.isBot && player.id !== room.hostId;
    const canChangeRole = isMod && room && !inLobby && room.phase !== 'result' && !player.isBot;
    const photo   = isMe ? (tgUser?.avatar || '') : (player.photoUrl || '');
    const profId  = `prof-${String(player.id).replace(/\W/g, '')}`;
    const roleKey = player.role; // English key from normalizeRoom

    const roleSelector = canChangeRole && h('div', { style: 'margin-top:16px' }, [
      h('div', { style: 'font-size:.75rem;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em' }, '🛡️ Модератор: змінити роль'),
      h('select.input', {
        value: roleKey || 'civilian',
        onchange: async e => {
          const newRole = e.target.value;
          try {
            await modSetPlayerRole(code, player.id, newRole);
            notify(`Роль ${player.name} → ${ROLE_LABEL[newRole] || newRole}`, 'success');
            closeModal();
          } catch (err) { notify(err.message, 'error'); }
        },
      }, ['mafia', 'sheriff', 'doctor', 'civilian'].map(r =>
        h('option', { value: r, ...(r === roleKey ? { selected: true } : {}) }, `${ROLE_ICON[r] || ''} ${ROLE_LABEL[r] || r}`)
      )),
    ]);

    openModal(h('div', {}, [
      // Avatar / photo
      h('div.text-center', { style: 'margin-bottom:16px' }, [
        photo
          ? h('img', {
              src: photo,
              style: 'width:76px;height:76px;border-radius:50%;margin:0 auto 10px;display:block;border:2px solid var(--gold,#d4af37);object-fit:cover',
            })
          : h('div', { style: 'font-size:60px;margin-bottom:10px;text-align:center' }, player.avatar || '🎭'),
        h('div.font-display.text-2xl.gold-text', {}, player.name),
        player.isBot && h('div.muted.text-sm', { style: 'margin-top:4px' }, '🤖 Бот'),
        (room?.phase === 'result' || isMe || (isMod && getSettings().showAllRoles)) && roleKey && ROLE_LABEL[roleKey]
          ? h('div.text-sm.accent', { style: 'margin-top:4px' }, `${ROLE_ICON[roleKey] || ''} ${ROLE_LABEL[roleKey]}`)
          : null,
      ]),

      // Mod: show TG ID
      isMod && !player.isBot && h('div', {
        style: 'font-size:.72rem;font-family:monospace;color:var(--muted);text-align:center;margin-bottom:10px;user-select:all',
      }, `🆔 ${player.id}`),

      // Stats area
      h('div', { id: profId }, [
        h('p.muted.text-center.text-sm', {}, player.isBot ? '' : 'Завантаження статистики...'),
      ]),

      // Role change (mod only, non-lobby)
      roleSelector,

      // Kick button (lobby host only)
      canKick && h('button.btn.btn-blood', {
        style: 'margin-top:16px',
        onclick: async () => {
          haptic('heavy');
          try {
            await kickPlayer(code, me.id, player.id);
            closeModal();
            notify(`${player.name} вигнано з кімнати`, 'success');
          } catch (e) { notify(e.message, 'error'); }
        },
      }, '🚫 Вигнати з кімнати'),
    ]));

    // Async load stats
    if (!player.isBot) {
      getPlayerStats(player.id).then(stats => {
        const el = document.getElementById(profId);
        if (!el) return;
        el.innerHTML = '';
        if (!stats) {
          el.appendChild(h('p.muted.text-center.text-sm', {}, 'Статистика відсутня'));
          return;
        }
        el.appendChild(renderProfileStats(stats));
      }).catch(() => {});
    }
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    if (!me) {
      const nick = tgUser?.name || loadNickname();
      const id   = tgUser?.id ? String(tgUser.id) : null;
      if (nick && id) {
        me = { id, name: nick, avatar: '🎭' };
        saveMe(code, me);
      }
    }
    unsub = subscribeRoom(code, me?.id || '', onRoomUpdate, { revealRoles: isMod && getSettings().showAllRoles });
  }

  // ── Room update callback ───────────────────────────────────────────────────
  function onRoomUpdate(raw) {
    if (!raw) { showGone(); return; }
    if (raw.phase === 'cancelled') { showGone(); return; }

    if (!me && raw.myPlayerId) {
      me = { id: raw.myPlayerId, name: tgUser?.name || loadNickname() || 'Гравець', avatar: '🎭' };
      saveMe(code, me);
    }

    const norm = normalizeRoom(raw, me);
    const myRole = norm.myRole;
    announcePhase(norm, myRole);

    if (norm.phase !== prevPhase) {
      voteLocked  = false;
      killLocked  = false;
      shootLocked = false;
      healLocked  = false;
      revealDone  = false;
      prevPhase   = norm.phase;
    }

    room = norm;
    render();

    if (chatCtrl) chatCtrl.setRoom(room);

    // Firestore: host drives timers
    if (me && raw.hostId === me.id) {
      hostTick(code, me.id).catch(() => {});
      if (!hostTimerTid) {
        hostTimerTid = setInterval(() => {
          if (room && me && room.hostId === me.id) hostTick(code, me.id).catch(() => {});
        }, 5000);
      }
    }
  }

  function showGone() {
    destroyChat();
    mount(container, Shell({ title: 'Мафія', back: '/online', children: [
      h('div.card.text-center', {}, [
        h('div', { style: 'font-size:4rem;margin-bottom:16px' }, '🚪'),
        h('div.font-display.text-2xl.gold-text', {}, 'Кімнату закрито'),
        h('p.muted.mt-3', {}, 'Гра завершена або кімнату видалено.'),
        h('a.btn.btn-ghost-gold', { href: '#/online', style: 'display:inline-block;width:auto;padding:10px 24px;margin-top:20px' }, 'Назад'),
      ]),
    ] }));
  }

  // ── Router ─────────────────────────────────────────────────────────────────
  function render() {
    if (!room) return;
    const { phase } = room;
    if (phase === 'lobby')  { renderLobby();  return; }
    if (phase === 'roles')  { renderRoles();  return; }
    if (phase === 'day' || phase === 'night') { renderGame(); return; }
    if (phase === 'result') { renderResult(); return; }
  }

  // ── LOBBY ──────────────────────────────────────────────────────────────────
  function renderLobby() {
    const isHost = me && room.hostId === me.id;
    const humans = room.players.filter(p => !p.isBot);

    function shareRoom() {
      const url = `${location.href.split('#')[0]}#/online/${code}`;
      haptic('light');
      if (navigator.share) {
        navigator.share({ title: `Мафія — ${code}`, text: `Код кімнати: ${code}`, url }).catch(() => {});
      } else {
        navigator.clipboard?.writeText(url).catch(() => {});
        notify('Посилання скопійовано!', 'success');
      }
    }

    async function onKick(playerId) {
      haptic('medium');
      try { await kickPlayer(code, me.id, playerId); } catch (e) { notify(e.message, 'error'); }
    }

    async function onStart() {
      haptic('medium');
      try { await startGame(code, me.id); } catch (e) { notify(e.message, 'error'); }
    }

    function openSettings() {
      const s = {
        dayDur:   room.dayDuration  ?? 60,
        nightDur: room.nightDuration ?? 60,
        bots:     room.botCount ?? 0,
      };
      const timeOpts = [[30,'30 сек'],[60,'1 хв'],[150,'2.5 хв'],[300,'5 хв']];
      openModal(h('div', {}, [
        h('div.font-display.text-xl.gold-text.mb-4', {}, '⚙️ Налаштування кімнати'),
        h('label.label', {}, 'Таймер дня'),
        h('select.input', { onchange: e => (s.dayDur = Number(e.target.value)) },
          timeOpts.map(([v, l]) => h('option', { value: v, selected: v === s.dayDur }, l))),
        h('label.label.mt-3', {}, 'Таймер ночі'),
        h('select.input', { onchange: e => (s.nightDur = Number(e.target.value)) },
          timeOpts.map(([v, l]) => h('option', { value: v, selected: v === s.nightDur }, l))),
        h('label.label.mt-3', {}, 'Боти (AI гравці)'),
        h('select.input', { onchange: e => (s.bots = Number(e.target.value)) },
          [0,1,2,3,4,5,6].map(n => h('option', { value: n, selected: n === s.bots },
            n === 0 ? 'Без ботів' : `${n} бот${n===1?'':'и/ів'}`))),
        h('div', { style: 'display:flex;gap:10px;margin-top:16px' }, [
          h('button.btn.btn-ghost-gold', { onclick: closeModal, style: 'flex:1' }, 'Скасувати'),
          h('button.btn.btn-blood', {
            style: 'flex:1',
            onclick: async () => {
              try {
                await updateSettings(code, me.id, { dayDuration: s.dayDur, nightDuration: s.nightDur, botCount: s.bots });
                notify('Налаштування збережено', 'success');
                closeModal();
              } catch (e) { notify(e.message, 'error'); }
            },
          }, 'Зберегти'),
        ]),
      ]));
    }

    const configuredBots = room.botCount ?? 0;
    const totalWithBots  = humans.length + configuredBots;
    const canStart = totalWithBots >= 4;
    const need     = Math.max(0, 4 - totalWithBots);

    mount(container, Shell({ title: null, back: '/online', children: [
      Card([
        h('div.text-center', {}, [
          h('p.text-xs.uppercase.tracking-mega.muted.mb-2', {}, 'Код кімнати'),
          h('div.font-display.text-5xl.gold-text.mb-3', {}, code),
          h('div.row', { style: 'justify-content:center;gap:10px' }, [
            h('button.btn.btn-ghost-gold', { onclick: shareRoom, style: 'width:auto;padding:8px 16px' }, UI.lobby.inviteBtn),
            h('button.btn.btn-ghost-gold', {
              onclick: () => { haptic(); navigator.clipboard?.writeText(code).catch(() => {}); notify('Код скопійовано!', 'success'); },
              style: 'width:auto;padding:8px 16px',
            }, code),
          ]),
        ]),
      ], 'mb-4'),
      Card([
        h('p.muted.text-sm.mb-4', {}, UI.lobby.playersCount(humans.length, configuredBots) + (!canStart ? ` · ⚠️ ${UI.lobby.needMorePlayers(need)}` : '')),
        PlayersGrid(room, { meId: me?.id, hostId: room.hostId, isHost, onKick, onPlayerClick: openProfile, showRoles: isMod && getSettings().showAllRoles }),
        isHost && h('div.mt-4', {}, [
          h('button.btn.btn-ghost-gold.mb-2', { onclick: openSettings }, UI.lobby.settingsBtn),
          canStart
            ? h('button.btn.btn-blood.pulse', { onclick: onStart }, UI.lobby.startBtn)
            : h('button.btn.btn-blood', { disabled: true }, UI.lobby.needMorePlayers(need)),
        ]),
        !isHost && h('p.muted.text-center.mt-6', {}, UI.lobby.waitingForHost),
      ]),
    ] }));
  }

  // ── ROLES ──────────────────────────────────────────────────────────────────
  function renderRoles() {
    const myRole  = room.myRole;
    const myAlive = room.myAlive !== false;
    const allies  = myRole === 'mafia'
      ? room.players.filter(p => p.role === 'mafia' && p.id !== me?.id)
      : [];

    async function onReveal() {
      if (revealDone) return;
      revealDone = true;
      haptic('medium');
      try { await revealRole(code, me.id); } catch (e) { notify(e.message, 'error'); revealDone = false; }
    }

    // No back button during active game
    mount(container, Shell({ title: null, back: null, children: [
      Card([
        h('div.text-center', {}, [
          h('div', { style: 'font-size:4rem' }, ROLE_ICON[myRole] || '🎭'),
          h('h2.font-display.text-3xl.gold-text.mt-3', {}, ROLE_LABEL[myRole] || '?'),
          h('p.muted.font-serif.italic.mt-2.mb-3', {}, ROLE_DESC[myRole] || ''),
          allies.length > 0 && h('p.text-sm.accent.mb-3', {}, '🤝 Спільники: ' + allies.map(p => p.name).join(', ')),
          !revealDone && myAlive
            ? h('button.btn.btn-blood.mt-3', { onclick: onReveal }, '✓ Підтвердити роль')
            : h('p.muted.mt-3.text-sm', {}, 'Чекаємо решту гравців...'),
        ]),
      ], 'mb-4'),
      PlayersGrid(room, { meId: me?.id, onPlayerClick: openProfile, showRoles: isMod && getSettings().showAllRoles }),
    ] }));
  }

  // ── GAME (day / night) ─────────────────────────────────────────────────────
  function renderGame() {
    const phase     = room.phase;
    const myRole    = room.myRole;
    const myAlive   = room.myAlive !== false;
    const isMafia   = myRole === 'mafia';
    const isSheriff = myRole === 'sheriff';
    const isDoctor  = myRole === 'doctor';
    const aliveList = room.players.filter(p => p.alive);
    const tLeft     = timeLeft(room);

    clearInterval(timerTid);
    if (tLeft != null) {
      timerTid = setInterval(() => {
        if (timerEl) timerEl.textContent = fmtTime(timeLeft(room));
      }, 500);
    }

    // ── Night panel ──
    let nightPanel = null;
    if (phase === 'night' && myAlive) {
      if (isMafia) {
        const candidates = aliveList.filter(p => p.role !== 'mafia');
        nightPanel = Card([
          h('div.font-display.text-lg.accent.mb-3', {}, UI.game.chooseVictim),
          h('div.players-grid', {}, candidates.map(c =>
            h('button.player-tile', {
              class: killLocked ? 'dead' : '',
              onclick: async () => {
                if (killLocked) return;
                killLocked = true;
                haptic('heavy');
                try {
                  await nightKill(code, me.id, c.id);
                  notify(`Ціль: ${c.name}`, 'success');
                } catch (e) { notify(e.message, 'error'); killLocked = false; }
                render();
              },
            }, [h('div.avatar', {}, c.avatar), h('div.name', {}, c.name)])
          )),
          killLocked && h('p.muted.text-sm.text-center.mt-3', {}, UI.game.choiceMade),
        ], 'mb-3');

        const mafiaMsg = room.mafiaChat || [];
        const mafiaChatPanel = h('div.card.mt-3', {}, [
          h('div.font-display.text-sm.accent.mb-2', {}, UI.game.mafiaChat),
          h('div.chat-list', { style: 'max-height:150px;overflow-y:auto;margin-bottom:8px' },
            mafiaMsg.length
              ? mafiaMsg.map(m => h('div', { style: 'font-size:.85rem;margin-bottom:4px' }, [
                  h('span', { style: 'color:var(--gold-dim);margin-right:6px' }, m.playerName + ':'),
                  m.text,
                ]))
              : h('em', { style: 'color:var(--muted);font-size:.8rem' }, UI.game.mafiaChatQuiet)
          ),
          h('form', {
            style: 'display:flex;gap:8px',
            onsubmit: async e => {
              e.preventDefault();
              const txt = mafiaInputEl?.value?.trim();
              if (!txt) return;
              if (mafiaInputEl) mafiaInputEl.value = '';
              try { await appendMafiaChat(code, me.id, txt); } catch {}
            },
          }, [
            h('input.chat-input', { ref: el => (mafiaInputEl = el), placeholder: UI.game.mafiaChatHint, maxlength: 200 }),
            h('button.chat-send', { type: 'submit' }, '↑'),
          ]),
        ]);
        nightPanel = h('div', {}, [nightPanel, mafiaChatPanel]);

      } else if (isDoctor) {
        const candidates = aliveList;
        nightPanel = Card([
          h('div.font-display.text-lg.accent.mb-3', {}, '🩺 Кого лікувати?'),
          h('p.muted.text-sm.mb-3', {}, 'Оберіть гравця для захисту від мафії цієї ночі.'),
          h('div.players-grid', {}, candidates.map(c =>
            h('button.player-tile', {
              class: healLocked ? 'dead' : '',
              onclick: async () => {
                if (healLocked) return;
                healLocked = true;
                haptic('heavy');
                try {
                  await nightHeal(code, me.id, c.id);
                  notify(`Лікуєте ${c.name}`, 'success');
                } catch (e) { notify(e.message, 'error'); healLocked = false; }
                render();
              },
            }, [h('div.avatar', {}, c.avatar), h('div.name', {}, c.name)])
          )),
          healLocked && h('p.muted.text-sm.text-center.mt-3', {}, UI.game.choiceMade),
          !healLocked && h('button.btn.btn-ghost-gold.mt-3', {
            onclick: async () => {
              if (healLocked) return;
              healLocked = true;
              try { await nightSkip(code, me.id); notify('Не лікуєте нікого', 'info'); }
              catch (e) { notify(e.message, 'error'); healLocked = false; }
              render();
            },
          }, 'Пропустити'),
        ], 'mb-3');

      } else if (isSheriff) {
        const candidates = aliveList.filter(p => p.id !== me?.id);
        const inv = room.myInvestigation;
        nightPanel = Card([
          h('div.font-display.text-lg.accent.mb-2', {}, '🔍 Шериф: нічна дія'),
          inv && h('div.card', { style: 'background:rgba(255,210,80,.07);margin-bottom:12px;padding:10px 14px;border-radius:10px' }, [
            h('p.text-sm.mb-1', {}, `Результат перевірки: ${inv.targetName}`),
            h('p.font-display', { style: `color:${inv.isMafia ? 'var(--blood-lit)' : 'var(--green,#4caf50)'}` },
              inv.isMafia ? '🔴 Мафія!' : '🟢 Мирний'),
          ]),
          !shootLocked && h('div', {}, [
            h('p.muted.text-sm.mb-2', {}, '🔍 Перевірити гравця (безпечно — дізнаєтесь чи мафія)'),
            h('div.players-grid', {}, candidates.map(c =>
              h('button.player-tile', {
                onclick: async () => {
                  if (shootLocked) return;
                  shootLocked = true;
                  haptic('medium');
                  try {
                    await nightInvestigate(code, me.id, c.id);
                    notify(`Перевірено: ${c.name}`, 'success');
                  } catch (e) { notify(e.message, 'error'); shootLocked = false; }
                  render();
                },
              }, [h('div.avatar', {}, c.avatar), h('div.name', {}, c.name)])
            )),
            h('p.muted.text-sm.mt-4.mb-2', {}, '🔫 Вистрілити (ризиковано — якщо промах, гинете!)'),
            h('div.players-grid', {}, candidates.map(c =>
              h('button.player-tile', {
                style: 'border-color:var(--blood-lit,#c0392b)',
                onclick: async () => {
                  if (shootLocked) return;
                  shootLocked = true;
                  haptic('heavy');
                  try {
                    await sheriffShoot(code, me.id, c.id);
                    notify(`Постріл у ${c.name}!`, 'success');
                  } catch (e) { notify(e.message, 'error'); shootLocked = false; }
                  render();
                },
              }, [h('div.avatar', {}, c.avatar), h('div.name', {}, c.name)])
            )),
            h('button.btn.btn-ghost-gold.mt-3', {
              onclick: async () => {
                if (shootLocked) return;
                shootLocked = true;
                try { await nightSkip(code, me.id); notify('Пропускаєте нічну дію', 'info'); }
                catch (e) { notify(e.message, 'error'); shootLocked = false; }
                render();
              },
            }, 'Пропустити ніч'),
          ]),
          shootLocked && h('p.muted.text-sm.text-center.mt-3', {}, UI.game.choiceMade),
        ], 'mb-3');

      } else {
        nightPanel = Card([
          h('div.text-center.py-4', {}, [
            h('div', { style: 'font-size:2.5rem;margin-bottom:12px' }, UI.game.nightWaiting),
            h('p.font-display.gold-text', {}, UI.game.nightTitle),
            h('p.muted.text-sm.mt-2', {}, UI.game.nightSubtitle),
          ]),
        ], 'mb-3');
      }
    }

    // ── Day vote panel ──
    let votePanel = null;
    if (phase === 'day' && myAlive) {
      if (room.hasVoted || voteLocked) {
        votePanel = Card([h('p.muted.text-center.py-4', {}, UI.game.yourVoteCounted)], 'mb-3');
      } else {
        const candidates = aliveList.filter(p => p.id !== me?.id);
        votePanel = Card([
          h('div.font-display.text-lg.accent.mb-3', {}, UI.game.voting),
          h('div.players-grid', {}, candidates.map(c =>
            h('button.player-tile', {
              onclick: async () => {
                if (voteLocked) return;
                voteLocked = true;
                haptic('medium');
                try {
                  await castVote(code, me.id, c.id);
                  notify(`Голос за ${c.name}`, 'success');
                } catch (e) { notify(e.message, 'error'); voteLocked = false; }
                render();
              },
            }, [h('div.avatar', {}, c.avatar), h('div.name', {}, c.name)])
          )),
          h('button.btn.btn-ghost-gold.mt-3', {
            onclick: async () => {
              if (voteLocked) return;
              voteLocked = true;
              try { await castVote(code, me.id, null); notify('Утримались', 'info'); }
              catch (e) { notify(e.message, 'error'); voteLocked = false; }
              render();
            },
          }, UI.game.abstain),
        ], 'mb-3');
      }
    }

    // ── Vote counts display (day) ──
    let voteCountsPanel = null;
    if (phase === 'day' && room.votes && Object.keys(room.votes).length > 0) {
      const sorted = Object.entries(room.votes).sort((a, b) => b[1] - a[1]);
      const getPlayer = id => room.players.find(p => String(p.id) === String(id));
      voteCountsPanel = Card([
        h('div.text-xs.uppercase.tracking-mega.muted.mb-2', {}, UI.game.voteCounts),
        h('div', {}, sorted.map(([pid, cnt]) => {
          const p = getPlayer(pid);
          return h('div', { style: 'display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)' }, [
            h('span', {}, p ? `${p.avatar} ${p.name}` : pid),
            h('span.accent', {}, String(cnt)),
          ]);
        })),
      ], 'mb-3');
    }

    // No back button; show "Здатися" instead
    mount(container, Shell({ title: null, back: null, surrender: onSurrender, children: [
      h('div.row.space-between.mb-4', {}, [
        h('div', {}, [
          h('p.text-xs.muted.uppercase.tracking-mega', {}, phase === 'night' ? UI.game.nightLabel(room.day) : UI.game.dayLabel(room.day)),
          myAlive
            ? h('p.font-display.text-xl', {}, `${ROLE_ICON[myRole] || '?'} ${ROLE_LABEL[myRole] || '?'}`)
            : h('p.muted', {}, UI.game.youEliminated),
        ]),
        h('div.text-right', {}, [
          h('p.text-xs.muted', {}, `Кімната ${code}`),
          h('p.text-xs.muted', {}, `Живих: ${aliveList.length}`),
          tLeft != null && h('p.font-display.gold-text', { ref: el => (timerEl = el) }, fmtTime(tLeft)),
        ]),
      ]),
      !myAlive && Card([
        h('div.text-center.py-3', {}, [h('div', { style: 'font-size:2rem;margin-bottom:8px' }, '👁️'), h('p.muted', {}, UI.game.watching)]),
      ], 'mb-3'),
      nightPanel,
      votePanel,
      voteCountsPanel,
      PlayersGrid(room, { meId: me?.id, hostId: room.hostId, onPlayerClick: openProfile, showRoles: isMod && getSettings().showAllRoles }),
      GameLog(room),
    ] }));

    // Mount chat once per game session
    if (!chatCtrl) {
      chatCtrl = createChat({ code, me });
      chatCtrl.setRoom(room);
      chatCtrl.mount(document.body);
    } else {
      chatCtrl.setRoom(room);
    }
  }

  // ── RESULT ─────────────────────────────────────────────────────────────────
  function renderResult() {
    // Remove chat widget — user is back to "browsable" state
    destroyChat();

    // Record personal stats once
    if (!statsRecorded && me && !me.isBot) {
      statsRecorded = true;
      const myRole  = room.myRole;
      const myTeam  = myRole === 'mafia' ? 'mafia' : 'town';
      const won     = room.winner === myTeam;
      const klog    = room.killLog || [];
      const myKills        = klog.filter(k => k.killer === me.id && k.kind === 'mafiaKill').length;
      const mySheriffKills = klog.filter(k => k.killer === me.id && k.kind === 'sheriffKill').length;
      const mySuccessVotes = klog.filter(k => k.voter  === me.id && k.kind === 'successfulVote').length;
      recordMyStats(me.id, {
        nickname: me.name,
        photoUrl: tgUser?.avatar || '',
        won, role: myRole,
        mafiaKills:     myKills,
        sheriffKills:   mySheriffKills,
        successfulVotes: mySuccessVotes,
      }).catch(() => {});
    }

    const myRole   = room.myRole;
    const myTeam   = myRole === 'mafia' ? 'mafia' : 'town';
    const won      = room.winner === myTeam;

    mount(container, Shell({ title: 'Фінал', back: '/online', children: [
      h('div.text-center.mb-6', {}, [
        h('div', { style: 'font-size:4rem;margin-bottom:16px' }, won ? UI.result.winIcon : UI.result.loseIcon),
        h('h1.font-display.text-5xl.gold-text.mb-2', {}, won ? UI.result.winTitle : UI.result.loseTitle),
        h('p.muted.font-serif.italic.mb-2', {}, room.winner === 'mafia' ? UI.result.mafiaWin : UI.result.civWin),
      ]),
      Card([
        h('div', {}, room.players.map(p =>
          h('div', { style: 'display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)' }, [
            h('div.avatar', { style: 'font-size:1.4rem' }, p.avatar),
            h('div', {}, [
              h('div', {}, p.name + (p.isBot ? ' 🤖' : '')),
              h('div.text-xs.accent', {}, `${ROLE_ICON[p.role] || '?'} ${ROLE_LABEL[p.role] || p.role}`),
            ]),
            !p.alive && h('div.dead-label', { style: 'margin-left:auto' }, '💀'),
          ])
        )),
      ], 'mb-4'),
      GameLog(room),
    ] }));
  }

  // ── Join modal ─────────────────────────────────────────────────────────────
  function showJoinModal() {
    let inputEl;
    openModal(h('div', {}, [
      h('div.font-display.text-xl.gold-text.mb-4', {}, `Приєднатись до ${code}`),
      h('label.label', {}, "Ваше ім'я"),
      h('input.input', { ref: el => (inputEl = el), placeholder: 'Дон Корлеоне', maxlength: 32 }),
      h('button.btn.btn-blood.mt-4', {
        onclick: async () => {
          const n = inputEl?.value?.trim();
          if (!n) { notify("Введіть ім'я", 'error'); return; }
          haptic('medium');
          try {
            const r = await joinRoom(code, n);
            me = { id: r.playerId, name: n, avatar: '🎭' };
            saveMe(code, me);
            saveNickname(n);
            closeModal();
            if (unsub) unsub();
            unsub = subscribeRoom(code, me.id, onRoomUpdate);
          } catch (e) {
            notify(e.message || 'Помилка приєднання', 'error');
          }
        },
      }, 'Приєднатись'),
    ]), { dismissable: false });
  }

  // ── Start ──────────────────────────────────────────────────────────────────
  async function start() {
    if (!me) {
      const nick = tgUser?.name || loadNickname();
      if (!nick) { showJoinModal(); return; }
      try {
        const r = await joinRoom(code, nick);
        me = { id: r.playerId, name: nick, avatar: '🎭' };
        saveMe(code, me);
        saveNickname(nick);
      } catch (e) {
        if (e.message?.includes('почалась')) { showGone(); return; }
        showJoinModal();
        return;
      }
    }
    init();
  }

  start();

  return () => {
    if (typeof unsub === 'function') unsub();
    clearInterval(timerTid);
    clearInterval(hostTimerTid);
    destroyChat();
  };
}
