import { useState } from "react";
import { useLocation } from "wouter";
import { Shell, Card } from "@/components/layout/Shell";
import { newRoomCode, newId } from "@/lib/game";
import {
  saveRoom, loadRoom, loadNickname, saveNickname,
} from "@/lib/storage";
import { AVATARS, pickRandom } from "@/lib/names";
import { getTelegramUser, haptic } from "@/lib/telegram";
import { notify } from "@/lib/notify";

export default function OnlineLobby() {
  const [, setLoc] = useLocation();
  const tgUser = getTelegramUser();
  const [name, setName] = useState(tgUser?.name || loadNickname());
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const ensureName = () => {
    const n = (tgUser?.name || name).trim();
    if (!n) {
      notify("Введіть ім'я перед створенням кімнати.", "error");
      return null;
    }
    saveNickname(n);
    return n;
  };

  const create = async () => {
    const n = ensureName();
    if (!n) return;
    setBusy(true);
    haptic("medium");
    const c = newRoomCode();
    const hostId = tgUser?.id || newId();
    const avatar = pickRandom(AVATARS, 1)[0] || "🎭";
    const state = {
      id: newId(),
      code: c,
      createdAt: Date.now(),
      phase: "lobby",
      mode: "online",
      day: 0,
      hostId,
      players: [{ id: hostId, name: n, isHuman: true, role: "civilian", alive: true, avatar }],
      actions: {},
      votes: {},
      ready: {},
      chat: [],
      night: {},
      log: [{ day: 0, kind: "info", text: `Кімнату ${c} створено. Очікуємо гравців...` }],
      winner: null,
      started: false,
    };
    await saveRoom(c, state);
    localStorage.setItem(`mafia:me:${c}`, JSON.stringify({ id: hostId, name: n, avatar }));
    setBusy(false);
    setLoc(`/online/${c}`);
  };

  const join = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    if (!ensureName()) return;
    setBusy(true);
    const found = await loadRoom(c);
    setBusy(false);
    if (!found) {
      notify("Кімнату не знайдено. Перевірте код.", "error");
      haptic("heavy");
      return;
    }
    setLoc(`/online/${c}`);
  };

  return (
    <Shell title="Онлайн">
      <h1 className="font-display text-4xl gold-text mb-2">Онлайн-кімната</h1>
      <p className="text-muted-foreground font-serif italic mb-6">
        Створіть кімнату й поділіться кодом — друзі приєднаються за лічені секунди.
      </p>

      <Card className="mb-4">
        <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Ваше ім'я {tgUser && <span className="text-accent">(з Telegram)</span>}
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!!tgUser}
          placeholder="Дон Корлеоне"
          className="w-full bg-transparent border-b border-border pb-2 text-lg focus:outline-none focus:border-accent disabled:opacity-70"
        />
      </Card>

      <Card className="mb-4">
        <div className="font-display text-lg mb-3">Створити нову кімнату</div>
        <button
          onClick={create}
          disabled={busy}
          className="w-full py-3 rounded-md bg-gradient-to-b from-[hsl(0_70%_42%)] to-[hsl(0_70%_28%)] text-white font-display tracking-[0.2em] disabled:opacity-40"
        >
          {busy ? "..." : "Створити кімнату"}
        </button>
      </Card>

      <Card>
        <div className="font-display text-lg mb-3">Приєднатися за кодом</div>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABCDE"
          maxLength={6}
          className="w-full bg-transparent border-b border-border pb-2 text-2xl tracking-[0.4em] text-center font-display focus:outline-none focus:border-accent"
        />
        <button
          onClick={join}
          disabled={busy || !code.trim()}
          className="mt-4 w-full py-3 rounded-md border border-gold text-accent hover:bg-accent/10 disabled:opacity-40"
        >
          Увійти
        </button>
      </Card>

    </Shell>
  );
}
