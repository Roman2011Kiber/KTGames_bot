import { h, clear } from '../lib/dom.js';

const root = () => document.getElementById('modal-root');

export function openModal(content, { dismissable = true } = {}) {
  const r = root();
  const backdrop = h('div.modal-backdrop', {
    onclick: e => { if (dismissable && e.target === backdrop) closeModal(); },
  }, h('div.modal-card', { onclick: e => e.stopPropagation() }, content));
  clear(r); r.appendChild(backdrop);
  return closeModal;
}

export function closeModal() { clear(root()); }
