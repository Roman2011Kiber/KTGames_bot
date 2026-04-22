import { useState } from "react";
import { Card } from "@/components/layout/Shell";
import {
  ROLES,
  alivePlayers,
  collectBotNightActions,
  findById,
  resolveNightActions,
} from "@/lib/game";
import { haptic } from "@/lib/telegram";

export function NightActions({ g, update, setInvestigation }) {
  const human = findById(g, g.humanId);
  const def = ROLES[human.role];
  const action = human.alive ? def?.nightAction : null;

  const [target, setTarget] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const candidates = alivePlayers(g).filter((p) =>
    def?.canTargetSelf ? true : p.id !== human.id,
  );

  const ready = !action || !!target;

  const submit = async () => {
    if (submitted || !ready) return;
    setSubmitted(true);
    haptic("medium");
    const actions = action && target
      ? { [human.id]: { action, target } }
      : {};
    const all = collectBotNightActions(g, actions);
    await new Promise((r) => setTimeout(r, 600));
    const next = resolveNightActions({ ...g }, all);
    const myInv = next.night?.investigations?.find((i) => i.sheriffId === human.id);
    if (myInv) setInvestigation({ name: myInv.targetName, isMafia: myInv.isMafia });
    update(next);
  };

  if (!human.alive) {
    return (
      <Card>
        <div className="text-center text-muted-foreground font-serif italic">
          Ви спостерігаєте за грою з-за лаштунків... Ніч триває.
        </div>
        <button
          onClick={submit}
          disabled={submitted}
          className="mt-4 w-full py-3 rounded-md border border-gold text-accent hover:bg-accent/10"
        >
          Перейти до ранку
        </button>
      </Card>
    );
  }

  return (
    <Card>
      {action ? (
        <Picker
          title={
            action === "kill" ? "🩸 Кого прибрати цієї ночі?" :
            action === "heal" ? "🩺 Кого вилікувати?" :
            action === "investigate" ? "🔍 Кого перевірити?" :
            "Ваш хід"
          }
          subtitle={def.canTargetSelf ? "Можна обрати себе." : undefined}
          options={candidates}
          value={target}
          onChange={(id) => { setTarget(id); haptic("light"); }}
        />
      ) : (
        <div className="text-center py-4 text-muted-foreground font-serif italic">
          Ви — {def?.label?.toLowerCase()}. Спіть спокійно... Місто пробудиться на світанку.
        </div>
      )}
      <button
        onClick={submit}
        disabled={!ready || submitted}
        className="mt-4 w-full py-3 rounded-md bg-gradient-to-b from-[hsl(0_70%_42%)] to-[hsl(0_70%_28%)] text-white font-display tracking-[0.2em] disabled:opacity-40 disabled:from-muted disabled:to-muted"
      >
        {submitted ? "..." : "Завершити ніч"}
      </button>
    </Card>
  );
}

function Picker({ title, subtitle, options, value, onChange }) {
  return (
    <div>
      <div className="font-display text-lg mb-1">{title}</div>
      {subtitle && <div className="text-xs text-muted-foreground mb-3">{subtitle}</div>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {options.map((p) => (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`p-3 rounded-md border text-left transition-all ${
              value === p.id
                ? "border-gold bg-accent/10 ring-gold"
                : "border-border bg-card/40 hover:border-accent/50"
            }`}
          >
            <div className="text-2xl">{p.avatar}</div>
            <div className="text-sm mt-1 truncate">{p.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
