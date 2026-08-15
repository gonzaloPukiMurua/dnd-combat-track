"use client";

import { useMemo } from "react";
import { useCombatStore } from "@/stores/combatStore";
import { useCombatMutation } from "@/hooks/useCombatMutation";
import { computeCurrentActor } from "@/domain/combat/rules";
import { CombatantRow } from "@/components/combat/CombatRow";
import { CurrentTurnPanel } from "@/components/combat/CurrentTurnPanel";
import { CombatLog } from "@/components/combat/CombatLog";
import { AddParticipantMidCombat } from "./AddParticipantMidCombat";
import { reorderParticipants } from "@/lib/actions/participant";
import { makeFormData } from "@/lib/utils/formData";
import { TemplateSummary } from "@/domain/templates/types";
type Props = {
  combatId:   string;
  isFinished: boolean;
  templates: TemplateSummary[];
};

export function CombatView({ combatId, isFinished, templates }: Props) {
  const participants     = useCombatStore((s) => s.participants);
  const logs             = useCombatStore((s) => s.logs);
  const round            = useCombatStore((s) => s.round);
  const combatName       = useCombatStore((s) => s.combatName);
  const currentTurnIndex = useCombatStore((s) => s.currentTurnIndex);
  const isMutating       = useCombatStore((s) => s.isMutating);
  const status           = useCombatStore((s) => s.status);
  const { mutate } = useCombatMutation();

  const actor = useMemo(
    () => computeCurrentActor(participants, currentTurnIndex),
    [participants, currentTurnIndex]
  );

  // Slim summaries for target selectors
  const participantSummaries = useMemo(
    () =>
      participants.map((p) => ({
        id:          p.id,
        displayName: p.displayName,
        isConscious: p.isConscious,
        currentHp:   p.currentHp,
        maxHp:       p.maxHp,
        tempHp:      p.tempHp,
      })),
    [participants]
  );

  const consciousCount = participants.filter((p) => p.isConscious).length;

  function handleDropParticipant(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;

    const currentIds = participants.map((p) => p.id);
    const fromIndex = currentIds.indexOf(draggedId);
    const toIndex   = currentIds.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const orderedIds = [...currentIds];
    orderedIds.splice(fromIndex, 1);
    orderedIds.splice(toIndex, 0, draggedId);

    const currentActorId = actor?.id ?? null;

    mutate({
      optimistic: () => useCombatStore.getState().reorderParticipantsOptimistic(orderedIds),
      action: () =>
        reorderParticipants(
          makeFormData({
            combatId,
            orderedIds: JSON.stringify(orderedIds),
            currentActorId: currentActorId ?? "",
          })
        ),
    });
  }

  return (

    <div className="space-y-4 pb-48 sm:pb-36">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="pt-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{combatName}</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {isFinished
              ? "Combat finished"
              : `Round ${round} · ${consciousCount} active`}
          </p>
        </div>
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
              canDrag={status === "ACTIVE"}
              onDropParticipant={handleDropParticipant}
            />
          );
        })}

        {participants.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-8">
            No participants in this combat.
          </p>
        )}
      </section>
      {!isFinished && (
        <AddParticipantMidCombat
          combatId={combatId}
          templates={templates}
        />
      )}  
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
