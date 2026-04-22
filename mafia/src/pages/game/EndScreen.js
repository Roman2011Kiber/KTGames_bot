import { useLocation } from "wouter";
import { Card } from "@/components/layout/Shell";
import { ROLE_ICON } from "@/components/game/RoleBadge";
import { ROLE_LABEL, findById } from "@/lib/game";
import { clearLastGame } from "@/lib/storage";

export function EndScreen({ g }) {
  const [, setLoc] = useLocation();
  const human = findById(g, g.humanId);
  const won =
    (g.winner === "mafia" && human.role === "mafia") ||
    (g.winner === "town" && human.role !== "mafia");
  return (
    <Card className="text-center">
      <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Фінал</div>
      <h2 className={`mt-3 font-display text-5xl ${won ? "gold-text" : "blood-text"}`}>
        {won ? "ПЕРЕМОГА" : "ПОРАЗКА"}
      </h2>
      <p className="mt-3 text-muted-foreground font-serif italic">
        {g.winner === "town"
          ? "Місто очистилось від мафії."
          : "Мафія перемогла. Місто впало в темряву."}
      </p>
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2">
        {g.players.map((p) => (
          <div
            key={p.id}
            className={`p-2 rounded-md border text-center text-xs ${
              p.role === "mafia"
                ? "border-destructive/50 bg-destructive/5"
                : "border-border bg-card/40"
            }`}
          >
            <div className="text-2xl">{p.avatar}</div>
            <div className="truncate mt-1">{p.name}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {ROLE_ICON[p.role]} {ROLE_LABEL[p.role]}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex gap-2">
        <button
          onClick={() => { clearLastGame(); setLoc("/new"); }}
          className="flex-1 py-3 rounded-md bg-gradient-to-b from-[hsl(0_70%_42%)] to-[hsl(0_70%_28%)] text-white font-display tracking-[0.2em]"
        >
          Нова партія
        </button>
        <button
          onClick={() => { clearLastGame(); setLoc("/"); }}
          className="flex-1 py-3 rounded-md border border-gold text-accent"
        >
          В меню
        </button>
      </div>
    </Card>
  );
}
