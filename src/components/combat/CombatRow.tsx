"use client";

import { useState, memo, type DragEvent } from "react";
import { useCombatStore, type Participant } from "@/stores/combatStore";
import { useCombatMutation } from "@/hooks/useCombatMutation";
import { DeathSaveTracker } from "@/components/combat/DeathSaveTracker";
import { CombatantSheet } from "@/components/combat/CombatantSheet";
import { HpBar } from "@/components/ui/HpBar";
import { ConditionsPanel } from "@/components/ui/ConditionsPanel";
import { ActionTracker } from "@/components/ui/ActionTracker";
import { TargetSelector } from "@/components/ui/TargetSelector";
import { AmountControls } from "@/components/ui/AmountControls";
import { TempHpControls } from "@/components/ui/TempHpControls";
import { CombatantNameRow } from "./CombatNameRow";
import { GuidedActionPanel, type RollInfo } from "./GuidedActionPanel";
import type { LogEntry, ActionEconomy, TemplateActionView } from "@/domain/combat/types";
import {
  dealDamage,
  healParticipant,
  setTempHp,
  addCondition,
  removeCondition,
  toggleActionState,
} from "@/lib/actions/participant";
import { setParticipantInitiative } from "@/lib/actions/combat";
import { makeFormData } from "@/lib/utils/formData";
import { TYPE_ACCENT, computeAcTotal } from "@/domain/combat/selectors";
import { ParticipantSummary } from "@/domain/combat/types";
import { rollFormula } from "@/domain/dice/roll";

// F — maps the economy filter to the CombatParticipant boolean field it
// gates against / marks on first confirm (etapa-3-acciones-tiradas.md §4b).
const ECONOMY_FIELD: Record<ActionEconomy, "actionUsed" | "bonusUsed" | "reactionUsed"> = {
  ACTION:       "actionUsed",
  BONUS_ACTION: "bonusUsed",
  REACTION:     "reactionUsed",
};

