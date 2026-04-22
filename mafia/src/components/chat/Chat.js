// =====================================================================
//  Кімнатний чат. Окремий файл, не залежить від іншої гри.
// ---------------------------------------------------------------------
//  Дизайн вибрано так, щоб не навантажувати ні мережу, ні пристрій:
//    • Останні 50 повідомлень зберігаються у тому ж документі кімнати —
//      окремої колекції не потрібно, мінімум читань Firestore.
//    • Повідомлення відправляється через arrayUnion (атомарно).
//    • Локальна черга-throttle: спам кнопкою send не надсилає десятки
//      запитів — лише останній за 400 мс.
//    • Дзвіночок (bell) звуку немає; натомість легкий haptic у Telegram
//      і непомітна точка-індикатор для нових повідомлень.
//    • Список рендерить тільки останні 50 рядків, без віртуалізації:
//      DOM лишається крихітним.
// =====================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { appendChatMessage } from "@/lib/storage";
import { haptic } from "@/lib/telegram";

const SEND_THROTTLE_MS = 400;
const MAX_LEN = 200;

export function Chat({ code, me, messages = [] }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const lastSentAt = useRef(0);
  const listRef = useRef(null);
  const seenCount = useRef(messages.length);

  // Track unseen count when chat is closed
  useEffect(() => {
    if (open) {
      seenCount.current = messages.length;
      setUnseen(0);
    } else if (messages.length > seenCount.current) {
      setUnseen(messages.length - seenCount.current);
      // gentle haptic notification, no sound
      const last = messages[messages.length - 1];
      if (last && last.authorId !== me?.id) haptic("light");
    }
  }, [messages.length, open, me?.id]);

  // Auto-scroll only when chat is open
  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length, open]);

  const send = async () => {
    const t = text.trim();
    if (!t || !me) return;
    const now = Date.now();
    if (now - lastSentAt.current < SEND_THROTTLE_MS) return;
    lastSentAt.current = now;
    setText("");
    try {
      await appendChatMessage(code, {
        id: Math.random().toString(36).slice(2, 9),
        authorId: me.id,
        author: me.name,
        avatar: me.avatar || "🎭",
        text: t.slice(0, MAX_LEN),
        ts: now,
      });
    } catch { /* mute network errors in chat */ }
  };

  const recent = useMemo(() => messages.slice(-50), [messages]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 w-12 h-12 rounded-full bg-gradient-to-b from-[hsl(0_70%_42%)] to-[hsl(0_70%_28%)] text-white shadow-lg ring-blood flex items-center justify-center"
        aria-label="Чат"
      >
        💬
        {unseen > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[11px] rounded-full bg-accent text-accent-foreground font-bold flex items-center justify-center">
            {unseen > 9 ? "9+" : unseen}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 left-0 sm:left-auto sm:bottom-4 sm:right-4 sm:w-96 z-40 card-noir sm:rounded-lg ring-gold flex flex-col fade-in"
         style={{ maxHeight: "70vh" }}>
      <div className="flex items-center justify-between p-3 border-b border-border">
        <span className="font-display text-sm uppercase tracking-[0.2em] text-accent">Чат кімнати</span>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-accent text-xl leading-none">×</button>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2 min-h-[180px]">
        {recent.length === 0 && (
          <div className="text-center text-muted-foreground/60 text-sm font-serif italic mt-6">
            Тиша... Напишіть щось першим.
          </div>
        )}
        {recent.map((m) => {
          const mine = m.authorId === me?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-1.5 text-sm ${
                mine
                  ? "bg-accent/20 border border-accent/40 text-foreground"
                  : "bg-card/60 border border-border"
              }`}>
                {!mine && (
                  <div className="text-[10px] text-muted-foreground mb-0.5">
                    {m.avatar} {m.author}
                  </div>
                )}
                <div className="break-words whitespace-pre-wrap">{m.text}</div>
              </div>
            </div>
          );
        })}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex gap-2 p-2 border-t border-border"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
          placeholder={me ? "Написати..." : "Спочатку приєднайтесь"}
          disabled={!me}
          className="flex-1 bg-transparent border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!me || !text.trim()}
          className="px-4 rounded-md bg-accent text-accent-foreground font-display text-sm tracking-wider disabled:opacity-40"
        >
          ↑
        </button>
      </form>
    </div>
  );
}
