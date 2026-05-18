import { h } from "../lib/dom.js";
import { ROLE_LABEL, ROLE_ICON } from "../lib/game.js";

export function RoleBadge(player) {
  const aliveCls = player.alive ? "accent" : "destructive";
  return h("div.text-right.text-xs." + aliveCls, null, [
    h("div.uppercase.tracking-widest.muted", null, "Ваша роль"),
    h("div.font-display.text-base", null,
      `${ROLE_ICON[player.role] || ""} ${ROLE_LABEL[player.role] || ""}`,
    ),
  ]);
}
