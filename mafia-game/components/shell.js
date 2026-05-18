import { h } from '../lib/dom.js';

export function Shell({ title, back = '/', bg = 'bg-noir', children }) {
  return h('div.' + bg + '.grain.vignette', { style: 'min-height:100vh' }, [
    h('div.shell', {}, [
      h('header.header-bar', {}, [
        h('a.back-link', { href: '#' + back }, '← Назад'),
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
