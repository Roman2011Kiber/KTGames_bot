import { useEffect, useState } from "react";
import { subscribeNotify } from "@/lib/notify";

export function Notifier() {
  const [items, setItems] = useState([]);
  useEffect(() => subscribeNotify(setItems), []);
  if (!items.length) return null;
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 space-y-2 pointer-events-none">
      {items.map((it) => (
        <div
          key={it.id}
          className={`fade-in card-noir rounded-md px-4 py-2 text-sm font-serif ring-gold pointer-events-auto ${
            it.kind === "error" ? "text-destructive" :
            it.kind === "success" ? "text-emerald-300" :
            "text-foreground"
          }`}
        >
          {it.text}
        </div>
      ))}
    </div>
  );
}
