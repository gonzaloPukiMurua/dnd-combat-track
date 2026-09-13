"use client";

import { useState } from "react";
import { useCombatStore } from "@/stores/combatStore";
import { useCombatMutation } from "@/hooks/useCombatMutation";
import {
  dealDamage,
  healParticipant,
  toggleActionState,
} from "@/lib/actions/participant";

import { advanceTurn } from "@/lib/actions/combat";
import { makeFormData } from "@/lib/utils/formData";
import type { ParticipantSummary, ActionEconomy, TemplateActionView } from "@/domain/combat/types";
import { hpBarColor, computeHpPct, computeAcTotal } from "@/domain/combat/selectors";
import { rollFormula } from "@/domain/dice/roll";
import { GuidedActionPanel, type RollInfo } from "./GuidedActionPanel";

// H — maps the economy filter to the CombatParticipant boolean field it
// gates against / marks on first confirm, same table CombatRow.tsx uses
// (etapa-3-acciones-tiradas.md §4b, §10).
const ECONOMY_FIELD: Record<ActionEconomy, "actionUsed" | "bonusUsed" | "reactionUsed"> = {
  ACTION:       "actionUsed",
  BONUS_ACTION: "bonusUsed",
  REACTION:     "reactionUsed",
};

type CurrentActor = {
  id: string;
  displayName: string;
  currentHp: number;
  maxHp: number;
  tempHp: number;
  actionUsed: boolean;
  bonusUsed: boolean;
  reactionUsed: boolean;
  template: { actions: TemplateActionView[] } | null;
};

