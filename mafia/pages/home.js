import { h } from "../lib/dom.js";
import { loadLastGame } from "../lib/storage.js";

export function HomePage() {
  const last = loadLastGame();
  return h("div.home", null, [
    h("div.home-hero", null, [
      h("p.home-eyebrow", null, "Темна сторона міста"),
      h("h1.home-title.gold-text", null, "МАФІЯ"),
      h("p.home-tagline", null, "Місто засинає. Прокидається мафія."),
    ]),
    h("div.home-list", null, [
      h("a.home-card.primary", { href: "#/new" }, [
        h("div", null, [
          h("div.title", null, "Нова партія"),
          h("div.sub", null, "Грайте проти ботів — від 4 до 20 гравців"),
        ]),
        h("span.icon", null, "🎭"),
      ]),
      h("a.home-card", { href: "#/online" }, [
        h("div", null, [
          h("div.title", null, "Онлайн-кімната"),
          h("div.sub", null, "Створіть код і запросіть друзів"),
        ]),
        h("span.icon", null, "🕯️"),
      ]),
      last && last.phase !== "ended" && h("a.home-card", { href: "#/game" }, [
        h("div", null, [
          h("div.sub", null, "Продовжити партію"),
        ]),
        h("span.accent", null, `Ніч ${last.day || 1} →`),
      ]),
      h("a.home-card", { href: "#/rules" }, [
        h("div", null, [
          h("div.sub", null, "Як грати"),
        ]),
        h("span.muted", null, "Правила та ролі →"),
      ]),
    ]),
    h("div.home-footer", null, "«Місто не пробачає тих, хто мовчить.»"),
  ]);
}
