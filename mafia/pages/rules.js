import { h, mount } from "../lib/dom.js";
import { Shell, Card } from "../components/shell.js";
import { ROLE_DESC, ROLE_ICON, ROLE_LABEL } from "../lib/game.js";

export function RulesPage(container) {
  const roles = ["mafia", "doctor", "sheriff", "civilian"];
  const node = Shell({
    title: "Правила",
    bg: "bg-noir",
    children: [
      h("h1.font-display.text-4xl.gold-text.mb-2", null, "Як грати"),
      h("p.muted.font-serif.italic.mb-6", null, "Класична Мафія, просто та глибоко."),

      h("div.stack-4", null, [
        Card([
          h("div.font-display.text-lg.accent.mb-2", null, "🌙 Ніч"),
          h("p.text-sm.muted", null,
            "Місто засинає. Мафія обирає жертву. Лікар намагається врятувати когось, а Шериф перевіряє підозрюваного — чи він мафія.",
          ),
        ]),
        Card([
          h("div.font-display.text-lg.accent.mb-2", null, "🌅 День"),
          h("p.text-sm.muted", null,
            "Ви бачите, хто загинув уночі. Місто обговорює та голосує — кого вигнати. Той, хто отримав найбільше голосів, покидає гру.",
          ),
        ]),
        Card([
          h("div.font-display.text-lg.accent.mb-2", null, "🏆 Перемога"),
          h("p.text-sm.muted", null, [
            "Мирні перемагають, коли всю мафію вигнано. Мафія перемагає, коли її стає не менше за мирних.",
          ]),
        ]),

        h("h2.font-display.text-2xl.mt-8.mb-3", null, "Ролі"),
        ...roles.map((r) => Card([
          h("div.row.gap-3", { style: { alignItems: "flex-start" } }, [
            h("span.text-3xl", null, ROLE_ICON[r]),
            h("div", null, [
              h("div.font-display.text-lg", null, ROLE_LABEL[r]),
              h("div.text-sm.muted.mt-1", null, ROLE_DESC[r]),
            ]),
          ]),
        ])),
      ]),
    ],
  });
  mount(container, node);
}
