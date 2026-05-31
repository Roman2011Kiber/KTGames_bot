import { h, mount } from '../lib/dom.js';
import { Card } from '../components/shell.js';
import { getLeaderboard, editPlayerStats, USE_STATS } from '../lib/stats.js';
import { openModal, closeModal } from '../components/modal.js';
import { isModerator } from '../lib/moderator.js';
import { getTelegramUser } from '../lib/telegram.js';
import { notify } from '../lib/notify.js';
import { t, getLang } from '../lib/i18n.js';

function pct(part, total) {
  if (!total) return '—';
  return Math.round(part / total * 100) + '%';
}

function openEditModal(p, onSaved) {
  let winsEl, lossesEl, mkillsEl, skillsEl, savesEl;
  openModal(h('div', {}, [
    h('div.font-display.text-xl.gold-text.mb-3', {}, `✏️ ${p.nickname || t('stats.editPlayer')}`),
    h('p.muted', { style: 'font-size:.7rem;font-family:monospace;margin-bottom:12px' }, `ID: ${p._id}`),

    h('label.label', {}, t('stats.editWins')),
    h('input.input', { ref: e => (winsEl = e), type: 'number', value: p.wins || 0, min: 0 }),

    h('label.label.mt-2', {}, t('stats.editLosses')),
    h('input.input', { ref: e => (lossesEl = e), type: 'number', value: p.losses || 0, min: 0 }),

    h('label.label.mt-2', {}, t('stats.editMKills')),
    h('input.input', { ref: e => (mkillsEl = e), type: 'number', value: p.mafiaKills || 0, min: 0 }),

    h('label.label.mt-2', {}, t('stats.editSKills')),
    h('input.input', { ref: e => (skillsEl = e), type: 'number', value: p.sheriffKills || 0, min: 0 }),

    h('label.label.mt-2', {}, t('stats.editSaves')),
    h('input.input', { ref: e => (savesEl = e), type: 'number', value: p.doctorSaves || 0, min: 0 }),

    h('div', { style: 'display:flex;gap:10px;margin-top:16px' }, [
      h('button.btn.btn-ghost-gold', { onclick: closeModal, style: 'flex:1' }, t('stats.editCancel')),
      h('button.btn.btn-blood', {
        style: 'flex:1',
        onclick: async () => {
          try {
            const wins   = Math.max(0, Number(winsEl?.value   || 0));
            const losses = Math.max(0, Number(lossesEl?.value || 0));
            await editPlayerStats(p._id, {
              wins,
              losses,
              gamesPlayed:  wins + losses,
              mafiaKills:   Math.max(0, Number(mkillsEl?.value || 0)),
              sheriffKills: Math.max(0, Number(skillsEl?.value || 0)),
              doctorSaves:  Math.max(0, Number(savesEl?.value  || 0)),
            });
            notify(t('stats.editSaved'), 'success');
            closeModal();
            onSaved();
          } catch (e) { notify(e?.message || t('stats.editError'), 'error'); }
        },
      }, t('stats.editSave')),
    ]),
  ]));
}

function PlayerRow({ p, rank, isMod, tab, onSaved }) {
  const medal  = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
  const kills  = (p.mafiaKills || 0) + (p.sheriffKills || 0);
  const saves  = p.doctorSaves || 0;
  const games  = p.gamesPlayed || 0;
  const wins   = p.wins || 0;

  const [primaryVal, primaryLabel, barColor] =
    tab === 'killers' ? [kills, t('stats.col.kills'), '#c0392b'] :
    tab === 'doctors' ? [saves, t('stats.col.saves'), '#27ae60'] :
    /* general */       [wins,  t('stats.col.wins'),  'var(--gold,#d4af37)'];

  const wr = pct(wins, games);
  const subLine = `🎮 ${games} ${t('stats.col.games')} · 🏆 ${wr}`;

  return Card([
    h('div', { style: 'display:flex;align-items:center;gap:10px' }, [
      h('div', { style: 'font-size:1.1rem;width:30px;text-align:center;flex-shrink:0;font-weight:700;color:var(--muted)' },
        medal || String(rank)),

      p.photoUrl
        ? h('img', { src: p.photoUrl, style: 'width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid var(--gold,#d4af37)' })
        : h('div', { style: 'font-size:36px;flex-shrink:0' }, '🎭'),

      h('div', { style: 'flex:1;min-width:0' }, [
        h('div', { style: 'font-weight:600;font-size:.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' },
          p.nickname || t('stats.editPlayer')),
        isMod && h('div', { style: 'font-family:monospace;font-size:.6rem;color:var(--muted);margin-bottom:2px' }, p._id),
        h('div', { style: 'font-size:.72rem;color:var(--muted);margin-top:2px' }, subLine),
      ]),

      h('div', { style: 'text-align:right;flex-shrink:0' }, [
        h('div.font-display', { style: `font-size:1.3rem;line-height:1;color:${barColor}` }, String(primaryVal)),
        h('div.muted', { style: 'font-size:.65rem' }, primaryLabel),
      ]),

      isMod && h('button.btn.btn-ghost-gold', {
        style: 'width:auto;padding:5px 8px;font-size:.75rem;flex-shrink:0',
        onclick: e => { e.stopPropagation(); openEditModal(p, onSaved); },
      }, '✏️'),
    ]),
  ], 'mb-2');
}

