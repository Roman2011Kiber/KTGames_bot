import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Shell } from "@/components/layout/Shell";
import { PlayersGrid } from "@/components/game/PlayersGrid";
import { GameLog } from "@/components/game/GameLog";
import { RoleBadge } from "@/components/game/RoleBadge";
import { RoleReveal } from "./RoleReveal";
import { NightActions } from "./NightActions";
import { DayDiscussion } from "./DayDiscussion";
import { Voting } from "./Voting";
import { EndScreen } from "./EndScreen";
import { Investigation } from "./Investigation";
import { loadLastGame, saveLastGame } from "@/lib/storage";
import { PHASE_LABEL, appendLog, findById } from "@/lib/game";

export default function Game() {
  const [, setLoc] = useLocation();
  const [g, setG] = useState(null);
  const [revealOpen, setRevealOpen] = useState(false);
  const [investigation, setInvestigation] = useState(null);

  useEffect(() => {
    const loaded = loadLastGame();
    if (!loaded) { setLoc("/"); return; }
    setG(loaded);
    if (loaded.phase === "role-reveal") setRevealOpen(true);
  }, [setLoc]);

  if (!g) return null;

  const update = (next) => {
    setG(next);
    saveLastGame(next);
  };

  const human = findById(g, g.humanId);
  const isNight = g.phase.startsWith("night");
  const isDay = g.phase.startsWith("day");
  const ended = g.phase === "ended";

  const closeReveal = () => {
    setRevealOpen(false);
    update({
      ...g,
      phase: "night-mafia",
      day: 1,
      log: appendLog(g.log, {
        day: 1,
        kind: "info",
        text: "🌙 Ніч 1. Місто засинає...",
      }),
    });
  };

  return (
    <div className={`min-h-screen ${isNight ? "bg-night" : isDay ? "bg-day" : "bg-noir"} grain vignette`}>
      <Shell title={PHASE_LABEL[g.phase]}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {isNight ? "🌙 Ніч" : isDay ? "🌅 День" : "Гра"} {g.day || 1}
            </div>
            <h1 className="font-display text-3xl gold-text">{PHASE_LABEL[g.phase]}</h1>
          </div>
          <RoleBadge player={human} />
        </div>

        <PlayersGrid g={g} />

        <div className="mt-5">
          {g.phase === "night-mafia" && (
            <NightActions g={g} update={update} setInvestigation={setInvestigation} />
          )}
          {g.phase === "day-discussion" && <DayDiscussion g={g} update={update} />}
          {g.phase === "day-vote" && <Voting g={g} update={update} />}
          {ended && <EndScreen g={g} />}
        </div>

        <GameLog g={g} />
      </Shell>

      {revealOpen && human && <RoleReveal player={human} onClose={closeReveal} />}
      {investigation && (
        <Investigation data={investigation} onClose={() => setInvestigation(null)} />
      )}
    </div>
  );
}
