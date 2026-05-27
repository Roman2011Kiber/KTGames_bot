import { h } from '../lib/dom.js';
import { getLang } from '../lib/i18n.js';

/**
 * Shell — page wrapper with header bar.
 *
 * Props:
 *   title      — header centre text (null = spacer)
 *   back       — href for back link  (null = hide back)
 *   surrender  — function called on surrender button
 *   bg         — CSS class for background
 *   children   — page content
 */
export function Shell({ title, back = '/', bg = 'bg-noir', children, surrender = null }) {
  let leftBtn;
  if (surrender) {
    leftBtn = h('button.back-link', {
      onclick: surrender,
      style: 'color:var(--blood-lit,#c0392b);background:none;border:none;cursor:pointer;font:inherit;padding:0',
    }, getLang() === 'en' ? '🏳 Surrender' : getLang() === 'ru' ? '🏳 Сдаться' : '🏳 Здатися');
  } else if (back != null) {
    leftBtn = h('a.back-link', { href: '#' + back },
      getLang() === 'en' ? '← Back' : '← Назад');
  } else {
    leftBtn = h('span.spacer-10', {});
  }

  return h('div.' + bg + '.grain.vignette', { style: 'min-height:100vh' }, [
    h('div.shell', {}, [
      h('header.header-bar', {}, [
        leftBtn,
        title ? h('span.header-title', {}, title) : h('span.spacer-10', {}),
        h('span.spacer-10', {}),
      ]),
      ...children,
    ]),
  ]);
}

export function Card(children, extraClass = '') {
  return h('div.card' + (extraClass ? '.' + extraClass : ''), {}, children);
}
