import { h } from "../lib/dom.js";

export function PlayersGrid(g, opts = {}) {
  return h("div.players-grid", null, g.players.map((p) => {
    const cls = ["player-tile"];
    if (!p.alive) cls.push("dead");
    else if (p.id === (opts.meId || g.humanId)) cls.push("me");
    if (opts.hostId && p.id === opts.hostId) cls.push("host");
    return h("div", { class: cls.join(" ") }, [
      h("div.avatar", null, p.avatar || "🎭"),
      h("div.name", null, p.name),
      !p.alive && h("div.dead-label", null, "Мертвий"),
      p.alive && p.id === (opts.meId || g.humanId) && h("div.badge-me", null, "Ви"),
    ]);
  }));
}
