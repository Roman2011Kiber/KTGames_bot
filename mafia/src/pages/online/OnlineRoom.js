import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Shell, Card } from "@/components/layout/Shell";
import { Chat } from "@/components/chat/Chat";
import { OnlineGame } from "./OnlineGame";
import {
  subscribeRoom, saveRoom, loadRoom, loadNickname, saveNickname,
} from "@/lib/storage";
import { newId, startOnlineGame } from "@/lib/game";
import { AVATARS, pickRandom } from "@/lib/names";
import { getTelegramUser, haptic } from "@/lib/telegram";
import { notify } from "@/lib/notify";

const MIN_PLAYERS = 4;
const MAX_PLAYERS = 20;

export default function OnlineRoom() {
  const [, params] = useRoute("/online/:code");
  const [, setLoc] = useLocation();
  const code = params?.code?.toUpperCase() || "";
  const tgUser = getTelegramUser();

  const [room, setRoom] = useState(null);
  const [me, setMe] = useState(() => {
    if (tgUser) return { id: tgUser.id, name: tgUser.name, avatar: tgUser.avatar || "🎭" };
    const stored = localStorage.getItem(`mafia:me:${code}`);
    if (stored) try { return JSON.parse(stored); } catch { /* */ }
    return null;
  });
  const [nick, setNick] = useState(loadNickname() || tgUser?.name || "");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!code) return;
    return subscribeRoom(code, setRoom);
  }, [code]);

  // Persist `me` per-room so a refresh keeps the seat
  useEffect(() => {
    if (me && code) localStorage.setItem(`mafia:me:${code}`, JSON.stringify(me));
  }, [me, code]);

  if (!code) return null;
  if (!room) {
    return (
      <Shell title="Кімната">
        <Card><div className="text-muted-foreground font-serif italic">Завантаження кімнати...</div></Card>
      </Shell>
    );
  }

  const isMember = me && room.players.some((p) => p.id === me.id);

  const join = async () => {
    setJoining(true);
    haptic("medium");
    const fresh = await loadRoom(code);
    if (!fresh) { setJoining(false); return; }
    if (fresh.started) {
      notify("Гру вже розпочато — приєднайтеся до наступної.", "error");
      setJoining(false); return;
    }
    if (fresh.players.length >= MAX_PLAYERS) {
      notify("Кімната заповнена.", "error");
      setJoining(false); return;
    }
    const id = tgUser?.id || newId();
    const name = (tgUser?.name || nick).trim() || "Гість";
    const used = new Set(fresh.players.map((p) => p.avatar));
    const free = AVATARS.filter((a) => !used.has(a));
    const avatar = (free.length ? pickRandom(free, 1)[0] : pickRandom(AVATARS, 1)[0]) || "🎭";
    const player = { id, name, isHuman: true, role: "civilian", alive: true, avatar };
    const next = {
      ...fresh,
      players: [...fresh.players, player],
      log: [...(fresh.log || []), { day: 0, kind: "info", text: `${avatar} ${name} приєднався.` }],
    };
    await saveRoom(code, next);
    saveNickname(name);
    setMe({ id, name, avatar });
    setJoining(false);
  };

  const startGame = async () => {
    if (room.players.length < MIN_PLAYERS) {
      notify(`Потрібно щонайменше ${MIN_PLAYERS} гравців.`, "error");
      return;
    }
    haptic("heavy");
    const started = startOnlineGame(room);
    await saveRoom(code, started);
  };

  // ===== If game has started, render OnlineGame =====
  if (room.started) {
    return (
      <>
        <OnlineGame code={code} room={room} me={isMember ? me : null} />
        <Chat code={code} me={isMember ? me : null} messages={room.chat || []} />
      </>
    );
  }

  // ===== Otherwise, lobby =====
  const isHost = me && room.hostId === me.id;
  return (
    <>
      <Shell title="Кімната">
        <div className="text-center mb-6">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Код кімнати</div>
          <div className="font-display text-5xl gold-text tracking-[0.3em] mt-1">{code}</div>
          <button
            onClick={() => { navigator.clipboard?.writeText(code); haptic("light"); notify("Код скопійовано", "success"); }}
            className="mt-2 text-xs text-accent hover:underline"
          >
            Скопіювати код
          </button>
        </div>

        <Card className="mb-4">
          <div className="font-display text-lg mb-3">
            Гравці ({room.players.length}/{MAX_PLAYERS})
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {room.players.map((p) => (
              <div key={p.id} className={`p-3 rounded-md border text-center ${
                p.id === me?.id ? "border-gold bg-accent/10" :
                p.id === room.hostId ? "border-accent/40" : "border-border bg-card/40"
              }`}>
                <div className="text-2xl">{p.avatar}</div>
                <div className="text-sm mt-1 truncate">{p.name}</div>
                {p.id === room.hostId && (
                  <div className="text-[10px] text-accent/70 uppercase tracking-wider mt-0.5">Ведучий</div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {!isMember && (
          <Card className="mb-4">
            <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
              Ваше ім'я {tgUser && <span className="text-accent">(з Telegram)</span>}
            </label>
            <input
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              disabled={!!tgUser}
              placeholder="Гравець"
              className="w-full bg-transparent border-b border-border pb-2 text-lg focus:outline-none focus:border-accent disabled:opacity-70"
            />
            <button
              onClick={join}
              disabled={joining || room.players.length >= MAX_PLAYERS || (!tgUser && !nick.trim())}
              className="mt-4 w-full py-3 rounded-md bg-gradient-to-b from-[hsl(0_70%_42%)] to-[hsl(0_70%_28%)] text-white font-display tracking-[0.2em] disabled:opacity-40"
            >
              {joining ? "..." : "Зайти в гру"}
            </button>
          </Card>
        )}

        {isMember && (
          <Card className="mb-4">
            {isHost ? (
              <>
                <div className="font-display text-lg mb-2">Ви — ведучий 🎩</div>
                <p className="text-sm text-muted-foreground mb-4">
                  Коли всі гравці зайшли (мінімум {MIN_PLAYERS}, максимум {MAX_PLAYERS}), запускайте партію.
                </p>
                <button
                  onClick={startGame}
                  disabled={room.players.length < MIN_PLAYERS}
                  className="w-full py-3 rounded-md bg-gradient-to-b from-[hsl(0_70%_42%)] to-[hsl(0_70%_28%)] text-white font-display tracking-[0.25em] disabled:opacity-40"
                >
                  Почати партію ({room.players.length})
                </button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground font-serif italic text-center py-2">
                Очікуємо, поки ведучий запустить партію... Тим часом можете спілкуватися в чаті ↘
              </p>
            )}
          </Card>
        )}
      </Shell>
      <Chat code={code} me={isMember ? me : null} messages={room.chat || []} />
    </>
  );
}
