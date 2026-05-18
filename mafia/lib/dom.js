/**
 * Мінімальний DOM-хелпер.
 * h('div.card#my-id', { onclick: fn }, [child1, 'text', child2])
 */
export function h(spec, props, children) {
  let tag = spec, id = null;
  const cls = [];

  if (spec.includes('#')) {
    const i = spec.indexOf('#');
    tag = spec.slice(0, i);
    const rest = spec.slice(i + 1);
    const dotI = rest.indexOf('.');
    if (dotI === -1) { id = rest; }
    else { id = rest.slice(0, dotI); cls.push(...rest.slice(dotI + 1).split('.')); }
  }
  if (tag.includes('.')) {
    const parts = tag.split('.');
    tag = parts[0];
    cls.push(...parts.slice(1));
  }

  const el = document.createElement(tag || 'div');
  if (id) el.id = id;
  cls.filter(Boolean).forEach(c => el.classList.add(c));

  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class' || k === 'className') {
      String(v).split(/\s+/).filter(Boolean).forEach(c => el.classList.add(c));
    } else if (k === 'style' && typeof v === 'object') {
      Object.assign(el.style, v);
    } else if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'ref' && typeof v === 'function') {
      v(el);
    } else if (k in el && k !== 'list') {
      try { el[k] = v; } catch { el.setAttribute(k, String(v)); }
    } else {
      el.setAttribute(k, String(v));
    }
  }

  appendChildren(el, children);
  return el;
}

function appendChildren(parent, children) {
  if (children == null || children === false) return;
  if (Array.isArray(children)) { children.forEach(c => appendChildren(parent, c)); return; }
  if (children instanceof Node) { parent.appendChild(children); return; }
  parent.appendChild(document.createTextNode(String(children)));
}

export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
export function mount(container, node) { clear(container); container.appendChild(node); }
