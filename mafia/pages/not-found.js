import { h, mount } from "../lib/dom.js";
import { Shell } from "../components/shell.js";

export function NotFoundPage(container) {
  const node = Shell({
    title: "404", bg: "bg-noir",
    children: [
      h("div.card.text-center", null, [
        h("div.font-display.text-3xl.gold-text", null, "Загублено в провулку"),
        h("p.muted.font-serif.italic.mt-3", null, "Цієї сторінки немає на мапі міста."),
        h("a.btn.btn-ghost-gold.mt-4", { href: "#/", style: { display: "inline-block", width: "auto", padding: "10px 24px" } }, "На головну"),
      ]),
    ],
  });
  mount(container, node);
}
