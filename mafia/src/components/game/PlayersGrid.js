export function PlayersGrid({ g }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
      {g.players.map((p) => (
        <div
          key={p.id}
          className={`relative rounded-lg p-2 text-center border transition-all ${
            p.alive
              ? p.id === g.humanId
                ? "border-gold bg-accent/5"
                : "border-border bg-card/40"
              : "border-destructive/40 bg-destructive/5 opacity-60"
          }`}
        >
          <div className={`text-2xl ${p.alive ? "" : "grayscale"}`}>{p.avatar}</div>
          <div className="text-xs mt-1 truncate">{p.name}</div>
          {!p.alive && (
            <div className="text-[10px] text-destructive mt-0.5 uppercase tracking-wider">
              Мертвий
            </div>
          )}
          {p.id === g.humanId && p.alive && (
            <div className="absolute -top-1 -right-1 text-[10px] bg-accent text-accent-foreground px-1 rounded">
              Ви
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
