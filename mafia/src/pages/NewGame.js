import { useState } from "react";
import { useLocation } from "wouter";
import { Shell, Card } from "@/components/layout/Shell";
import { createSoloGame, ROLE_LABEL, mafiaCountFor } from "@/lib/game";
import { saveLastGame, loadNickname, saveNickname } from "@/lib/storage";
import { getTelegramUser, haptic } from "@/lib/telegram";
import { AVATARS } from "@/lib/names";

const ROLE_OPTS = [
  { value: "random", label: "Випадкова" },
  { value: "mafia", label: ROLE_LABEL.mafia },
  { value: "doctor", label: ROLE_LABEL.doctor },
  { value: "sheriff", label: ROLE_LABEL.sheriff },
  { value: "civilian", label: ROLE_LABEL.civilian },
];

export default function NewGame() {
  const tgUser = getTelegramUser();
  const [, setLoc] = useLocation();
  const [name, setName] = useState(tgUser?.name || loadNickname() || "");
  const [count, setCount] = useState(6);
  const [role, setRole] = useState("random");
  const [avatar, setAvatar] = useState(AVATARS[0]);

  const start = () => {
    haptic("medium");
    const finalName = (name.trim() || tgUser?.name || "Гравець");
    saveNickname(finalName);
    const g = createSoloGame({
      humanName: finalName,
      humanAvatar: avatar,
      totalPlayers: count,
      forcedRole: role === "random" ? undefined : role,
    });
    saveLastGame(g);
    setLoc("/game");
  };

  return (
    <Shell title="Нова партія">
      <h1 className="font-display text-4xl gold-text mb-6">Збираємо стіл</h1>

      <Card className="mb-4">
        <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Ваше ім'я
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Дон Корлеоне"
          className="w-full bg-transparent border-b border-border pb-2 text-lg focus:outline-none focus:border-accent transition-colors"
        />
        <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mt-5 mb-2">
          Аватар
        </label>
        <div className="flex flex-wrap gap-2">
          {AVATARS.slice(0, 12).map((a) => (
            <button
              key={a}
              onClick={() => { setAvatar(a); haptic("light"); }}
              className={`w-10 h-10 rounded-md text-xl flex items-center justify-center border transition-all ${
                avatar === a
                  ? "border-gold bg-accent/10 ring-gold scale-110"
                  : "border-border hover:border-accent/50"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </Card>

      <Card className="mb-4">
        <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Кількість гравців: <span className="text-accent">{count}</span>
        </label>
        <input
          type="range"
          min={4}
          max={20}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-full accent-[hsl(var(--gold))]"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>4</span><span>10</span><span>15</span><span>20</span>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {mafiaCountFor(count)} мафіозі, 1 лікар, 1 шериф,
          решта ({count - mafiaCountFor(count) - 2}) — мирні.
        </p>
      </Card>

      <Card className="mb-6">
        <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Бажана роль
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ROLE_OPTS.map((r) => (
            <button
              key={r.value}
              onClick={() => { setRole(r.value); haptic("light"); }}
              className={`py-2 px-3 rounded-md text-sm border transition-all ${
                role === r.value
                  ? "border-gold bg-accent/10 text-accent"
                  : "border-border text-muted-foreground hover:border-accent/40"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </Card>

      <button
        onClick={start}
        className="w-full py-4 rounded-lg font-display text-lg uppercase tracking-[0.25em] bg-gradient-to-b from-[hsl(0_70%_42%)] to-[hsl(0_70%_28%)] text-white ring-blood pulse-blood transition-transform active:scale-[0.99]"
      >
        Почати партію
      </button>
    </Shell>
  );
}
