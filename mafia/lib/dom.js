// Маленькі помічники для роботи з DOM без жодних бібліотек.
// h("div.card", { onclick: fn }, [child1, child2, "текст"])
// Підтримує: tag.class, tag#id, або tag з окремим className у props.

export function h(spec, props, children) {
  // Розбираємо "div.card.foo#main" → tag="div", classes=["card","foo"], id="main"
  let tag = spec, id = null;
  const classes = [];
  if (spec.includes("#")) {
    const [t, rest] = spec.split("#");
    tag = t; id = rest;
  }
  if (tag.includes(".")) {
    const parts = tag.split(".");
    tag = parts[0];
    for (let i = 1; i < parts.length; i++) classes.push(parts[i]);
  }
  if (id?.includes(".")) {
    const parts = id.split(".");
    id = parts[0];
    for (let i = 1; i < parts.length; i++) classes.push(parts[i]);
  }
  const el = document.createElement(tag || "div");
  if (id) el.id = id;
  for (const c of classes) el.classList.add(c);

  const p = props || {};
  for (const [k, v] of Object.entries(p)) {
    if (v == null || v === false) continue;
    if (k === "class" || k === "className") {
      String(v).split(/\s+/).filter(Boolean).forEach((c) => el.classList.add(c));
    } else if (k === "style" && typeof v === "object") {
      Object.assign(el.style, v);
    } else if (k === "dataset" && typeof v === "object") {
      for (const [dk, dv] of Object.entries(v)) el.dataset[dk] = dv;
    } else if (k.startsWith("on") && typeof v === "function") {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === "html") {
      el.innerHTML = v;
    } else if (k === "ref" && typeof v === "function") {
      v(el);
    } else if (k in el && k !== "list") {
      try { el[k] = v; } catch { el.setAttribute(k, v); }
    } else {
      el.setAttribute(k, v);
    }
  }

  appendChildren(el, children);
  return el;
}

function appendChildren(parent, children) {
  if (children == null || children === false) return;
  if (Array.isArray(children)) {
    for (const c of children) appendChildren(parent, c);
    return;
  }
  if (children instanceof Node) { parent.appendChild(children); return; }
  parent.appendChild(document.createTextNode(String(children)));
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function mount(container, node) {
  clear(container);
  container.appendChild(node);
}

export function $(sel, root) { return (root || document).querySelector(sel); }
