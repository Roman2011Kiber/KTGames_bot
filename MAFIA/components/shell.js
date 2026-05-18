import { h } from "../lib/dom.js";

export function Shell({ title, back, children, bg }) {
  const wrap = h("div" + (bg ? "." + bg : "") + ".grain.vignette", {
    style: { minHeight: "100vh" },
  }, [
    h("div.shell", null, [
      h("header.header-bar", null, [
        h("a.back-link", { href: "#" + (back || "/") }, "← Назад"),
        title ? h("span.header-title", null, title) : h("span.spacer-10"),
        h("span.spacer-10"),
      ]),
      ...(Array.isArray(children) ? children : [children]),
    ]),
  ]);
  return wrap;
}

export function Card(children, opts) {
  return h("div.card" + (opts?.extraClass ? "." + opts.extraClass : ""), null, children);
}
