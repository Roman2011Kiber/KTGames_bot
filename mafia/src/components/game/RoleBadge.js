import { ROLE_LABEL, ROLE_ICON } from "@/lib/game";

export { ROLE_ICON };

export function RoleBadge({ player }) {
  return (
    <div className={`text-right text-xs ${player.alive ? "text-accent" : "text-destructive"}`}>
      <div className="uppercase tracking-[0.2em] text-muted-foreground">Ваша роль</div>
      <div className="font-display text-base">
        {ROLE_ICON[player.role]} {ROLE_LABEL[player.role]}
      </div>
    </div>
  );
}
