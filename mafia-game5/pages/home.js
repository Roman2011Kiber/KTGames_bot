import { h } from '../lib/dom.js';
import { loadLastGame } from '../lib/storage.js';
import { t } from '../lib/i18n.js';

export function HomePage() {
  const last = loadLastGame();
  return h('div.home', {}, [
    h('div.home-hero', {}, [
      h('p.home-eyebrow', {}, t('home.eyebrow')),
      h('h1.home-title.gold-text', {}, t('home.title')),
      h('p.home-tagline', {}, t('home.tagline')),
    ]),

    h('div.home-list', {}, [
      h('a.home-card.primary', { href: '#/new' }, [
        h('div', {}, [
          h('div.title', {}, t('home.newGame')),
          h('div.sub',   {}, t('home.newGameSub')),
        ]),
        h('span.icon', {}, '🎭'),
      ]),

      h('a.home-card', { href: '#/online' }, [
        h('div', {}, [
          h('div.title', {}, t('home.online')),
          h('div.sub',   {}, t('home.onlineSub')),
        ]),
        h('span.icon', {}, '🕯️'),
      ]),

      last && last.phase !== 'ended' && h('a.home-card', { href: '#/game' }, [
        h('div', {}, [h('div.sub', {}, t('home.continue'))]),
        h('span.accent', {}, t('home.nightOf', { n: last.day || 1 })),
      ]),

      h('a.home-card', { href: '#/stats' }, [
        h('div', {}, [
          h('div.title', {}, t('home.stats')),
          h('div.sub',   {}, t('home.statsSub')),
        ]),
        h('span.icon', {}, '🏆'),
      ]),

      h('a.home-card', { href: '#/rules' }, [
        h('div', {}, [h('div.sub', {}, t('home.rulesSub'))]),
        h('span.muted', {}, t('home.rules') + ' →'),
      ]),

      h('a.home-card', { href: '#/settings' }, [
        h('div', {}, [h('div.sub', {}, t('home.settings'))]),
        h('span.muted', {}, '⚙️'),
      ]),
    ]),

    h('div.home-footer', {}, t('home.footer')),
  ]);
}
