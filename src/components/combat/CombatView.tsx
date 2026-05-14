"use client";

import { useCombatStore } from "@/stores/combatStore";
import { CombatantRow } from "@/components/combat/CombatRow";
import { CurrentTurnPanel } from "@/components/combat/CurrentTurnPanel";
import { CombatLog } from "@/components/combat/CombatLog";

type Props = {
  combatId:   string;
  isFinished: boolean;
};

export function CombatView({ combatId, isFinished }: Props) {
  const participants     = useCombatStore((s) => s.participants);
  const logs             = useCombatStore((s) => s.logs);
  const round            = useCombatStore((s) => s.round);
  const combatName       = useCombatStore((s) => s.combatName);
  const currentActor     = useCombatStore((s) => s.currentActor);
  const isMutating       = useCombatStore((s) => s.isMutating);

  const actor = currentActor();

  // Slim summaries for target selectors
  const participantSummaries = participants.map((p) => ({
    id:          p.id,
    displayName: p.displayName,
    isConscious: p.isConscious,
    currentHp:   p.currentHp,
    maxHp:       p.maxHp,
    tempHp:      p.tempHp,
  }));

  const consciousCount = participants.filter((p) => p.isConscious).length;

  return (
    /*
      pb-48 sm:pb-36 clears the sticky command panel and bottom nav.
      The panel is ~120px + nav tabs ~64px on mobile = ~184px total.
    */
    <div className="space-y-4 pb-48 sm:pb-36">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="pt-2">
        <h1 className="text-xl font-bold text-slate-800">{combatName}</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {isFinished
            ? "Combat finished"
            : `Round ${round} · ${consciousCount} active`}
        </p>
      </div>

      {/* ── Initiative list ─────────────────────────────────────── */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Initiative order
        </h2>

        {participants.map((p) => {
          const isCurrentTurn = !isFinished && actor?.id === p.id;
          return (
            <CombatantRow
              key={p.id}
              participant={p}
              combatId={combatId}
              isCurrentTurn={isCurrentTurn}
              isFinished={isFinished}
              round={round}
              allParticipants={participantSummaries}
              globalMutating={isMutating}
            />
          );
        })}

        {participants.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-8">
            No participants in this combat.
          </p>
        )}
      </section>

      {/* ── Combat log ──────────────────────────────────────────── */}
      {logs.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Log
          </h2>
          <CombatLog logs={logs} />
        </section>
      )}

      {/* ── Sticky command panel ─────────────────────────────────── */}
      {!isFinished && actor && (
        <CurrentTurnPanel
          actor={actor}
          combatId={combatId}
          round={round}
          allParticipants={participantSummaries}
          globalMutating={isMutating}
        />
      )}
    </div>
  );
}
