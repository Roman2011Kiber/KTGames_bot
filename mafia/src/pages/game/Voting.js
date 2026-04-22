import { useMemo, useState } from "react";
import { Card } from "@/components/layout/Shell";
import { aiDayVote, alivePlayers, findById, resolveVotes } from "@/lib/game";
import { haptic, hapticNotify } from "@/lib/telegram";

export function Voting({ g, update }) {
  const human = findById(g, g.humanId);
  const [pick, setPick] = useState();
  const [submitted, setSubmitted] = useState(false);
  const aliveExceptSelf = useMemo(
    () => alivePlayers(g).filter((p) => p.id !== human.id),
    [g, human.id],
  );

  const submit = async () => {
    if (submitted) return;
    if (human.alive && !pick) return;
    setSubmitted(true);
    haptic("medium");

    const votes = {};
    if (human.alive && pick) votes[human.id] = pick;
    for (const p of alivePlayers(g)) {
      if (p.id === human.id) continue;
      if (!p.isBot) continue;
      const v = aiDayVote(g, p);
      if (v) votes[p.id] = v;
    }
    await new Promise((r) => setTimeout(r, 600));
    const next = resolveVotes(g, votes);
    update(next);
    if (next.winner) {
      hapticNotify(next.winner === "town" && human.role !== "mafia" ? "success" : "error");
    }
  };

  if (!human.alive) {
    return (
      <Card>
        <div className="text-center text-muted-foreground font-serif italic mb-4">
          Ви мертві й не можете голосувати. Місто вирішує без вас.
        </div>
        <button
          onClick={submit}
          disabled={submitted}
          className="w-full py-3 rounded-md border border-gold text-accent"
        >
          Підрахувати голоси
        </button>
      </Card>
    );
  }

  return (
    <Card>
      <div className="font-display text-lg mb-3">⚖️ Кого вигнати з міста?</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {aliveExceptSelf.map((p) => (
          <button
            key={p.id}
            onClick={() => { setPick(p.id); haptic("light"); }}
            className={`p-3 rounded-md border text-left ${
              pick === p.id
                ? "border-gold bg-accent/10 ring-gold"
                : "border-border bg-card/40 hover:border-accent/50"
            }`}
          >
            <div className="text-2xl">{p.avatar}</div>
            <div className="text-sm mt-1 truncate">{p.name}</div>
          </button>
        ))}
      </div>
      <button
        onClick={submit}
        disabled={!pick || submitted}
        className="mt-4 w-full py-3 rounded-md bg-gradient-to-b from-[hsl(0_70%_42%)] to-[hsl(0_70%_28%)] text-white font-display tracking-[0.2em] disabled:opacity-40"
      >
        {submitted ? "Підрахунок..." : "Голосувати"}
      </button>
    </Card>
  );
}
