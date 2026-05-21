import { h, mount } from '../lib/dom.js';
import { Shell, Card } from '../components/shell.js';
import { getSettings, saveSetting } from '../lib/settings.js';
import { isModerator } from '../lib/moderator.js';
import { getTelegramUser } from '../lib/telegram.js';
import { isSoundOn, toggleSound } from '../lib/sound.js';
import { notify } from '../lib/notify.js';
import { ROLE_LABEL } from '../lib/phrases.js';

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
  const isMod  = isModerator(tgUser?.id);

  function render() {
    const s = getSettings();

    mount(container, Shell({ title: 'Налаштування', back: '/', children: [

      // ── For everyone ──────────────────────────────────────────────────────
      h('div.text-xs.uppercase.tracking-mega.muted.mb-2', {}, 'Загальні'),
      Card([
        Row('🔊', 'Звук', 'Озвучка ігрових подій та фаз', Toggle(isSoundOn(), v => {
          toggleSound();
          render();
        })),
      ], 'mb-3'),

      // ── Account info ──────────────────────────────────────────────────────
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
              notify('ID скопійовано!', 'success');
            },
          }, 'Копіювати'),
        ]),
      ], 'mb-3'),

      !tgUser && Card([
        h('p.muted.text-sm.text-center.py-2', {}, '⚠️ Відкрийте через Telegram для повного доступу'),
      ], 'mb-3'),

      // ── Moderator section ─────────────────────────────────────────────────
      isMod && h('div', {}, [
        h('div.text-xs.uppercase.tracking-mega.muted.mb-2.mt-4', {}, '⚡ Модераторські'),
        Card([
          Row(
            '👁️', 'Показати ролі на дошці',
            'Бачити ролі всіх гравців під час гри (лише для вас)',
            Toggle(s.showAllRoles, v => { saveSetting('showAllRoles', v); render(); })
          ),
        ], 'mb-2'),
        h('p.muted', { style: 'font-size:.75rem;text-align:center;margin-bottom:16px' },
          '⚡ Ви маєте права модератора'),
      ]),

      isMod && Card([
        h('div.font-display.gold-text.mb-3', {}, '📖 Можливості модератора'),
        ...[
          '👁️ Бачити ролі всіх гравців (якщо включено вище)',
          '🆔 Бачити TG ID гравців у профілі',
          '🎭 Змінювати ролі гравців під час гри',
          '✏️ Редагувати статистику в рейтингу',
        ].map(t => h('div', { style: 'display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;font-size:.85rem;color:var(--muted)' }, t)),
      ], 'mb-3'),

    ] }));
  }

  render();
}