export async function StatsPage(container) {
  const tgUser = getTelegramUser();
  const isMod  = isModerator(tgUser?.id);
  let activeTab = 'general';
  let allData   = null;

  async function loadData() {
    if (!USE_STATS) return [];
    try { return await getLeaderboard(); }
    catch { return []; }
  }

  function getTabs() {
    return [
      { id: 'general', label: t('stats.tab.general') },
      { id: 'killers', label: t('stats.tab.killers') },
      { id: 'doctors', label: t('stats.tab.doctors') },
    ];
  }

  function getTabData(tab, data) {
    const sorted =
      tab === 'killers' ? [...data].sort((a, b) => ((b.mafiaKills||0)+(b.sheriffKills||0)) - ((a.mafiaKills||0)+(a.sheriffKills||0))) :
      tab === 'doctors' ? [...data].sort((a, b) => (b.doctorSaves||0) - (a.doctorSaves||0)) :
      [...data].sort((a, b) => (b.wins||0) - (a.wins||0));
    return sorted.slice(0, 50);
  }

  // Back label
  function backLabel() {
    const l = getLang();
    return l === 'en' ? '← Back' : '← Назад';
  }

  let listEl; // reference to scrollable list container

  function render(data) {
    const tabData = getTabData(activeTab, data || []);
    const tabs    = getTabs();

    // ── List body ──────────────────────────────────────────────────────────
    const listBody = [
      data === null && h('div.text-center', { style: 'padding:60px 0' }, [
        h('div', { style: 'font-size:2.5rem;margin-bottom:12px' }, '⏳'),
        h('p.muted', {}, t('stats.loading')),
      ]),

      !USE_STATS && Card([
        h('div.text-center', { style: 'padding:24px 0' }, [
          h('div', { style: 'font-size:2.5rem;margin-bottom:10px' }, '⚙️'),
          h('p.muted', {}, t('stats.noFirestore')),
        ]),
      ]),

      USE_STATS && data !== null && tabData.length === 0 && Card([
        h('div.text-center', { style: 'padding:32px 0' }, [
          h('div', { style: 'font-size:2.5rem;margin-bottom:10px' }, '🎭'),
          h('p.muted', {},
            activeTab === 'doctors' ? t('stats.empty.doctors') :
            activeTab === 'killers' ? t('stats.empty.killers') :
            t('stats.empty.general')
          ),
        ]),
      ]),

      USE_STATS && data !== null && tabData.length > 0 && h('div', {},
        tabData.map((p, i) => PlayerRow({
          p, rank: i + 1, isMod, tab: activeTab,
          onSaved: () => loadData().then(d => { allData = d; render(d); }),
        }))
      ),
    ].filter(Boolean);

    // ── Full page layout — fixed height so only list scrolls ───────────────
    mount(container,
      h('div.bg-noir.grain.vignette', {
        style: 'height:100dvh;display:flex;flex-direction:column;overflow:hidden',
      }, [
        // inner shell — respects max-width, fills height
        h('div', {
          style: [
            'max-width:480px;width:100%;margin:0 auto;',
            'display:flex;flex-direction:column;height:100%;',
            'padding:16px 16px 0;position:relative;z-index:1;',
          ].join(''),
        }, [

          // ── Header bar (back + title) — never scrolls ──────────────────
          h('header.header-bar', { style: 'flex-shrink:0' }, [
            h('a.back-link', { href: '#/' }, backLabel()),
            h('span.header-title', {}, t('stats.pageTitle')),
            h('span.spacer-10', {}),
          ]),

          // ── Trophy + title + tabs — never scrolls ──────────────────────
          h('div', { style: 'flex-shrink:0' }, [
            h('div.text-center.mb-4', {}, [
              h('div', { style: 'font-size:2.2rem' }, '🏆'),
              h('h1.font-display.text-3xl.gold-text', {}, t('stats.title')),
            ]),

            h('div', {
              style: [
                'display:flex;gap:6px;margin-bottom:14px;',
                'background:rgba(255,255,255,.05);border-radius:12px;padding:4px;',
              ].join(''),
            }, tabs.map(tab =>
              h('button', {
                style: [
                  'flex:1;border:none;cursor:pointer;border-radius:9px;',
                  'padding:8px 4px;font-size:.8rem;font-weight:600;transition:all .2s;',
                  activeTab === tab.id
                    ? 'background:var(--gold,#d4af37);color:#1a0a00;'
                    : 'background:transparent;color:var(--muted);',
                ].join(''),
                onclick: () => {
                  if (activeTab === tab.id) return;
                  activeTab = tab.id;
                  if (listEl) listEl.scrollTop = 0;
                  render(allData);
                },
              }, tab.label)
            )),
          ]),

          // ── Scrollable player list ─────────────────────────────────────
          h('div', {
            ref: el => (listEl = el),
            style: [
              'flex:1;overflow-y:auto;',
              'padding-bottom:env(safe-area-inset-bottom,24px);',
              '-webkit-overflow-scrolling:touch;',
            ].join(''),
          }, listBody),

        ]),
      ])
    );
  }

  render(null);

  if (USE_STATS) {
    allData = await loadData();
    render(allData);
  }
}
