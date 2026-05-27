import { h, mount } from '../lib/dom.js';
import { Shell, Card } from '../components/shell.js';
import { getLeaderboard, editPlayerStats, USE_STATS } from '../lib/stats.js';
import { openModal, closeModal } from '../components/modal.js';
import { isModerator } from '../lib/moderator.js';
import { getTelegramUser } from '../lib/telegram.js';
import { notify } from '../lib/notify.js';
import { t } from '../lib/i18n.js';

function pct(part, total) {
  if (!total) return '—';
  return Math.round(part / total * 100) + '%';
}

function Bar(value, max, color) {
  const pctW = max > 0 ? Math.round(value / max * 100) : 0;
  return h('div', {
    style: `height:4px;border-radius:2px;background:rgba(255,255,255,.08);margin-top:4px;overflow:hidden`,
  }, h('div', { style: `width:${pctW}%;height:100%;background:${color};border-radius:2px;transition:width .3s` }));
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

function PlayerRow({ p, rank, isMod, tab, maxVal, onSaved }) {
  const medal  = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
  const kills  = (p.mafiaKills || 0) + (p.sheriffKills || 0);
  const saves  = p.doctorSaves || 0;
  const games  = p.gamesPlayed || 0;
  const wins   = p.wins || 0;
  const losses = p.losses || 0;

  const [primaryVal, primaryLabel, barColor] =
    tab === 'killers' ? [kills, t('stats.col.kills'), '#c0392b'] :
    tab === 'doctors' ? [saves, t('stats.col.saves'), '#27ae60'] :
    /* general */       [wins,  t('stats.col.wins'),  'var(--gold,#d4af37)'];

  const subLine =
    tab === 'killers' ? `🎮 ${games} ${t('stats.col.games')} · 🏆 ${pct(wins, games)}` :
    tab === 'doctors' ? `🎮 ${games} ${t('stats.col.games')} · 🏆 ${pct(wins, games)}` :
    `${pct(wins, games)} WR · ${losses} ${t('stats.losses')}`;

  return Card([
    h('div', { style: 'display:flex;align-items:center;gap:10px' }, [
      h('div', { style: 'font-size:1.1rem;width:30px;text-align:center;flex-shrink:0;font-weight:700;color:var(--muted)' },
        medal || String(rank)),

      p.photoUrl
        ? h('img', { src: p.photoUrl, style: 'width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid var(--gold,#d4af37)' })
        : h('div', { style: 'font-size:36px;flex-shrink:0' }, '🎭'),

      h('div', { style: 'flex:1;min-width:0' }, [
        h('div', {
          style: 'font-weight:600;font-size:.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap',
        }, p.nickname || t('stats.editPlayer')),
        isMod && h('div', { style: 'font-family:monospace;font-size:.6rem;color:var(--muted);margin-bottom:2px' }, p._id),
        h('div', { style: 'font-size:.72rem;color:var(--muted);margin-top:2px' }, subLine),
        Bar(primaryVal, maxVal, barColor),
      ]),

      h('div', { style: 'text-align:right;flex-shrink:0' }, [
        h('div.font-display.gold-text', { style: 'font-size:1.3rem;line-height:1' }, String(primaryVal)),
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
      tab === 'killers' ? [...data].sort((a, b) => ((b.mafiaKills || 0) + (b.sheriffKills || 0)) - ((a.mafiaKills || 0) + (a.sheriffKills || 0))) :
      tab === 'doctors' ? [...data].sort((a, b) => (b.doctorSaves || 0) - (a.doctorSaves || 0)) :
      [...data].sort((a, b) => (b.wins || 0) - (a.wins || 0));
    return sorted.slice(0, 50);
  }

  function getMaxVal(tab, data) {
    if (!data.length) return 1;
    if (tab === 'killers') return Math.max(1, ...data.map(p => (p.mafiaKills || 0) + (p.sheriffKills || 0)));
    if (tab === 'doctors') return Math.max(1, ...data.map(p => p.doctorSaves || 0));
    return Math.max(1, ...data.map(p => p.wins || 0));
  }

  function render(data) {
    const tabData = getTabData(activeTab, data || []);
    const maxVal  = getMaxVal(activeTab, tabData);
    const tabs    = getTabs();

    mount(container, Shell({ title: t('stats.pageTitle'), back: '/', children: [

      h('div.text-center.mb-4', {}, [
        h('div', { style: 'font-size:2.2rem' }, '🏆'),
        h('h1.font-display.text-3xl.gold-text', {}, t('stats.title')),
      ]),

      h('div', {
        style: 'display:flex;gap:6px;margin-bottom:16px;background:rgba(255,255,255,.05);border-radius:12px;padding:4px',
      }, tabs.map(tab =>
        h('button', {
          style: [
            'flex:1;border:none;cursor:pointer;border-radius:9px;padding:8px 4px;font-size:.8rem;font-weight:600;transition:all .2s;',
            activeTab === tab.id
              ? 'background:var(--gold,#d4af37);color:#1a0a00;'
              : 'background:transparent;color:var(--muted);',
          ].join(''),
          onclick: () => { activeTab = tab.id; render(allData); },
        }, tab.label)
      )),

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
          p, rank: i + 1, isMod, tab: activeTab, maxVal,
          onSaved: () => loadData().then(d => { allData = d; render(d); }),
        }))
      ),

    ] }));
  }

  render(null);

  if (USE_STATS) {
    allData = await loadData();
    render(allData);
  }
}
