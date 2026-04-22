import { Card } from "@/components/layout/Shell";
import { haptic } from "@/lib/telegram";

export function DayDiscussion({ g, update }) {
  return (
    <Card>
      <div className="font-display text-lg mb-2">🌅 Світанок</div>
      <p className="text-sm text-muted-foreground font-serif italic">
        Місто прокинулось. Перегляньте хроніку нижче, обговоріть події та перейдіть до голосування.
      </p>
      <button
        onClick={() => {
          haptic("medium");
          update({ ...g, phase: "day-vote", votes: {} });
        }}
        className="mt-4 w-full py-3 rounded-md border border-gold text-accent hover:bg-accent/10 font-display tracking-[0.2em]"
      >
        До голосування
      </button>
    </Card>
  );
}
