import { h } from '../lib/dom.js';
import { loadLastGame } from '../lib/storage.js';

export function HomePage() {
  const last = loadLastGame();
  return h('div.home', {}, [
    h('div.home-hero', {}, [
      h('p.home-eyebrow', {}, 'Темна сторона міста'),
      h('h1.home-title.gold-text', {}, 'МАФІЯ'),
      h('p.home-tagline', {}, 'Місто засинає. Прокидається мафія.'),
    ]),
    h('div.home-list', {}, [
      h('a.home-card.primary', { href: '#/new' }, [
        h('div', {}, [h('div.title', {}, 'Нова партія'), h('div.sub', {}, 'Проти ботів — від 4 до 20 гравців')]),
        h('span.icon', {}, '🎭'),
      ]),
      h('a.home-card', { href: '#/online' }, [
        h('div', {}, [h('div.title', {}, 'Онлайн-кімната'), h('div.sub', {}, 'Грайте з друзями та ботами за кодом')]),
        h('span.icon', {}, '🕯️'),
      ]),
      last && last.phase !== 'ended' && h('a.home-card', { href: '#/game' }, [
        h('div', {}, [h('div.sub', {}, 'Продовжити партію')]),
        h('span.accent', {}, `Ніч ${last.day || 1} →`),
      ]),
      h('a.home-card', { href: '#/rules' }, [
        h('div', {}, [h('div.sub', {}, 'Як грати')]),
        h('span.muted', {}, 'Правила та ролі →'),
      ]),
    ]),
    h('div.home-footer', {}, '«Місто не пробачає тих, хто мовчить.»'),
  ]);
}
