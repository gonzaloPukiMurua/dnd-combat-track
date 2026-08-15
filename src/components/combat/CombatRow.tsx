"use client";

import { useState, memo, type DragEvent } from "react";
import { useCombatStore, type Participant } from "@/stores/combatStore";
import { useCombatMutation } from "@/hooks/useCombatMutation";
import { DeathSaveTracker } from "@/components/combat/DeathSaveTracker";
import { HpBar } from "@/components/ui/HpBar";
import { ConditionsPanel } from "@/components/ui/ConditionsPanel";
import { ActionTracker } from "@/components/ui/ActionTracker";
import { TargetSelector } from "@/components/ui/TargetSelector";
import { AmountControls } from "@/components/ui/AmountControls";
import { TempHpControls } from "@/components/ui/TempHpControls";
import { CombatantNameRow } from "./CombatNameRow";
import {
  dealDamage, 
  healParticipant, 
  setTempHp,
  addCondition, 
  removeCondition, 
  toggleActionState,
} from "@/lib/actions/participant";
import { makeFormData } from "@/lib/utils/formData";
import { TYPE_ACCENT, computeAcTotal } from "@/domain/combat/selectors";
import { ParticipantSummary } from "@/domain/combat/types";

function CombatantRowBase({
  participant: p, combatId, isCurrentTurn, isFinished,
  round, allParticipants, globalMutating, canDrag, onDropParticipant,
}: {
  participant: Participant; combatId: string;
  isCurrentTurn: boolean; isFinished: boolean; round: number;
  allParticipants: ParticipantSummary[]; globalMutating: boolean;
  canDrag?: boolean; onDropParticipant?: (draggedId: string, targetId: string) => void;
}) {

  const { mutate, isMutating } = useCombatMutation();

  const [expanded,   setExpanded]   = useState(false);
  const [amount,     setAmount]     = useState("");
  const [tempAmount, setTempAmount] = useState("");
  const [condInput,  setCondInput]  = useState("");
  const [targetId,   setTargetId]   = useState(p.id);
  const acTotal  = computeAcTotal(p.baseAc, p.acModifiers);
  const isDead   = p.deathSaveFailures >= 3;
  const disabled = isMutating || globalMutating || isFinished;

  function handleDamage() {
    const n = parseInt(amount);
    if (!n || n < 1) return;
    mutate({
      optimistic: () => useCombatStore.getState().applyDamage(targetId, n),
      action: async () => {
        const r = await dealDamage(makeFormData({ combatId, actorId: p.id, targetId, amount: n }));
        setAmount(""); return r;
      },
    });
  }

  function handleHeal() {
    const n = parseInt(amount);
    if (!n || n < 1) return;
    mutate({
      optimistic: () => useCombatStore.getState().applyHeal(targetId, n),
      action: async () => {
        const r = await healParticipant(makeFormData({ combatId, actorId: p.id, targetId, amount: n }));
        setAmount(""); return r;
      },
    });
  }

  function handleSetTempHp() {
    const n = parseInt(tempAmount);
    if (isNaN(n) || n < 0) return;
    mutate({
      optimistic: () => useCombatStore.getState().applyTempHp(p.id, n),
      action: async () => {
        const r = await setTempHp(makeFormData({ combatId, targetId: p.id, amount: n }));
        setTempAmount(""); return r;
      },
    });
  }

  function handleAddCondition(name: string) {
    if (!name.trim()) return;
    mutate({
      optimistic: () => useCombatStore.getState().applyCondition(p.id, name),
      action: async () => {
        const r = await addCondition(makeFormData({ combatId, targetId: p.id, condition: name }));
        setCondInput(""); return r;
      },
    });
  }

  function handleRemoveCondition(name: string) {
    mutate({
      optimistic: () => useCombatStore.getState().removeConditionOptimistic(p.id, name),
      action: () => removeCondition(makeFormData({ combatId, targetId: p.id, condition: name })),
    });
  }

  function handleToggleAction(field: "actionUsed" | "bonusUsed" | "reactionUsed") {
    mutate({
      optimistic: () => useCombatStore.getState().toggleAction(p.id, field),
      action: () => toggleActionState(makeFormData({ combatId, targetId: p.id, field })),
    });
  }

  function handleDragOver(e: DragEvent) {
    if (!canDrag) return;
    e.preventDefault();
  }

  function handleDrop(e: DragEvent) {
    if (!canDrag) return;
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (draggedId && draggedId !== p.id) onDropParticipant?.(draggedId, p.id);
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
      rounded-2xl border-l-4 overflow-hidden transition-all
      bg-slate-800 border border-slate-700
      ${isCurrentTurn ? "border-l-blue-400 shadow-lg shadow-blue-900/30" : TYPE_ACCENT[p.template.type] ?? "border-l-slate-600"}
      ${!p.isConscious ? "opacity-70" : ""}
    `}>

      {/* ── Collapsed header ─────────────────────────────────────── */}
      <div
        onClick={() => !isFinished && setExpanded((e) => !e)}
        className={`px-4 py-3 cursor-pointer select-none space-y-2 transition-colors
          ${isCurrentTurn ? "bg-blue-900/20" : "hover:bg-slate-700/40"}`}
      >
        {/* Name row */}
        <div className="flex items-center gap-2">
          {canDrag && (
            <span
              draggable
              onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer.setData("text/plain", p.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onClick={(e) => e.stopPropagation()}
              className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 select-none flex-shrink-0 px-1"
              aria-label={`Drag to reorder ${p.displayName}`}
            >
              ⠿
            </span>
          )}
          <div className="flex-1 min-w-0">
          <CombatantNameRow
            initiative={p.initiative}
            displayName={p.displayName}
            isConscious={p.isConscious}
            isStabilized={p.isStabilized}
            isDead={isDead}
            conditions={p.conditions}
            actionUsed={p.actionUsed}
            bonusUsed={p.bonusUsed}
            reactionUsed={p.reactionUsed}
            acTotal={acTotal}
            isCurrentTurn={isCurrentTurn}
            isFinished={isFinished}
            expanded={expanded}
          />
          </div>
        </div>

        {/* HP bar */}
        <HpBar
          currentHp={p.currentHp}
          maxHp={p.maxHp}
          tempHp={p.tempHp}
          isConscious={p.isConscious}
        />

        {/* Death saves — always visible when unconscious */}
        {!p.isConscious && (
          <DeathSaveTracker
            participantId={p.id} combatId={combatId}
            displayName={p.displayName}
            deathSaveSuccesses={p.deathSaveSuccesses}
            deathSaveFailures={p.deathSaveFailures}
            isStabilized={p.isStabilized}
          />
        )}
      </div>

      {/* ── Expanded panel ───────────────────────────────────────── */}
      {expanded && !isFinished && (
        <div className={`border-t border-slate-700 bg-slate-900/50 px-4 py-4 space-y-4
          ${disabled ? "opacity-60 pointer-events-none" : ""}`}>

          {/* Action trackers */}
          <ActionTracker
            actionUsed={p.actionUsed}
            bonusUsed={p.bonusUsed}
            reactionUsed={p.reactionUsed}
            disabled={disabled}
            onToggle={handleToggleAction}
          />

          {/* Target */}
          <TargetSelector
            value={targetId}
            participants={allParticipants}
            currentParticipantId={p.id}
            onChange={setTargetId}
          />

          {/* Amount */}
          <AmountControls
            amount={amount}
            disabled={disabled}
            onAmountChange={setAmount}
            onDamage={handleDamage}
            onHeal={handleHeal}
          />

          {/* Temp HP */}
          <TempHpControls
            value={tempAmount}
            disabled={disabled}
            label="Temp HP (self)"
            onChange={setTempAmount}
            onSubmit={handleSetTempHp}
          />

          {/* Conditions */}
          <ConditionsPanel
            conditions={p.conditions}
            disabled={disabled}
            onAddCondition={handleAddCondition}
            onRemoveCondition={handleRemoveCondition}
            showConcentration={true}
          />

          {isMutating && (
            <p className="text-xs text-slate-500 text-center animate-pulse">Saving…</p>
          )}
        </div>
      )}
    </div>
  );
}

export const CombatantRow = memo(CombatantRowBase);