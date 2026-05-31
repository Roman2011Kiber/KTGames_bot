import { h, mount } from '../lib/dom.js';
import { Shell, Card } from '../components/shell.js';
import { loadLastGame, saveLastGame, clearLastGame } from '../lib/storage.js';
import { ROLES, ROLE_LABEL, ROLE_ICON, ROLE_DESC, roleTeam } from '../lib/game.js';
import {
  alive, aliveTeam, byId, winner, addLog, fillBotNightActions,
  resolveNight, resolveVotes, botVote, humanNightActors, humanVoters,
} from '../lib/game.js';
import { PlayersGrid } from '../components/players-grid.js';
import { GameLog } from '../components/game-log.js';
import { openModal, closeModal } from '../components/modal.js';
import { notify } from '../lib/notify.js';
import { haptic } from '../lib/telegram.js';
import { navigate } from '../lib/router.js';
import { speak } from '../lib/sound.js';
import { t } from '../lib/i18n.js';

let _timers = [];
function addTimer(id) { _timers.push(id); }
function clearTimers() { _timers.forEach(clearTimeout); _timers = []; }

// ── Phase announcements ───────────────────────────────────────────────────────
function announcePhase(next, prev) {
  if (next.phase === prev) return;

  if (next.phase === 'night-mafia') {
    speak([t('solo.speech.night1', { day: next.day }), t('solo.speech.night2')].join(' '), { rate: 0.85, pitch: 0.9 });

  } else if (next.phase === 'day-discussion') {
    const day    = next.day > 0 ? next.day - 1 : 0;
    const deaths = (next.log || []).filter(l => l.kind === 'death' && l.day === day);
    const saved  = (next.log || []).filter(l => l.kind === 'save'  && l.day === day);

    if (deaths.length) {
      const names = deaths
        .map(l => l.text.replace(/[^\wа-яіїєґА-ЯІЇЄҐ ,.'!]/gu, '').trim())
        .join('. ');
      speak(`${t('solo.speech.dawn')} ${names}`, { rate: 0.85 });
    } else if (saved.length) {
      speak(t('solo.speech.saved'), { rate: 0.87 });
    } else {
      speak(t('solo.speech.peace'), { rate: 0.87 });
    }

  } else if (next.phase === 'day-vote') {
    speak(t('solo.speech.dayVote'), { rate: 0.88 });

  } else if (next.phase === 'ended') {
    if (next.winner === 'town')
      speak(t('solo.speech.civWin'), { rate: 0.85, pitch: 1.0 });
    else
      speak(t('solo.speech.mafiaWin'), { rate: 0.82, pitch: 0.88 });
  }
}

export function SoloGamePage(container) {
  let g = loadLastGame();
  if (!g) { notify(t('solo.noGame'), 'error'); navigate('/new'); return; }

  function update(next) {
    const prevPhase = g.phase;
    g = next; saveLastGame(g);
    announcePhase(g, prevPhase);
    if (g.winner) return endScreen();
    render();
    runBots();
  }

  function runBots() {
    clearTimers();
    if (g.phase === 'day-discussion' || g.phase === 'role-reveal') return;
    if (g.phase === 'night-mafia') {
      addTimer(setTimeout(() => {
        const human = alive(g).find(p => p.id === g.humanId);
        if (human && ROLES[human.role]?.nightAction) return;
        update(resolveNight(g, fillBotNightActions(g)));
      }, 1200));
    }
    if (g.phase === 'day-vote') {
      addTimer(setTimeout(() => {
        const human = alive(g).find(p => p.id === g.humanId);
        if (human) return;
        const votes = {};
        alive(g).filter(p => p.isBot).forEach(p => { const v = botVote(g, p); if (v) votes[p.id] = v; });
        update(resolveVotes(g, votes));
      }, 1200));
    }
  }

  function humanNightAction(targetId, action) {
    const target = alive(g).find(p => p.id === targetId);
    if (target) {
      if (action === 'heal')
        speak(t('solo.speech.heal', { name: target.name }), { rate: 0.87 });
      else if (action === 'kill')
        speak(t('solo.speech.kill'), { rate: 0.85, pitch: 0.9 });
      else if (action === 'investigate')
        speak(t('solo.speech.investigate', { name: target.name }), { rate: 0.87 });
      else if (action === 'sheriffKill')
        speak(t('solo.speech.shoot'), { rate: 0.85, pitch: 0.9 });
    }
    const next = resolveNight(g, fillBotNightActions(g, { [g.humanId]: { action, target: targetId } }));
    if (action === 'investigate' && target) {
      const inv = (next.night?.investigations || []).find(i => i.sheriffId === g.humanId);
      if (inv) setTimeout(() => {
        if (inv.isMafia)
          speak(t('solo.speech.isMafia', { name: inv.targetName }), { rate: 0.85, pitch: 0.9 });
        else
          speak(t('solo.speech.isClear', { name: inv.targetName }), { rate: 0.87 });
      }, 1400);
    }
    update(next);
  }

  function humanVote(targetId) {
    const botVotes = {};
    alive(g).filter(p => p.isBot).forEach(p => { const v = botVote(g, p); if (v) botVotes[p.id] = v; });
    update(resolveVotes(g, { ...botVotes, [g.humanId]: targetId }));
  }

  // ── End screen ─────────────────────────────────────────────────────────────
  function endScreen() {
    haptic('medium');
    const w = g.winner;
    const human = g.players.find(p => p.id === g.humanId);
    const won = roleTeam(human?.role) === w;
    mount(container, Shell({ title: t('solo.final.title'), back: '/', children: [
      h('div.text-center', {}, [
        h('div.text-6xl.mb-4', {}, won ? '🏆' : '💀'),
        h('h1.font-display.text-5xl.mb-2.gold-text', {}, won ? t('ui.result.winTitle') : t('ui.result.loseTitle')),
        h('p.muted.font-serif.italic.mb-6', {}, w === 'town' ? t('solo.final.civWin') : t('solo.final.mafiaWin')),
        h('div.players-grid.mt-4', {}, g.players.map(p =>
          h('div.player-tile', {}, [
            h('div.avatar', {}, p.avatar), h('div.name', {}, p.name),
            h('div.text-xs.accent', {}, `${ROLE_ICON[p.role]} ${ROLE_LABEL[p.role]}`),
          ])
        )),
        h('div.row.gap-3.mt-6', {}, [
          h('button.btn.btn-ghost-gold', { onclick: () => { clearLastGame(); navigate('/new'); } }, t('solo.final.newGame')),
          h('button.btn.btn-blood', { onclick: () => navigate('/') }, t('solo.final.home')),
        ]),
      ]),
    ] }));
  }

  // ── Main render ────────────────────────────────────────────────────────────
  function render() {
    if (g.winner) { endScreen(); return; }

    const human = byId(g, g.humanId);
    const isAlive = human?.alive;
    const myRole = human?.role;
    const def = ROLES[myRole];
    const actionDone = !!g.actions?.[g.humanId];

    // Night action panel
    let nightPanel = null;
    if (g.phase === 'night-mafia' && isAlive && def?.nightAction) {
      const isSheriff = myRole === 'sheriff';
      const candidates = alive(g).filter(p => def.canTargetSelf ? true : p.id !== g.humanId);

      function renderPanel(action) {
        openModal(h('div', {}, [
          h('div.font-display.text-xl.mb-4', {}, action === 'sheriffKill' ? t('solo.sheriff.shoot') : t('solo.sheriff.investigate')),
          h('div.players-grid', {}, candidates.map(c =>
            h('button.player-tile', { onclick: () => { closeModal(); humanNightAction(c.id, action); } },
              [h('div.avatar', {}, c.avatar), h('div.name', {}, c.name)])
          )),
        ]));
      }

      nightPanel = Card([
        h('div.font-display.text-lg.accent.mb-3', {}, t('solo.nightAction')),
        isSheriff && !actionDone && h('div.row.gap-3.mb-3', {}, [
          h('button.btn.btn-ghost-gold', { onclick: () => renderPanel('investigate'), style: 'flex:1' }, t('solo.sheriff.investigate')),
          h('button.btn.btn-blood',      { onclick: () => renderPanel('sheriffKill'), style: 'flex:1' }, t('solo.sheriff.shoot')),
        ]),
        !isSheriff && !actionDone && h('div', {}, [
          h('p.muted.text-sm.mb-2', {}, myRole === 'mafia' ? t('solo.mafia.choose') : myRole === 'doctor' ? t('solo.doctor.choose') : t('solo.choose')),
          h('div.players-grid', {}, candidates.map(c =>
            h('button.player-tile', { onclick: () => { haptic(); humanNightAction(c.id, def.nightAction); } },
              [h('div.avatar', {}, c.avatar), h('div.name', {}, c.name)])
          )),
        ]),
        actionDone && h('p.muted.text-center.py-4', {}, t('solo.actionDone')),
      ]);
    }

    // Vote panel
    let votePanel = null;
    if (g.phase === 'day-vote' && isAlive) {
      const candidates = alive(g).filter(p => p.id !== g.humanId);
      votePanel = Card([
        h('div.font-display.text-lg.accent.mb-3', {}, t('solo.vote.title')),
        h('p.muted.text-sm.mb-3', {}, t('solo.vote.whom')),
        h('div.players-grid', {}, candidates.map(c =>
          h('button.player-tile', { onclick: () => { haptic(); humanVote(c.id); } },
            [h('div.avatar', {}, c.avatar), h('div.name', {}, c.name)])
        )),
        h('button.btn.btn-ghost-gold.mt-3', { onclick: () => humanVote(null) }, t('solo.vote.abstain')),
      ]);
    }

    const investigationNote = g.night?.investigations?.find(i => i.sheriffId === g.humanId);

    mount(container, Shell({ title: null, back: '/', children: [
      h('div.row.space-between.mb-4', {}, [
        h('div', {}, [
          h('p.text-xs.muted.uppercase.tracking-mega', {}, `${t('solo.phase', { n: g.day, phase: g.phase })}`),
          h('p.font-display.text-xl', {}, isAlive ? `${ROLE_ICON[myRole]} ${ROLE_LABEL[myRole]}` : t('ui.game.youEliminated')),
        ]),
        h('div.text-right', {}, [
          h('p.text-xs.muted', {}, t('solo.alive', { n: alive(g).length })),
          h('p.text-xs.muted', {}, t('solo.mafia', { n: aliveTeam(g, 'mafia').length })),
        ]),
      ]),

      // Role reveal
      g.phase === 'role-reveal' && Card([
        h('div.text-center', {}, [
          h('div.text-6xl', {}, ROLE_ICON[myRole]),
          h('h2.font-display.text-3xl.gold-text.mt-3', {}, ROLE_LABEL[myRole] || ''),
          h('p.muted.font-serif.italic.mt-2.mb-4', {}, ROLE_DESC[myRole] || ''),
          myRole === 'mafia' && h('p.text-sm.accent', {}, t('solo.allies', { names: alive(g).filter(p => p.role === 'mafia' && p.id !== g.humanId).map(p => p.name).join(', ') })),
          h('button.btn.btn-blood.mt-4', { onclick: () => {
            update({ ...g, phase: 'night-mafia', phaseStartedAt: Date.now(),
              log: addLog(g.log, { day: 0, kind: 'info', text: t('solo.night0') }) });
          } }, t('solo.startNight')),
        ]),
      ]),

      // Day discussion
      g.phase === 'day-discussion' && Card([
        h('div.font-display.text-xl.accent.mb-3', {}, t('solo.discussion')),
        investigationNote && h('div.investigation-note.mb-3', {}, investigationNote.isMafia
          ? `🔍 ${t('solo.discussion.mafia', { name: investigationNote.targetName })}`
          : `🔍 ${t('solo.discussion.clean', { name: investigationNote.targetName })}`),
        PlayersGrid(g, { meId: g.humanId }),
        h('button.btn.btn-blood.mt-4', { onclick: () => update({ ...g, phase: 'day-vote', phaseStartedAt: Date.now() }) }, t('solo.discussion.vote')),
      ]),

      nightPanel,
      votePanel,
      !isAlive && g.phase !== 'role-reveal' && Card([h('p.text-center.muted.font-serif.italic', {}, t('solo.eliminated'))]),
      PlayersGrid(g, { meId: g.humanId }),
      GameLog(g),
    ] }));
  }

  render();
  runBots();
  return () => clearTimers();
}
