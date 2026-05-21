import { h } from '../lib/dom.js';

/**
 * Shell — page wrapper with header bar.
 *
 * Props:
 *   title      — header centre text (null = spacer)
 *   back       — href for back link  (null = hide back)
 *   surrender  — function called on "Здатися" (hides back, shows surrender btn)
 *   bg         — CSS class for background
 *   children   — page content
 */
export function Shell({ title, back = '/', bg = 'bg-noir', children, surrender = null }) {
  let leftBtn;
  if (surrender) {
    leftBtn = h('button.back-link', {
      onclick: surrender,
      style: 'color:var(--blood-lit,#c0392b);background:none;border:none;cursor:pointer;font:inherit;padding:0',
    }, '🏳 Здатися');
  } else if (back != null) {
    leftBtn = h('a.back-link', { href: '#' + back }, '← Назад');
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
