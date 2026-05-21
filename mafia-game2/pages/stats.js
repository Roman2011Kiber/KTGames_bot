import { h, mount } from '../lib/dom.js';
import { Shell, Card } from '../components/shell.js';
import { getLeaderboard, editPlayerStats, USE_STATS } from '../lib/stats.js';
import { openModal, closeModal } from '../components/modal.js';
import { isModerator } from '../lib/moderator.js';
import { getTelegramUser } from '../lib/telegram.js';
import { notify } from '../lib/notify.js';
import { ROLE_LABEL, ROLE_ICON } from '../lib/phrases.js';

function statPill(icon, label, value) {
  return h('span', { style: 'margin-right:10px;font-size:.78rem;color:var(--muted)' }, `${icon} ${label}: ${value}`);
}

function topRole(gamesAsRole) {
  if (!gamesAsRole) return '';
  let top = null, max = 0;
  for (const [r, n] of Object.entries(gamesAsRole)) {
    if (n > max) { max = n; top = r; }
  }
  return top ? `${ROLE_ICON[top] || '?'} ${ROLE_LABEL[top] || top}` : '';
}

function openEditModal(p, onSaved) {
  let winsEl, lossesEl, mkillsEl, skillsEl;
  openModal(h('div', {}, [
    h('div.font-display.text-xl.gold-text.mb-4', {}, `✏️ Редагувати: ${p.nickname || 'Гравець'}`),
    h('p.muted.text-xs.mb-3', {}, `ID: ${p._id}`),
    h('label.label', {}, 'Перемоги'),
    h('input.input', { ref: e => (winsEl = e), type: 'number', value: p.wins || 0, min: 0 }),
    h('label.label.mt-2', {}, 'Поразки'),
    h('input.input', { ref: e => (lossesEl = e), type: 'number', value: p.losses || 0, min: 0 }),
    h('label.label.mt-2', {}, 'Вбивства (мафія)'),
    h('input.input', { ref: e => (mkillsEl = e), type: 'number', value: p.mafiaKills || 0, min: 0 }),
    h('label.label.mt-2', {}, 'Вбивства (шериф)'),
    h('input.input', { ref: e => (skillsEl = e), type: 'number', value: p.sheriffKills || 0, min: 0 }),
    h('div', { style: 'display:flex;gap:10px;margin-top:16px' }, [
      h('button.btn.btn-ghost-gold', { onclick: closeModal, style: 'flex:1' }, 'Скасувати'),
      h('button.btn.btn-blood', {
        style: 'flex:1',
        onclick: async () => {
          try {
            await editPlayerStats(p._id, {
              wins:        Math.max(0, Number(winsEl?.value   || 0)),
              losses:      Math.max(0, Number(lossesEl?.value || 0)),
              mafiaKills:  Math.max(0, Number(mkillsEl?.value || 0)),
              sheriffKills:Math.max(0, Number(skillsEl?.value || 0)),
              gamesPlayed: Math.max(0, Number(winsEl?.value || 0) + Number(lossesEl?.value || 0)),
            });
            notify('Статистику оновлено', 'success');
            closeModal();
            onSaved();
          } catch (e) { notify(e?.message || 'Помилка', 'error'); }
        },
      }, 'Зберегти'),
    ]),
  ]));
}

