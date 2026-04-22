// =====================================================================
//  Повноцінна онлайн-партія. Вся синхронізація йде через Firestore
//  (або localStorage у фолбек-режимі). Окремий файл, щоб лобі і гра
//  не змішувались і Vite-чанки лишались малими.
// ---------------------------------------------------------------------
//  Модель синхронізації (без бекенду):
//    • Один документ кімнати: actions, votes, ready, players, log...
//    • Кожен гравець пише ТІЛЬКИ свої поля (через patchRoom з dotted-
//      шляхами — це робить лише точкове оновлення, а не перезапис).
//    • "Хост" (g.hostId) — єдиний, хто переводить фази та резолвить
//      ніч/голосування. Решта клієнтів просто чекає на нову фазу.
//    • Це уникає race-conditions без транзакцій і робить трафік мінімальним.
// =====================================================================

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Shell } from "@/components/layout/Shell";
import { PlayersGrid } from "@/components/game/PlayersGrid";
import { GameLog } from "@/components/game/GameLog";
import { RoleBadge } from "@/components/game/RoleBadge";
import { Modal } from "@/components/ui/Modal";
import { ROLE_ICON } from "@/components/game/RoleBadge";
import {
  ROLES, ROLE_LABEL, ROLE_DESC,
  PHASE_LABEL,
  alivePlayers, expectedNightActorIds, expectedVoterIds, findById,
  resolveNightActions, resolveVotes,
} from "@/lib/game";
import { patchRoom, saveRoom } from "@/lib/storage";
import { haptic } from "@/lib/telegram";
import { notify } from "@/lib/notify";

