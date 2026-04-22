import { Link } from "wouter";
import { loadLastGame } from "@/lib/storage";
import { useEffect, useState } from "react";

export default function Home() {
  const [last, setLast] = useState(null);
  useEffect(() => { setLast(loadLastGame()); }, []);

  return (
    <div className="relative z-10 mx-auto w-full max-w-3xl px-5 pt-12 pb-20">
      <div className="text-center slow-in">
        <p className="font-display text-xs uppercase tracking-[0.5em] text-accent/80">
          Темна сторона міста
        </p>
        <h1 className="mt-4 font-display text-6xl sm:text-7xl font-bold gold-text leading-none">
          МАФІЯ
        </h1>
        <p className="mt-3 font-serif italic text-lg text-muted-foreground">
          Місто засинає. Прокидається мафія.
        </p>
      </div>

      <div className="mt-12 space-y-3">
        <Link
          href="/new"
          className="block group relative overflow-hidden rounded-lg border border-gold bg-gradient-to-br from-[hsl(0_60%_25%)] to-[hsl(12_50%_15%)] p-5 ring-gold transition-transform hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-xl text-accent">Нова партія</div>
              <div className="text-sm text-muted-foreground mt-0.5">
                Грайте проти ботів — від 4 до 20 гравців
              </div>
            </div>
            <span className="text-2xl">🎭</span>
          </div>
        </Link>

        <Link
          href="/online"
          className="block group rounded-lg border border-border bg-card/60 p-5 hover:border-gold transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-xl">Онлайн-кімната</div>
              <div className="text-sm text-muted-foreground mt-0.5">
                Створіть код і запросіть друзів
              </div>
            </div>
            <span className="text-2xl">🕯️</span>
          </div>
        </Link>

        {last && last.phase !== "ended" && (
          <Link
            href="/game"
            className="block rounded-lg border border-border bg-card/40 p-4 hover:border-accent/50 transition-colors"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Продовжити партію</span>
              <span className="text-accent">Ніч {last.day || 1} →</span>
            </div>
          </Link>
        )}

        <Link
          href="/rules"
          className="block rounded-lg border border-border/60 bg-transparent p-4 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center justify-between text-sm">
            <span>Як грати</span>
            <span className="text-muted-foreground">Правила та ролі →</span>
          </div>
        </Link>
      </div>

      <div className="mt-16 text-center text-xs text-muted-foreground/70 font-serif italic">
        «Місто не пробачає тих, хто мовчить.»
      </div>
    </div>
  );
}
