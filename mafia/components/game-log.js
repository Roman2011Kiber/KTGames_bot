import { h } from "../lib/dom.js";
import { Card } from "./shell.js";

export function GameLog(g) {
  let listEl;
  const card = Card([
    h("div.text-xs.uppercase.tracking-mega.muted.mb-3", null, "Хроніка"),
    h("div.log-list", { ref: (el) => (listEl = el) },
      g.log.map((l) => h("div.log-row." + (l.kind || "info"), null, [
        h("span.log-day", null, "D" + (l.day ?? 0)),
        l.text,
      ])),
    ),
  ], { extraClass: "mt-6" });
  // прокрутка вниз після монтування
  setTimeout(() => { if (listEl) listEl.scrollTop = listEl.scrollHeight; }, 0);
  return card;
}