function CombatantRowBase({
  participant: p, combatId, isCurrentTurn, isFinished,
  round, allParticipants, globalMutating, canDrag, isActive, onDropParticipant, logs,
}: {
  participant: Participant; combatId: string;
  isCurrentTurn: boolean; isFinished: boolean; round: number;
  allParticipants: ParticipantSummary[]; globalMutating: boolean;
  canDrag?: boolean; isActive?: boolean;
  onDropParticipant?: (draggedId: string, targetId: string) => void;
  logs: LogEntry[];
}) {

  const { mutate, isMutating } = useCombatMutation();

  const [expanded,   setExpanded]   = useState(false);
  const [amount,     setAmount]     = useState("");
  const [tempAmount, setTempAmount] = useState("");
  const [condInput,  setCondInput]  = useState("");
  const [targetId,   setTargetId]   = useState(p.id);
  const [initiativeDraft, setInitiativeDraft] = useState("");
  const acTotal  = computeAcTotal(p.baseAc, p.acModifiers);
  const isDead   = p.deathSaveFailures >= 3;
  const disabled = isMutating || globalMutating || isFinished;

  // F — guided attack/heal roll flow (etapa-3-acciones-tiradas.md §4 + §4b).
  const [economy, setEconomy] = useState<ActionEconomy | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [useIndex, setUseIndex] = useState(1);
  const [rollInfo, setRollInfo] = useState<RollInfo | null>(null);
  const [guidedNote, setGuidedNote] = useState<string | null>(null);
  const [pendingEconomyField, setPendingEconomyField] =
    useState<"actionUsed" | "bonusUsed" | "reactionUsed" | null>(null);

  const templateActions = p.template?.actions ?? [];
  const selectedAction  = templateActions.find((a) => a.id === selectedActionId) ?? null;
  const targetName      = allParticipants.find((t) => t.id === targetId)?.displayName ?? "";

  function handleTargetChange(id: string) {
    setTargetId(id);
    // A pending roll's impact note is only valid against the target it was
    // rolled for — force a fresh roll rather than let a stale "vs CA X" note
    // attach to a different target (§4b punto 4 — objetivo→tirada→aplicar,
    // per use).
    if (guidedNote) {
      setGuidedNote(null);
      setPendingEconomyField(null);
      setRollInfo(null);
      setAmount("");
    }
  }

  function handleSelectEconomy(next: ActionEconomy) {
    setEconomy(next);
    setSelectedActionId(null);
    setUseIndex(1);
    setRollInfo(null);
    setGuidedNote(null);
    setPendingEconomyField(null);
  }

  function handleSelectAction(action: TemplateActionView) {
    setSelectedActionId(action.id);
    setUseIndex(1);
    setRollInfo(null);
    setGuidedNote(null);
    setPendingEconomyField(null);
    setAmount("");
  }

  function handleCancelGuidedAction() {
    setEconomy(null);
    setSelectedActionId(null);
    setUseIndex(1);
    setRollInfo(null);
    setGuidedNote(null);
    setPendingEconomyField(null);
  }

  function handleGuidedRoll() {
    if (!selectedAction || !economy) return;
    const target = allParticipants.find((t) => t.id === targetId);

    let amountTotal: number;
    let noteBody: string;

    if (selectedAction.kind === "ATTACK") {
      const bonus = selectedAction.attackBonus ?? 0;
      const bonusStr = bonus >= 0 ? `+${bonus}` : `${bonus}`;
      const attackRoll = rollFormula(`1d20${bonusStr}`);
      const acTargetTotal = target ? computeAcTotal(target.baseAc, target.acModifiers) : 0;
      const hit = attackRoll.total >= acTargetTotal;
      const damageRoll = rollFormula(selectedAction.formula);
      amountTotal = damageRoll.total;
      noteBody =
        `Ataca con ${selectedAction.name}: d20${bonusStr}=${attackRoll.total} ` +
        `vs CA ${acTargetTotal} → ${hit ? "Impacta" : "Falla"}. Daño: ${selectedAction.formula}=${damageRoll.total}`;
      setRollInfo({
        text: `d20${bonusStr}=${attackRoll.total} vs CA ${acTargetTotal} → ${hit ? "Impacta" : "Falla"}`,
        hit,
      });
    } else {
      const healRoll = rollFormula(selectedAction.formula);
      amountTotal = healRoll.total;
      noteBody = `Cura con ${selectedAction.name}: ${selectedAction.formula}=${healRoll.total}`;
      setRollInfo({ text: `${selectedAction.formula}=${healRoll.total}` });
    }

    if (selectedAction.uses > 1) {
      noteBody += ` — uso ${useIndex}/${selectedAction.uses}`;
    }

    setAmount(amountTotal > 0 ? String(amountTotal) : "");
    setGuidedNote(noteBody);
    setPendingEconomyField(ECONOMY_FIELD[economy]);
  }

  // Runs after a guided-flow damage/heal is confirmed — advances to the next
  // use of a multiattack (§7b) or, once uses are exhausted, resets the
  // wizard so the DM starts clean for this participant's next invocation.
  function advanceGuidedUse() {
    setGuidedNote(null);
    setPendingEconomyField(null);
    setRollInfo(null);
    if (selectedAction && useIndex < selectedAction.uses) {
      setUseIndex((i) => i + 1);
    } else {
      setEconomy(null);
      setSelectedActionId(null);
      setUseIndex(1);
    }
  }

  function handleDamage() {
    const n = parseInt(amount);
    if (!n || n < 1) return;
    const note = guidedNote;
    const field = pendingEconomyField;
    const shouldToggleEconomy = field !== null && !p[field];
    mutate({
      optimistic: () => {
        useCombatStore.getState().applyDamage(targetId, n);
        if (shouldToggleEconomy) useCombatStore.getState().toggleAction(p.id, field!);
      },
      action: async () => {
        const results = await Promise.all([
          dealDamage(makeFormData({
            combatId, actorId: p.id, targetId, amount: n,
            ...(note ? { rollNote: note } : {}),
          })),
          ...(shouldToggleEconomy
            ? [toggleActionState(makeFormData({ combatId, targetId: p.id, field: field! }))]
            : []),
        ]);
        setAmount("");
        if (note) advanceGuidedUse();
        return results.find((r) => !r.ok) ?? { ok: true };
      },
    });
  }

  function handleHeal() {
    const n = parseInt(amount);
    if (!n || n < 1) return;
    const note = guidedNote;
    const field = pendingEconomyField;
    const shouldToggleEconomy = field !== null && !p[field];
    mutate({
      optimistic: () => {
        useCombatStore.getState().applyHeal(targetId, n);
        if (shouldToggleEconomy) useCombatStore.getState().toggleAction(p.id, field!);
      },
      action: async () => {
        const results = await Promise.all([
          healParticipant(makeFormData({
            combatId, actorId: p.id, targetId, amount: n,
            ...(note ? { rollNote: note } : {}),
          })),
          ...(shouldToggleEconomy
            ? [toggleActionState(makeFormData({ combatId, targetId: p.id, field: field! }))]
            : []),
        ]);
        setAmount("");
        if (note) advanceGuidedUse();
        return results.find((r) => !r.ok) ?? { ok: true };
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

  // S2-9 — DM can set/correct this participant's raw initiative at any point
  // during ACTIVE combat (the d20 inputs only exist on /setup). The server
  // recomputes turnOrder for the whole combat; the store mirrors it.
  function handleSetInitiative() {
    const n = parseInt(initiativeDraft, 10);
    if (!Number.isInteger(n) || n === p.initiative) return;
    mutate({
      optimistic: () => useCombatStore.getState().setParticipantInitiativeOptimistic(p.id, n),
      action: async () => {
        const r = await setParticipantInitiative(p.id, n);
        setInitiativeDraft("");
        return r;
      },
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
      rounded-gothic-md border-l-4 overflow-hidden transition-all
      bg-gothic-surface ring-1 ring-gothic-outline-variant
      ${isCurrentTurn ? "border-l-gothic-primary shadow-[0_2px_8px_rgba(0,0,0,0.4)] ring-gothic-primary" : TYPE_ACCENT[p.template?.type ?? ""] ?? "border-l-gothic-outline-variant"}
      ${!p.isConscious ? "opacity-70" : ""}
    `}>

      {/* ── Collapsed header ─────────────────────────────────────── */}
      <div
        onClick={() => !isFinished && setExpanded((e) => !e)}
        className={`px-4 py-3 cursor-pointer select-none space-y-2 transition-colors
          ${isCurrentTurn ? "bg-gothic-surface-high" : "hover:bg-gothic-surface-high/40"}`}
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
              className="cursor-grab active:cursor-grabbing text-gothic-on-surface-variant hover:text-gothic-on-surface select-none flex-shrink-0 px-1"
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
        <div className={`border-t border-gothic-outline-variant bg-gothic-background/60 px-4 py-4 space-y-4
          ${disabled ? "opacity-60 pointer-events-none" : ""}`}>

          {/* D10 — ficha de combatiente */}
          <CombatantSheet participant={p} acTotal={acTotal} logs={logs} />

          {/* S2-9 — initiative editor (DM, ACTIVE combat only) */}
          {isActive && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-widest text-gothic-on-surface-variant">
                Iniciativa
              </span>
              <span className="font-mono text-sm text-gothic-on-surface">{p.initiative}</span>
              <input
                type="number"
                step={1}
                value={initiativeDraft}
                onChange={(e) => setInitiativeDraft(e.target.value)}
                disabled={disabled}
                placeholder="nueva"
                aria-label={`Nueva iniciativa para ${p.displayName}`}
                className="w-20 h-9 rounded-gothic-sm bg-gothic-surface ring-1 ring-gothic-outline-variant text-center text-sm font-mono text-gothic-on-surface outline-none focus:ring-gothic-primary transition-all"
              />
              <button
                type="button"
                onClick={handleSetInitiative}
                disabled={disabled || initiativeDraft.trim() === ""}
                className="h-9 px-3 rounded-gothic-sm bg-gothic-primary text-gothic-on-primary text-sm font-semibold hover:bg-gothic-brass-bright disabled:opacity-40 transition-colors"
              >
                Fijar
              </button>
            </div>
          )}

          {/* Action trackers */}
          <ActionTracker
            actionUsed={p.actionUsed}
            bonusUsed={p.bonusUsed}
            reactionUsed={p.reactionUsed}
            disabled={disabled}
            onToggle={handleToggleAction}
          />

          {/* F — guided attack/heal roll flow */}
          <GuidedActionPanel
            actions={templateActions}
            actionUsed={p.actionUsed}
            bonusUsed={p.bonusUsed}
            reactionUsed={p.reactionUsed}
            disabled={disabled}
            economy={economy}
            onSelectEconomy={handleSelectEconomy}
            selectedAction={selectedAction}
            onSelectAction={handleSelectAction}
            onCancel={handleCancelGuidedAction}
            useIndex={useIndex}
            rollInfo={rollInfo}
            onRoll={handleGuidedRoll}
            targetName={targetName}
          />

          {/* Target */}
          <TargetSelector
            value={targetId}
            participants={allParticipants}
            currentParticipantId={p.id}
            onChange={handleTargetChange}
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
            label="PV temporales (propio)"
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
            <p className="text-xs text-gothic-on-surface-variant text-center animate-pulse">Guardando…</p>
          )}
        </div>
      )}
    </div>
  );
}

export const CombatantRow = memo(CombatantRowBase);