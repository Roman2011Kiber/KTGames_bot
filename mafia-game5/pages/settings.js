import { h, mount } from '../lib/dom.js';
import { Shell, Card } from '../components/shell.js';
import { getSettings, saveSetting } from '../lib/settings.js';
import { isModerator, isLocalMod, addLocalMod, removeLocalMod } from '../lib/moderator.js';
import { getTelegramUser } from '../lib/telegram.js';
import { isSoundOn, toggleSound } from '../lib/sound.js';
import { notify } from '../lib/notify.js';
import { getLang, setLang, dispatchLangChange, t } from '../lib/i18n.js';

const LANG_OPTIONS = [
  { code: 'uk', label: '🇺🇦 Українська' },
  { code: 'en', label: '🇬🇧 English'    },
  { code: 'ru', label: '🇷🇺 Русский'    },
];

function Toggle(on, onChange) {
  return h('button', {
    style: [
      'width:46px;height:26px;border-radius:13px;border:none;cursor:pointer;',
      `background:${on ? 'var(--gold,#d4af37)' : 'rgba(255,255,255,.15)'};`,
      'position:relative;transition:background .2s;flex-shrink:0;padding:0;',
    ].join(''),
    onclick: () => onChange(!on),
  }, h('span', {
    style: [
      'position:absolute;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;',
      `left:${on ? '23px' : '3px'};transition:left .2s;display:block;`,
    ].join(''),
  }));
}

function Row(icon, label, desc, control) {
  return h('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 0' }, [
    h('div', { style: 'flex:1;min-width:0' }, [
      h('div', { style: 'font-weight:600;font-size:.95rem' }, `${icon} ${label}`),
      desc && h('div.muted', { style: 'font-size:.78rem;margin-top:2px' }, desc),
    ]),
    control,
  ]);
}

export function SettingsPage(container) {
  const tgUser = getTelegramUser();

  function render() {
    const s      = getSettings();
    const cur    = getLang();
    const isMod  = isModerator(tgUser?.id);
    const isLMod = tgUser ? isLocalMod(tgUser.id) : false;

    mount(container, Shell({ title: t('settings.title'), back: '/', children: [

      // ── General ───────────────────────────────────────────────────────────
      h('div.text-xs.uppercase.tracking-mega.muted.mb-2', {}, t('settings.general')),
      Card([
        Row('🔊', t('settings.sound'), t('settings.soundDesc'), Toggle(isSoundOn(), () => {
          toggleSound();
          render();
        })),
      ], 'mb-3'),

      // ── Language ──────────────────────────────────────────────────────────
      Card([
        h('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 0 10px' }, [
          h('div', { style: 'flex:1' }, [
            h('div', { style: 'font-weight:600;font-size:.95rem' }, `🌐 ${t('settings.language')}`),
            h('div.muted', { style: 'font-size:.78rem;margin-top:2px' }, t('settings.langDesc')),
          ]),
        ]),
        h('div', { style: 'display:flex;gap:6px' },
          LANG_OPTIONS.map(opt =>
            h('button', {
              onclick: () => {
                if (cur === opt.code) return;
                setLang(opt.code);
                dispatchLangChange();
              },
              style: [
                'flex:1;border-radius:10px;padding:9px 4px;font-size:.8rem;font-weight:600;',
                'cursor:pointer;transition:all .2s;border:1px solid ',
                cur === opt.code
                  ? 'var(--gold,#d4af37);background:var(--gold,#d4af37);color:#1a0a00;'
                  : 'rgba(255,255,255,.15);background:rgba(255,255,255,.05);color:var(--muted);',
              ].join(''),
            }, opt.label)
          )
        ),
      ], 'mb-3'),

      // ── Account ───────────────────────────────────────────────────────────
      tgUser && Card([
        h('div', { style: 'display:flex;align-items:center;gap:12px' }, [
          tgUser.avatar
            ? h('img', { src: tgUser.avatar, style: 'width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0' })
            : h('div', { style: 'font-size:36px;flex-shrink:0' }, '🎭'),
          h('div', { style: 'flex:1;min-width:0' }, [
            h('div', { style: 'font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, tgUser.name),
            h('div.muted', { style: 'font-size:.78rem;font-family:monospace' }, `ID: ${tgUser.id}`),
          ]),
          h('button.btn.btn-ghost-gold', {
            style: 'width:auto;padding:6px 12px;font-size:.8rem',
            onclick: () => {
              navigator.clipboard?.writeText(tgUser.id).catch(() => {});
              notify(t('settings.copied'), 'success');
            },
          }, t('settings.copyId')),
        ]),

        // ── Moderator self-registration ──────────────────────────────────
        h('div', { style: 'margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.08)' }, [
          Row(
            '⚡', t('settings.modSelf'), t('settings.modSelfDesc'),
            Toggle(isLMod, v => {
              if (v) {
                addLocalMod(tgUser.id);
                notify(t('settings.modSelfOn'), 'success');
              } else {
                removeLocalMod(tgUser.id);
                notify(t('settings.modSelfOff'), 'info');
              }
              render();
            })
          ),
        ]),
      ], 'mb-3'),

      !tgUser && Card([
        h('p.muted.text-sm.text-center.py-2', {}, t('settings.noTg')),
      ], 'mb-3'),

      // ── Moderator options (visible when isMod) ────────────────────────────
      isMod && h('div', {}, [
        h('div.text-xs.uppercase.tracking-mega.muted.mb-2.mt-4', {}, t('settings.modSection')),
        Card([
          Row(
            '👁️', t('settings.showRoles'), t('settings.showRolesDesc'),
            Toggle(s.showAllRoles, v => { saveSetting('showAllRoles', v); render(); })
          ),
        ], 'mb-2'),
        h('p.muted', { style: 'font-size:.75rem;text-align:center;margin-bottom:8px' },
          t('settings.modBadge')),
      ]),

      isMod && Card([
        h('div.font-display.gold-text.mb-3', {}, t('settings.modTitle')),
        ...[t('settings.modFeat1'), t('settings.modFeat2'), t('settings.modFeat3'), t('settings.modFeat4')]
          .map(line => h('div', { style: 'display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;font-size:.85rem;color:var(--muted)' }, line)),
      ], 'mb-3'),

    ] }));
  }

  render();
}
