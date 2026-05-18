import { h, clear } from "../lib/dom.js";
import { subscribeNotify } from "../lib/notify.js";

export function mountNotifier() {
  const root = document.getElementById("notifier-root");
  if (!root) return;
  subscribeNotify((items) => {
    clear(root);
    if (!items.length) return;
    const wrap = h("div.notifier", null, items.map((i) =>
      h("div.toast." + i.kind, { dataset: { id: i.id } }, i.text),
    ));
    root.appendChild(wrap);
  });
}