export async function StatsPage(container) {
  const tgUser = getTelegramUser();
  const isMod  = isModerator(tgUser?.id);

  async function loadAndRender() {
    mount(container, Shell({ title: 'Рейтинг', back: '/', children: [
      h('div.text-center', { style: 'padding:60px 0' }, [
        h('div', { style: 'font-size:3rem;margin-bottom:12px' }, '🏆'),
        h('p.muted', {}, 'Завантаження рейтингу...'),
      ]),
    ] }));

    if (!USE_STATS) {
      mount(container, Shell({ title: 'Рейтинг', back: '/', children: [
        Card([
          h('div.text-center', { style: 'padding:32px 0' }, [
            h('div', { style: 'font-size:3rem;margin-bottom:12px' }, '⚙️'),
            h('p.muted', {}, 'Рейтинг доступний лише у Firestore-режимі.'),
            h('p.muted.text-sm.mt-2', {}, 'Вкажіть firebaseConfig у lib/config.js'),
          ]),
        ]),
      ] }));
      return;
    }

    try {
      const leaders = await getLeaderboard();

      mount(container, Shell({ title: 'Рейтинг', back: '/', children: [
        h('div.text-center.mb-5', {}, [
          h('div', { style: 'font-size:2.5rem;margin-bottom:6px' }, '🏆'),
          h('h1.font-display.text-3xl.gold-text', {}, 'Топ гравців'),
          h('p.muted.text-sm', {}, 'Лише онлайн-ігри через Telegram'),
        ]),

        leaders.length === 0
          ? Card([
              h('div.text-center', { style: 'padding:32px 0' }, [
                h('div', { style: 'font-size:3rem;margin-bottom:12px' }, '🎭'),
                h('p.muted', {}, 'Рейтинг ще порожній. Зіграйте першу онлайн-гру!'),
              ]),
            ])
          : h('div', {}, leaders.map((p, i) => {
              const wr    = p.gamesPlayed > 0 ? Math.round((p.wins || 0) / p.gamesPlayed * 100) : 0;
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
              const kills = (p.mafiaKills || 0) + (p.sheriffKills || 0);
              return Card([
                h('div', { style: 'display:flex;align-items:center;gap:12px' }, [
                  h('div.font-display', { style: 'font-size:1.4rem;width:36px;text-align:center;flex-shrink:0' }, medal),
                  p.photoUrl
                    ? h('img', { src: p.photoUrl, style: 'width:48px;height:48px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid var(--gold,#d4af37)' })
                    : h('div', { style: 'font-size:40px;flex-shrink:0' }, '🎭'),
                  h('div', { style: 'flex:1;min-width:0' }, [
                    h('div.font-display', { style: 'font-size:.95rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, p.nickname || 'Гравець'),
                    isMod && h('div', { style: 'font-family:monospace;font-size:.65rem;color:var(--muted);margin-bottom:2px' }, `🆔 ${p._id}`),
                    h('div', { style: 'margin-top:3px;display:flex;flex-wrap:wrap;gap:2px' }, [
                      statPill('🎮', 'Ігор', p.gamesPlayed || 0),
                      kills > 0 && statPill('💀', 'Вбивств', kills),
                      topRole(p.gamesAsRole) && statPill('🎭', 'Роль', topRole(p.gamesAsRole)),
                    ]),
                  ]),
                  h('div', { style: 'text-align:right;flex-shrink:0' }, [
                    h('div.font-display.gold-text', { style: 'font-size:1.25rem' }, String(p.wins || 0)),
                    h('div.muted', { style: 'font-size:.68rem' }, 'перемог'),
                    h('div.muted', { style: 'font-size:.68rem' }, `${wr}% WR`),
                  ]),
                  // Mod edit button
                  isMod && h('button.btn.btn-ghost-gold', {
                    style: 'width:auto;padding:6px 10px;font-size:.8rem;flex-shrink:0;margin-left:4px',
                    onclick: e => { e.stopPropagation(); openEditModal(p, loadAndRender); },
                  }, '✏️'),
                ]),
              ], 'mb-2');
            })),
      ] }));
    } catch (e) {
      mount(container, Shell({ title: 'Рейтинг', back: '/', children: [
        Card([
          h('div.text-center', { style: 'padding:32px 0' }, [
            h('div', { style: 'font-size:3rem;margin-bottom:12px' }, '❌'),
            h('p.muted', {}, 'Помилка завантаження рейтингу.'),
            h('p.muted.text-sm.mt-1', {}, e?.message || ''),
          ]),
        ]),
      ] }));
    }
  }

  loadAndRender();
}