export function OnlineGame({ code, room, me }) {
  const [, setLoc] = useLocation();
  const [revealOpen, setRevealOpen] = useState(true);
  const [investigation, setInvestigation] = useState(null);
  const [pickedTarget, setPickedTarget] = useState(null);
  const [pickedVote, setPickedVote] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const meId = me?.id;
  const player = useMemo(() => findById(room, meId), [room, meId]);
  const isHost = room.hostId === meId;
  const isNight = room.phase === "night-mafia";
  const isDayDisc = room.phase === "day-discussion";
  const isVote = room.phase === "day-vote";
  const ended = room.phase === "ended";

  // Reset selection on phase change
  useEffect(() => {
    setPickedTarget(null);
    setPickedVote(null);
    setSubmitting(false);
  }, [room.phase, room.day]);

  // Show role reveal once per game session
  useEffect(() => {
    if (room.phase === "role-reveal") setRevealOpen(true);
  }, [room.phase]);

  // Notify on log additions (only the latest entry, only meaningful kinds)
  const lastLog = room.log?.[room.log.length - 1];
  useEffect(() => {
    if (!lastLog) return;
    if (lastLog.kind === "death") notify(lastLog.text, "error");
    else if (lastLog.kind === "save") notify(lastLog.text, "success");
    else if (lastLog.kind === "win") notify(lastLog.text, "success");
    // intentionally skip "info"/"vote" to keep things quiet
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastLog?.text]);

  // Pick up own investigation result if present
  useEffect(() => {
    const inv = room.night?.investigations?.find((i) => i.sheriffId === meId);
    if (inv) setInvestigation({ name: inv.targetName, isMafia: inv.isMafia });
  }, [room.night, meId]);

  // === Host orchestration: advance phase when everyone is ready ===
  useEffect(() => {
    if (!isHost) return;
    (async () => {
      // After role reveal: when everyone confirms, start night 1
      if (room.phase === "role-reveal") {
        const aliveIds = room.players.map((p) => p.id);
        const allReady = aliveIds.every((id) => room.ready?.[id]);
        if (allReady) {
          await patchRoom(code, {
            phase: "night-mafia",
            day: 1,
            ready: {},
            log: [...(room.log || []), { day: 1, kind: "info", text: "🌙 Ніч 1. Місто засинає..." }],
          });
        }
        return;
      }
      // Night: resolve when all expected actors submitted
      if (room.phase === "night-mafia") {
        const expected = expectedNightActorIds(room);
        const submittedAll = expected.every((id) => room.actions?.[id]);
        if (expected.length === 0 || submittedAll) {
          const next = resolveNightActions(room, room.actions || {});
          await saveRoom(code, { ...next, actions: {}, votes: {}, ready: {} });
        }
        return;
      }
      // Voting: resolve when all alive voted
      if (room.phase === "day-vote") {
        const expected = expectedVoterIds(room);
        const all = expected.every((id) => room.votes?.[id]);
        if (all) {
          const next = resolveVotes(room, room.votes || {});
          await saveRoom(code, { ...next, actions: {}, votes: {}, ready: {} });
        }
        return;
      }
    })().catch(() => {});
  }, [isHost, room, code]);

  if (!player) {
    return (
      <Shell title="Гра">
        <div className="card-noir rounded-lg p-5 text-center">
          <p className="text-muted-foreground font-serif italic">
            Ви спостерігач у цій кімнаті. Дочекайтеся наступної партії.
          </p>
        </div>
      </Shell>
    );
  }

  const closeReveal = async () => {
    setRevealOpen(false);
    await patchRoom(code, { [`ready.${meId}`]: true });
  };

  // ----- night submission -----
  const def = ROLES[player.role];
  const action = player.alive ? def?.nightAction : null;
  const submittedThisNight = !!room.actions?.[meId];
  const submitNight = async () => {
    if (submitting) return;
    setSubmitting(true);
    haptic("medium");
    const payload = action && pickedTarget
      ? { action, target: pickedTarget }
      : { action: null, target: null };
    await patchRoom(code, { [`actions.${meId}`]: payload });
  };

  // ----- voting submission -----
  const submittedThisVote = !!room.votes?.[meId];
  const submitVote = async () => {
    if (submitting || !pickedVote) return;
    setSubmitting(true);
    haptic("medium");
    await patchRoom(code, { [`votes.${meId}`]: pickedVote });
  };

  // ----- discussion → host ends discussion -----
  const endDiscussion = async () => {
    haptic("medium");
    await patchRoom(code, { phase: "day-vote", votes: {} });
  };

  const expectedNightCount = expectedNightActorIds(room).length;
  const submittedNightCount = Object.keys(room.actions || {}).length;
  const expectedVoteCount = expectedVoterIds(room).length;
  const submittedVoteCount = Object.keys(room.votes || {}).length;

  return (
    <div className={`min-h-screen ${isNight ? "bg-night" : "bg-day"} grain vignette`}>
      <Shell title={PHASE_LABEL[room.phase]}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {isHost ? "Ви ведучий" : "Гравець"}
            </div>
            <h1 className="font-display text-3xl gold-text">
              {isNight ? "🌙 Ніч" : isDayDisc ? "🌅 Світанок" : isVote ? "⚖️ Голосування" : ended ? "Фінал" : "Гра"} {room.day || 1}
            </h1>
          </div>
          <RoleBadge player={player} />
        </div>

        <PlayersGrid g={room} />

        <div className="mt-5 space-y-3">
          {isNight && (
            <div className="card-noir rounded-lg p-5">
              {!player.alive ? (
                <p className="text-center text-muted-foreground font-serif italic">
                  Ви мертві. Чекайте на закінчення ночі.
                </p>
              ) : action ? (
                <>
                  <div className="font-display text-lg mb-3">
                    {action === "kill" ? "🩸 Кого прибрати?" :
                     action === "heal" ? "🩺 Кого вилікувати?" :
                     action === "investigate" ? "🔍 Кого перевірити?" :
                     "Ваш хід"}
                  </div>
                  <TargetGrid
                    options={alivePlayers(room).filter((p) =>
                      def.canTargetSelf ? true : p.id !== meId,
                    )}
                    value={pickedTarget}
                    onChange={(id) => { setPickedTarget(id); haptic("light"); }}
                    disabled={submittedThisNight}
                  />
                </>
              ) : (
                <p className="text-center text-muted-foreground font-serif italic py-4">
                  Ви — {def?.label?.toLowerCase()}. Цієї ночі від вас нічого не вимагається.
                </p>
              )}
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>Готових ходів: {submittedNightCount}/{expectedNightCount}</span>
                {isHost && <span className="text-accent/80">Ви — ведучий, фаза зміниться автоматично</span>}
              </div>
              {(action || !player.alive) && (
                <button
                  onClick={submitNight}
                  disabled={submittedThisNight || (action && !pickedTarget)}
                  className="mt-3 w-full py-3 rounded-md bg-gradient-to-b from-[hsl(0_70%_42%)] to-[hsl(0_70%_28%)] text-white font-display tracking-[0.2em] disabled:opacity-40"
                >
                  {submittedThisNight ? "Очікуємо інших..." : "Підтвердити"}
                </button>
              )}
            </div>
          )}

          {isDayDisc && (
            <div className="card-noir rounded-lg p-5">
              <div className="font-display text-lg mb-2">🌅 Світанок</div>
              <p className="text-sm text-muted-foreground font-serif italic">
                Місто прокинулось. Обговоріть події у чаті праворуч ↘ і {isHost ? "натисніть, коли будете готові голосувати." : "дочекайтесь, поки ведучий запустить голосування."}
              </p>
              {isHost && (
                <button
                  onClick={endDiscussion}
                  className="mt-4 w-full py-3 rounded-md border border-gold text-accent hover:bg-accent/10 font-display tracking-[0.2em]"
                >
                  До голосування
                </button>
              )}
            </div>
          )}

          {isVote && (
            <div className="card-noir rounded-lg p-5">
              <div className="font-display text-lg mb-3">⚖️ Кого вигнати з міста?</div>
              {!player.alive ? (
                <p className="text-center text-muted-foreground font-serif italic">
                  Ви мертві й не голосуєте.
                </p>
              ) : (
                <TargetGrid
                  options={alivePlayers(room).filter((p) => p.id !== meId)}
                  value={pickedVote}
                  onChange={(id) => { setPickedVote(id); haptic("light"); }}
                  disabled={submittedThisVote}
                />
              )}
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>Голосів: {submittedVoteCount}/{expectedVoteCount}</span>
              </div>
              {player.alive && (
                <button
                  onClick={submitVote}
                  disabled={submittedThisVote || !pickedVote}
                  className="mt-3 w-full py-3 rounded-md bg-gradient-to-b from-[hsl(0_70%_42%)] to-[hsl(0_70%_28%)] text-white font-display tracking-[0.2em] disabled:opacity-40"
                >
                  {submittedThisVote ? "Голос враховано" : "Голосувати"}
                </button>
              )}
            </div>
          )}

          {ended && (
            <div className="card-noir rounded-lg p-5 text-center">
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Фінал</div>
              <h2 className={`mt-3 font-display text-5xl ${
                (room.winner === "town" && player.role !== "mafia") ||
                (room.winner === "mafia" && player.role === "mafia")
                  ? "gold-text" : "blood-text"
              }`}>
                {room.winner === "town" ? "МІСТО ПЕРЕМОГЛО" : "МАФІЯ ПЕРЕМОГЛА"}
              </h2>
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2">
                {room.players.map((p) => (
                  <div key={p.id} className={`p-2 rounded-md border text-center text-xs ${
                    p.role === "mafia" ? "border-destructive/50 bg-destructive/5" : "border-border bg-card/40"
                  }`}>
                    <div className="text-2xl">{p.avatar}</div>
                    <div className="truncate mt-1">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {ROLE_ICON[p.role]} {ROLE_LABEL[p.role]}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setLoc("/")}
                className="mt-6 w-full py-3 rounded-md border border-gold text-accent"
              >
                В меню
              </button>
            </div>
          )}
        </div>

        <GameLog g={room} />
      </Shell>

      {revealOpen && room.phase === "role-reveal" && (
        <Modal onClose={() => {}}>
          <RoleRevealContent player={player} onClose={closeReveal} />
        </Modal>
      )}
      {investigation && (
        <Modal onClose={() => setInvestigation(null)}>
          <div className="text-center">
            <div className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Результат перевірки
            </div>
            <div className="mt-2 text-4xl">{investigation.isMafia ? "🩸" : "🌹"}</div>
            <div className="mt-3 font-display text-2xl">{investigation.name}</div>
            <div className={`mt-2 text-lg ${investigation.isMafia ? "blood-text" : "text-emerald-400"}`}>
              {investigation.isMafia ? "Це МАФІЯ." : "Це не мафія."}
            </div>
            <button
              onClick={() => setInvestigation(null)}
              className="mt-6 px-6 py-2 rounded-md border border-gold text-accent hover:bg-accent/10"
            >
              Закрити
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function RoleRevealContent({ player, onClose }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="text-center">
      <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Ваша таємна роль</div>
      {!shown ? (
        <button
          onClick={() => { setShown(true); haptic("heavy"); }}
          className="mt-6 px-8 py-6 rounded-lg border border-gold bg-accent/5 hover:bg-accent/10"
        >
          <div className="text-3xl mb-2">🃏</div>
          <div className="font-display tracking-[0.2em]">ВІДКРИТИ</div>
        </button>
      ) : (
        <div className="fade-in">
          <div className="text-6xl mt-3">{ROLE_ICON[player.role]}</div>
          <div className="mt-3 font-display text-3xl gold-text">{ROLE_LABEL[player.role]}</div>
          <p className="mt-3 text-sm text-muted-foreground font-serif italic max-w-xs mx-auto">
            {ROLE_DESC[player.role]}
          </p>
          <button
            onClick={onClose}
            className="mt-6 w-full py-3 rounded-md bg-gradient-to-b from-[hsl(0_70%_42%)] to-[hsl(0_70%_28%)] text-white font-display tracking-[0.2em]"
          >
            ГОТОВИЙ
          </button>
        </div>
      )}
    </div>
  );
}

function TargetGrid({ options, value, onChange, disabled }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {options.map((p) => (
        <button
          key={p.id}
          disabled={disabled}
          onClick={() => onChange(p.id)}
          className={`p-3 rounded-md border text-left transition-all ${
            value === p.id
              ? "border-gold bg-accent/10 ring-gold"
              : "border-border bg-card/40 hover:border-accent/50"
          } disabled:opacity-60`}
        >
          <div className="text-2xl">{p.avatar}</div>
          <div className="text-sm mt-1 truncate">{p.name}</div>
        </button>
      ))}
    </div>
  );
}
