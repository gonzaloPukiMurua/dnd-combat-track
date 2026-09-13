"use client";

import { useState } from "react";
import type { ActionEconomy, TemplateActionView, ParticipantSummary } from "@/domain/combat/types";
import { computeAcTotal } from "@/domain/combat/selectors";
import { rollFormula } from "@/domain/dice/roll";
import type { RollInfo } from "@/components/combat/GuidedActionPanel";

// Extracted from CombatRow.tsx (F, commit 0724a6b) when H (commit 54c2c36)
// duplicated the same wizard into CurrentTurnPanel.tsx — both hosts drove
// identical economy→action→roll→confirm state, just under `p` vs `actor`.
// Pure refactor: same state shape, same handler bodies, same
// shouldToggleEconomy rule (etapa-3-acciones-tiradas.md §4b — toggle once per
// invocation, not once per multiattack use).
//
// What deliberately stays OUT of this hook, per host: `targetId` itself (each
// host owns its own target-selector UI and `useState`), and the actual
// `mutate()`/dealDamage/toggleActionState wiring — that call bundles the
// damage/heal action with the conditional economy toggle into ONE
// useCombatMutation() cycle (one optimistic update, one "Guardando…"
// window), and each host already owns its own `mutate` for every other
// mutation it drives (temp HP, conditions, initiative, end turn). Moving
// that bundling into the hook would mean a second, independent
// useCombatMutation() instance here, decoupling this flow's pending/rollback
// state from the rest of the host's UI — an observable behavior change, not
// a pure refactor. So the hook only computes and exposes what a host needs
// to build that call itself: `guidedNote`, `pendingField`,
// `shouldToggleEconomy`, and `advanceUse()` to call once the host's own
// mutate resolves.

const ECONOMY_FIELD: Record<ActionEconomy, "actionUsed" | "bonusUsed" | "reactionUsed"> = {
  ACTION:       "actionUsed",
  BONUS_ACTION: "bonusUsed",
  REACTION:     "reactionUsed",
};

type EconomyField = "actionUsed" | "bonusUsed" | "reactionUsed";

type GuidedActor = {
  actionUsed:   boolean;
  bonusUsed:    boolean;
  reactionUsed: boolean;
  template:     { actions: TemplateActionView[] } | null;
};

export function useGuidedAction(
  actor: GuidedActor,
  targetId: string,
  allParticipants: ParticipantSummary[],
) {
  const [economy, setEconomy] = useState<ActionEconomy | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [useIndex, setUseIndex] = useState(1);
  const [rollInfo, setRollInfo] = useState<RollInfo | null>(null);
  const [guidedNote, setGuidedNote] = useState<string | null>(null);
  const [pendingField, setPendingField] = useState<EconomyField | null>(null);

  const actions        = actor.template?.actions ?? [];
  const selectedAction  = actions.find((a) => a.id === selectedActionId) ?? null;
  const targetName      = allParticipants.find((t) => t.id === targetId)?.displayName ?? "";
  const shouldToggleEconomy = pendingField !== null && !actor[pendingField];

  function selectEconomy(next: ActionEconomy) {
    setEconomy(next);
    setSelectedActionId(null);
    setUseIndex(1);
    setRollInfo(null);
    setGuidedNote(null);
    setPendingField(null);
  }

  function selectAction(action: TemplateActionView) {
    setSelectedActionId(action.id);
    setUseIndex(1);
    setRollInfo(null);
    setGuidedNote(null);
    setPendingField(null);
  }

  function cancel() {
    setEconomy(null);
    setSelectedActionId(null);
    setUseIndex(1);
    setRollInfo(null);
    setGuidedNote(null);
    setPendingField(null);
  }

  // Returns the rolled amount (as a string, ready for the host's amount
  // input) so the host can setAmount(...) itself — the hook doesn't own that
  // state. Returns null when there's nothing selected yet (host does
  // nothing, same as the pre-refactor early return).
  function roll(): string | null {
    if (!selectedAction || !economy) return null;
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

    setGuidedNote(noteBody);
    setPendingField(ECONOMY_FIELD[economy]);

    return amountTotal > 0 ? String(amountTotal) : "";
  }

  // Host calls this after its own dealDamage/healParticipant mutate()
  // resolves, but only when the confirmed amount came from a guided roll
  // (i.e. guidedNote was set) — advances to the next use of a multiattack or,
  // once uses are exhausted, resets the wizard.
  function advanceUse() {
    setGuidedNote(null);
    setPendingField(null);
    setRollInfo(null);
    if (selectedAction && useIndex < selectedAction.uses) {
      setUseIndex((i) => i + 1);
    } else {
      setEconomy(null);
      setSelectedActionId(null);
      setUseIndex(1);
    }
  }

  // Host calls this when the DM changes target — a pending roll's note is
  // only valid against the target it was rolled for.
  function resetForNewTarget() {
    setGuidedNote(null);
    setPendingField(null);
    setRollInfo(null);
  }

  return {
    actions,
    economy,
    selectedAction,
    useIndex,
    rollInfo,
    guidedNote,
    pendingField,
    shouldToggleEconomy,
    targetName,
    selectEconomy,
    selectAction,
    cancel,
    roll,
    advanceUse,
    resetForNewTarget,
  };
}
