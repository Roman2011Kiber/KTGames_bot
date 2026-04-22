import { useEffect, useRef } from "react";
import { Card } from "@/components/layout/Shell";

export function GameLog({ g }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [g.log.length]);
  return (
    <Card className="mt-6">
      <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">
        Хроніка
      </div>
      <div ref={ref} className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin pr-1">
        {g.log.map((l, i) => (
          <div
            key={i}
            className={`text-sm font-serif leading-snug ${
              l.kind === "death" ? "text-destructive" :
              l.kind === "win" ? "gold-text font-display" :
              l.kind === "save" ? "text-emerald-300/80" :
              l.kind === "vote" ? "text-accent/90" :
              "text-muted-foreground"
            }`}
          >
            <span className="text-[10px] text-muted-foreground/60 mr-2">D{l.day}</span>
            {l.text}
          </div>
        ))}
      </div>
    </Card>
  );
}
