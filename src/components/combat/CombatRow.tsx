"use client";

import { useState } from "react";
import { useCombatStore, type Participant } from "@/stores/combatStore";
import { useCombatMutation } from "@/hooks/useCombatMutation";
import { DeathSaveTracker } from "@/components/combat/DeathSaveTracker";
import { HpBar } from "./ui/HpBar";
import { ConditionsPanel } from "./ui/ConditionsPanel";
import { ActionTracker } from "./ui/ActionTracker";
import { TargetSelector } from "./ui/TargetSelector";
import { AmountControls } from "./ui/AmountControls";
import { TempHpControls } from "./ui/TempHpControls";
import {
  dealDamage, 
  healParticipant, 
  setTempHp,
  addCondition, 
  removeCondition, 
  toggleActionState,
} from "@/lib/actions/participant";
import { makeFormData } from "@/lib/utils/formData";
import { 
  hpBarColor,
  TYPE_ACCENT
 } from "@/lib/utils/combat";
import { ParticipantSummary } from "@/types/combat";

export function CombatantRow({
  participant: p, combatId, isCurrentTurn, isFinished,
  round, allParticipants, globalMutating,
}: {
  participant: Participant; combatId: string;
  isCurrentTurn: boolean; isFinished: boolean; round: number;
  allParticipants: ParticipantSummary[]; globalMutating: boolean;
}) {
  const store = useCombatStore();
  const { mutate, isMutating } = useCombatMutation();

  const [expanded,   setExpanded]   = useState(false);
  const [amount,     setAmount]     = useState("");
  const [tempAmount, setTempAmount] = useState("");
  const [condInput,  setCondInput]  = useState("");
  const [targetId,   setTargetId]   = useState(p.id);

  const acTotal  = p.baseAc + p.acModifiers.reduce((s, m) => s + m.value, 0);
  const hpPct    = p.maxHp > 0 ? Math.max(0, Math.round((p.currentHp / p.maxHp) * 100)) : 0;
  const barColor = hpBarColor(hpPct, p.isConscious);
  const isDead   = p.deathSaveFailures >= 3;
  const disabled = isMutating || globalMutating || isFinished;
  const selectedTarget = allParticipants.find((ap) => ap.id === targetId);

  function handleDamage() {
    const n = parseInt(amount);
    if (!n || n < 1) return;
    mutate({
      optimistic: () => store.applyDamage(targetId, n),
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
      optimistic: () => store.applyHeal(targetId, n),
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
      optimistic: () => store.applyTempHp(p.id, n),
      action: async () => {
        const r = await setTempHp(makeFormData({ combatId, targetId: p.id, amount: n }));
        setTempAmount(""); return r;
      },
    });
  }

  function handleAddCondition(name: string) {
    if (!name.trim()) return;
    mutate({
      optimistic: () => store.applyCondition(p.id, name),
      action: async () => {
        const r = await addCondition(makeFormData({ combatId, targetId: p.id, condition: name }));
        setCondInput(""); return r;
      },
    });
  }

  function handleRemoveCondition(name: string) {
    mutate({
      optimistic: () => store.removeConditionOptimistic(p.id, name),
      action: () => removeCondition(makeFormData({ combatId, targetId: p.id, condition: name })),
    });
  }

  function handleToggleAction(field: "actionUsed" | "bonusUsed" | "reactionUsed") {
    mutate({
      optimistic: () => store.toggleAction(p.id, field),
      action: () => toggleActionState(makeFormData({ combatId, targetId: p.id, field })),
    });
  }

  return (
    <div className={`
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
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold font-mono flex-shrink-0
              ${isCurrentTurn ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-300"}`}>
              {p.initiative}
            </div>
            <div className="min-w-0">
              <p className={`font-bold leading-tight truncate ${!p.isConscious ? "line-through text-slate-500" : "text-white"}`}>
                {p.displayName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {isDead        && <span className="text-xs text-red-400 font-medium">💀 Dead</span>}
                {!isDead && !p.isConscious && !p.isStabilized && <span className="text-xs text-amber-400 font-medium">⚠ Unconscious</span>}
                {p.isStabilized && <span className="text-xs text-green-400 font-medium">💚 Stable</span>}
                {p.conditions.map((c) => (
                  <span key={c.name} className="text-xs bg-purple-900/60 text-purple-300 border border-purple-700 px-1.5 py-0.5 rounded-lg">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {(p.actionUsed || p.bonusUsed || p.reactionUsed) && (
              <div className="flex gap-1">
                {p.actionUsed   && <span className="text-xs bg-blue-800 text-blue-300 px-1.5 py-0.5 rounded-lg font-bold">A</span>}
                {p.bonusUsed    && <span className="text-xs bg-purple-800 text-purple-300 px-1.5 py-0.5 rounded-lg font-bold">B</span>}
                {p.reactionUsed && <span className="text-xs bg-orange-800 text-orange-300 px-1.5 py-0.5 rounded-lg font-bold">R</span>}
              </div>
            )}
            <span className="text-sm text-slate-400">
              AC <strong className="text-white font-mono">{acTotal}</strong>
            </span>
            {!isFinished && <span className="text-slate-600 text-xs">{expanded ? "▲" : "▼"}</span>}
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
            conditions={conditions}
            disabled={isPending}
            onAddCondition={handleAddCondition}
            onRemoveCondition={handleRemoveCondition}
          />

          {isMutating && (
            <p className="text-xs text-slate-500 text-center animate-pulse">Saving…</p>
          )}
        </div>
      )}
    </div>
  );
}
