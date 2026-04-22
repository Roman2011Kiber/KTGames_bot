import { Shell, Card } from "@/components/layout/Shell";
import { ROLE_DESC, ROLE_LABEL } from "@/lib/game";

const ROLE_ICON = {
  mafia: "🩸",
  doctor: "🩺",
  sheriff: "🔍",
  civilian: "🌹",
};

export default function Rules() {
  const roles = ["mafia", "doctor", "sheriff", "civilian"];
  return (
    <Shell title="Правила">
      <h1 className="font-display text-4xl gold-text mb-2">Як грати</h1>
      <p className="text-muted-foreground font-serif italic mb-8">
        Класична Мафія, просто та глибоко.
      </p>

      <div className="space-y-4">
        <Card>
          <div className="font-display text-lg text-accent mb-2">🌙 Ніч</div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Місто засинає. Мафія обирає жертву. Лікар намагається врятувати когось,
            а Шериф перевіряє підозрюваного — чи він мафія.
          </p>
        </Card>
        <Card>
          <div className="font-display text-lg text-accent mb-2">🌅 День</div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ви бачите, хто загинув уночі. Місто обговорює та голосує — кого вигнати.
            Той, хто отримав найбільше голосів, покидає гру.
          </p>
        </Card>
        <Card>
          <div className="font-display text-lg text-accent mb-2">🏆 Перемога</div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="text-foreground">Мирні</span> перемагають, коли всю мафію вигнано.{" "}
            <span className="text-foreground">Мафія</span> перемагає, коли її стає не менше
            за мирних.
          </p>
        </Card>

        <h2 className="font-display text-2xl mt-8 mb-3">Ролі</h2>
        {roles.map((r) => (
          <Card key={r}>
            <div className="flex items-start gap-3">
              <span className="text-3xl">{ROLE_ICON[r]}</span>
              <div>
                <div className="font-display text-lg">{ROLE_LABEL[r]}</div>
                <div className="text-sm text-muted-foreground mt-1">{ROLE_DESC[r]}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  );
}