export function CurrentTurnPanel({
  actor,
  combatId,
  round,
  allParticipants,
  globalMutating,
}: {
  actor: CurrentActor;
  combatId: string;
  round: number;
  allParticipants: ParticipantSummary[];
  globalMutating: boolean;
}) {
  const { mutate, isMutating } = useCombatMutation();

  const [amount, setAmount] = useState("");
  const [targetId, setTargetId] = useState(actor.id);
  const [expanded, setExpanded] = useState(true);

  // H — guided attack/heal roll flow (etapa-3-acciones-tiradas.md §4 + §4b +
  // §10), same state shape CombatRow.tsx drives GuidedActionPanel with.
  const [economy, setEconomy] = useState<ActionEconomy | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [useIndex, setUseIndex] = useState(1);
  const [rollInfo, setRollInfo] = useState<RollInfo | null>(null);
  const [guidedNote, setGuidedNote] = useState<string | null>(null);
  const [pendingEconomyField, setPendingEconomyField] =
    useState<"actionUsed" | "bonusUsed" | "reactionUsed" | null>(null);

  const disabled = isMutating || globalMutating;

  const hpPct = computeHpPct(actor.currentHp, actor.maxHp);

  // NOTE: always passed as "conscious" — matches this panel's pre-existing
  // behavior, which never factored consciousness into the bar color.
  const barColor = hpBarColor(hpPct, true);

  const selectedTarget = allParticipants.find(
    (p) => p.id === targetId
  );

  const templateActions = actor.template?.actions ?? [];
  const selectedAction  = templateActions.find((a) => a.id === selectedActionId) ?? null;
  const targetName      = selectedTarget?.displayName ?? "";

  function handleTargetChange(id: string) {
    setTargetId(id);
    // Same rule as CombatRow.tsx: a pending roll's note is only valid against
    // the target it was rolled for — force a fresh roll on target change.
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
  // use of a multiattack or, once uses are exhausted, resets the wizard.
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
    const shouldToggleEconomy = field !== null && !actor[field];

    mutate({
      optimistic: () => {
        useCombatStore.getState().applyDamage(targetId, n);
        if (shouldToggleEconomy) useCombatStore.getState().toggleAction(actor.id, field!);
      },

      action: async () => {
        const results = await Promise.all([
          dealDamage(
            makeFormData({
              combatId,
              actorId: actor.id,
              targetId,
              amount: n,
              ...(note ? { rollNote: note } : {}),
            })
          ),
          ...(shouldToggleEconomy
            ? [toggleActionState(makeFormData({ combatId, targetId: actor.id, field: field! }))]
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
    const shouldToggleEconomy = field !== null && !actor[field];

    mutate({
      optimistic: () => {
        useCombatStore.getState().applyHeal(targetId, n);
        if (shouldToggleEconomy) useCombatStore.getState().toggleAction(actor.id, field!);
      },

      action: async () => {
        const results = await Promise.all([
          healParticipant(
            makeFormData({
              combatId,
              actorId: actor.id,
              targetId,
              amount: n,
              ...(note ? { rollNote: note } : {}),
            })
          ),
          ...(shouldToggleEconomy
            ? [toggleActionState(makeFormData({ combatId, targetId: actor.id, field: field! }))]
            : []),
        ]);

        setAmount("");
        if (note) advanceGuidedUse();

        return results.find((r) => !r.ok) ?? { ok: true };
      },
    });
  }

  function handleToggle(
    field: "actionUsed" | "bonusUsed" | "reactionUsed"
  ) {
    mutate({
      optimistic: () => useCombatStore.getState().toggleAction(actor.id, field),

      action: () =>
        toggleActionState(
          makeFormData({
            combatId,
            targetId: actor.id,
            field,
          })
        ),
    });
  }

  function handleEndTurn() {
    mutate({
      optimistic: () => { useCombatStore.getState().advanceTurnOptimistic(); },
      action: async () => {
        const result = await advanceTurn(combatId);
        setAmount("");
        return result;  // ← no router.refresh()
      },
    });
  }

  return (
    <div
      className={`
        fixed bottom-16 sm:bottom-0 left-0 right-0 z-30
        transition-all duration-200
        ${disabled ? "opacity-70" : ""}
      `}
    >
      <div className="max-w-2xl mx-auto px-2 pb-2">
        <div className="bg-gothic-surface/95 backdrop-blur-md ring-1 ring-gothic-primary rounded-gothic-md shadow-[0_-4px_20px_rgba(0,0,0,0.5)] overflow-hidden">

          {/* Header */}
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="
              w-full px-4 py-2.5 flex items-center gap-3
              bg-gothic-surface-low border-b border-gothic-outline-variant
              active:bg-gothic-surface-high transition-colors
            "
          >
            <div className="w-2.5 h-2.5 rounded-full bg-gothic-primary animate-pulse flex-shrink-0" />

            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold text-gothic-primary truncate text-sm leading-tight">
                {actor.displayName}
              </p>

              <p className="text-xs text-gothic-on-surface-variant">
                Ronda {round}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-16 bg-gothic-surface-high rounded-full h-1.5 hidden sm:block">
                <div
                  className={`h-1.5 rounded-full transition-all ${barColor}`}
                  style={{ width: `${hpPct}%` }}
                />
              </div>

              <span className="text-xs font-mono text-gothic-on-surface whitespace-nowrap">
                <strong>{actor.currentHp}</strong>

                <span className="text-gothic-on-surface-variant">
                  /{actor.maxHp}
                </span>

                {actor.tempHp > 0 && (
                  <span className="text-gothic-brass-bright">
                    {" "}
                    +{actor.tempHp}
                  </span>
                )}
              </span>
            </div>

            <span className="text-gothic-on-surface-variant text-xs flex-shrink-0 ml-1">
              {expanded ? "▼" : "▲"}
            </span>
          </button>

          {/* Expanded */}
          {expanded && (
            <div className="px-3 py-3 space-y-3">

              {/* Target + Amount */}
              <div className="flex gap-2">
                <select
                  value={targetId}
                  onChange={(e) => handleTargetChange(e.target.value)}
                  disabled={disabled}
                  className="
                    flex-1 min-w-0 rounded-gothic-sm px-2 h-11 text-sm
                    ring-1 ring-gothic-outline-variant
                    focus:outline-none focus:ring-gothic-primary
                    bg-gothic-surface-low text-gothic-on-surface
                  "
                >
                  {allParticipants.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                      disabled={!p.isConscious && p.id !== actor.id}
                    >
                      {p.id === actor.id ? "Uno mismo" : p.displayName}
                      {" "}({p.currentHp}/{p.maxHp})
                      {!p.isConscious ? " 💀" : ""}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleDamage()
                  }
                  placeholder="Cant."
                  disabled={disabled}
                  className="
                    w-16 rounded-gothic-sm
                    px-2 h-11 text-base text-center
                    ring-1 ring-gothic-outline-variant
                    focus:outline-none focus:ring-gothic-primary
                    bg-gothic-surface-low text-gothic-on-surface
                  "
                />

                <button
                  type="button"
                  onClick={handleDamage}
                  disabled={!amount || disabled}
                  className="
                    bg-gothic-wine text-gothic-on-surface rounded-gothic-sm px-3 h-11
                    text-sm font-bold hover:bg-gothic-danger
                    disabled:opacity-40 transition-colors
                    flex-shrink-0
                  "
                >
                  Daño
                </button>

                <button
                  type="button"
                  onClick={handleHeal}
                  disabled={!amount || disabled}
                  className="
                    bg-gothic-success-bg text-gothic-success-text rounded-gothic-sm px-3 h-11
                    text-sm font-bold hover:brightness-110
                    disabled:opacity-40 transition-colors
                    flex-shrink-0
                  "
                >
                  Curar
                </button>
              </div>

              {/* Target preview */}
              {selectedTarget && selectedTarget.id !== actor.id && (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs text-gothic-on-surface-variant whitespace-nowrap">
                    {selectedTarget.displayName}
                  </span>

                  <div className="flex-1 bg-gothic-surface-high rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        hpBarColor(computeHpPct(selectedTarget.currentHp, selectedTarget.maxHp), true)
                      }`}
                      style={{
                        width: `${computeHpPct(selectedTarget.currentHp, selectedTarget.maxHp)}%`,
                      }}
                    />
                  </div>

                  <span className="text-xs font-mono text-gothic-on-surface-variant whitespace-nowrap">
                    {selectedTarget.currentHp}/
                    {selectedTarget.maxHp}

                    {selectedTarget.tempHp > 0 && (
                      <span className="text-gothic-brass-bright">
                        {" "}
                        +{selectedTarget.tempHp}
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* H — guided attack/heal roll flow, GuidedActionPanel reused
                  as-is from F (CombatRow.tsx) — same component, no gating
                  logic duplicated here beyond the state that drives it. */}
              <GuidedActionPanel
                actions={templateActions}
                actionUsed={actor.actionUsed}
                bonusUsed={actor.bonusUsed}
                reactionUsed={actor.reactionUsed}
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

              {/* Actions + End turn */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle("actionUsed")}
                  disabled={disabled}
                  className={`
                    flex-1 h-10 rounded-gothic-sm text-xs font-semibold
                    ring-1 transition-all
                    ${
                      actor.actionUsed
                        ? "bg-gothic-primary ring-gothic-primary text-gothic-on-primary"
                        : "ring-gothic-outline-variant text-gothic-on-surface-variant hover:ring-gothic-outline"
                    }
                  `}
                >
                  {actor.actionUsed ? "✓ Acción" : "Acción"}
                </button>

                <button
                  type="button"
                  onClick={() => handleToggle("bonusUsed")}
                  disabled={disabled}
                  className={`
                    flex-1 h-10 rounded-gothic-sm text-xs font-semibold
                    ring-1 transition-all
                    ${
                      actor.bonusUsed
                        ? "bg-gothic-primary ring-gothic-primary text-gothic-on-primary"
                        : "ring-gothic-outline-variant text-gothic-on-surface-variant hover:ring-gothic-outline"
                    }
                  `}
                >
                  {actor.bonusUsed ? "✓ Adic." : "Adic."}
                </button>

                <button
                  type="button"
                  onClick={() => handleToggle("reactionUsed")}
                  disabled={disabled}
                  className={`
                    flex-1 h-10 rounded-gothic-sm text-xs font-semibold
                    ring-1 transition-all
                    ${
                      actor.reactionUsed
                        ? "bg-gothic-primary ring-gothic-primary text-gothic-on-primary"
                        : "ring-gothic-outline-variant text-gothic-on-surface-variant hover:ring-gothic-outline"
                    }
                  `}
                >
                  {actor.reactionUsed ? "✓ React." : "React."}
                </button>

                <button
                  type="button"
                  onClick={handleEndTurn}
                  disabled={disabled}
                  className="
                    flex-1 h-10 rounded-gothic-sm text-xs font-semibold
                    bg-gothic-primary text-gothic-on-primary hover:bg-gothic-brass-bright
                    disabled:opacity-40 transition-colors
                  "
                >
                  Sig. turno →
                </button>
              </div>


              {isMutating && (
                <p className="text-xs text-gothic-on-surface-variant text-center animate-pulse">
                  Guardando…
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}