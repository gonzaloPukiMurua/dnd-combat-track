// Pure combat-rules functions — no React, no Prisma, no Zustand.
// Shared by the optimistic client store (stores/combatStore.ts) and the
// server actions (lib/actions/{combat,participant}.ts) so both sides of a
// mutation compute the exact same result.

import type { Condition } from "./types";

// ─── Damage / heal / temp HP ───────────────────────────────────────────────

export type DamageResult = { currentHp: number; tempHp: number; isConscious: boolean };

export function applyDamage(
  target: { currentHp: number; tempHp: number },
  rawAmount: number
): DamageResult {
  let amount = rawAmount;
  let newTempHp = target.tempHp;
  let newHp = target.currentHp;

  if (newTempHp > 0) {
    const absorbed = Math.min(newTempHp, amount);
    newTempHp -= absorbed;
    amount -= absorbed;
  }
  if (amount > 0) newHp = Math.max(0, newHp - amount);

  return { currentHp: newHp, tempHp: newTempHp, isConscious: newHp > 0 };
}

export type HealResult = {
  currentHp: number;
  isConscious: boolean;
  regainedConsciousness: boolean;
  deathSaveSuccesses?: number;
  deathSaveFailures?: number;
  isStabilized?: boolean;
};

export function applyHeal(
  target: { currentHp: number; maxHp: number },
  amount: number
): HealResult {
  const wasDown = target.currentHp === 0;
  const newHp = Math.min(target.maxHp, target.currentHp + amount);
  const isConscious = newHp > 0;
  const regainedConsciousness = wasDown && isConscious;

  return {
    currentHp: newHp,
    isConscious,
    regainedConsciousness,
    ...(regainedConsciousness
      ? { deathSaveSuccesses: 0, deathSaveFailures: 0, isStabilized: false }
      : {}),
  };
}

export function applyTempHp(target: { tempHp: number }, amount: number): number {
  return Math.max(target.tempHp, amount);
}

// ─── Conditions ─────────────────────────────────────────────────────────────

export function addCondition(current: Condition[], name: string): Condition[] {
  if (current.some((c) => c.name.toLowerCase() === name.toLowerCase())) return current;
  return [...current, { name }];
}

export function removeCondition(current: Condition[], name: string): Condition[] {
  return current.filter((c) => c.name.toLowerCase() !== name.toLowerCase());
}

// ─── Death saves ──────────────────────────────────────────────────────────

export type DeathSaveResult = {
  deathSaveSuccesses: number;
  deathSaveFailures: number;
  isStabilized: boolean;
};

export function applyDeathSave(
  target: { deathSaveSuccesses: number; deathSaveFailures: number; isStabilized: boolean },
  result: "success" | "failure"
): DeathSaveResult {
  let { deathSaveSuccesses, deathSaveFailures, isStabilized } = target;

  if (result === "success") {
    deathSaveSuccesses = Math.min(3, deathSaveSuccesses + 1);
    if (deathSaveSuccesses >= 3) isStabilized = true;
  } else {
    deathSaveFailures = Math.min(3, deathSaveFailures + 1);
  }

  return { deathSaveSuccesses, deathSaveFailures, isStabilized };
}

// ─── Initiative → turn order ────────────────────────────────────────────────
// Single source of truth for how an initiative list becomes a turn order:
// sort by initiative descending, break ties by the template's initiativeBonus
// (higher bonus goes first), then turnOrder = resulting index. Same-template
// ties (equal bonus) fall back to JS's stable sort — no manual DM tiebreak.
// Used by startCombat (initial d20 roll) and setParticipantInitiative (S2-9,
// a late edit while ACTIVE) so both produce identical orderings.

export type InitiativeParticipant = {
  id: string;
  initiative: number;
  initiativeBonus: number;
};

export function computeTurnOrder<T extends InitiativeParticipant>(
  participants: T[]
): { id: string; turnOrder: number }[] {
  return [...participants]
    .sort((a, b) => {
      if (b.initiative !== a.initiative) return b.initiative - a.initiative;
      return b.initiativeBonus - a.initiativeBonus;
    })
    .map((p, index) => ({ id: p.id, turnOrder: index }));
}

// ─── Turn order ─────────────────────────────────────────────────────────────
// Unconscious-but-not-dead participants stay in initiative; 3 failed death
// saves removes them from the active rotation.

export type TurnParticipant = { id: string; turnOrder: number; deathSaveFailures: number };

export function activeTurnOrder<T extends TurnParticipant>(participants: T[]): T[] {
  return [...participants]
    .filter((p) => p.deathSaveFailures < 3)
    .sort((a, b) => a.turnOrder - b.turnOrder);
}

export function computeCurrentActor<T extends TurnParticipant>(
  participants: T[],
  currentTurnIndex: number
): T | null {
  const active = activeTurnOrder(participants);
  if (active.length === 0) return null;
  const safeIndex = Math.min(currentTurnIndex, active.length - 1);
  return active[safeIndex] ?? null;
}

// After a manual reorder, the positional index no longer points at whoever
// was acting — relocate it by following the actor's id into the new order
// instead of trusting the old index.
export function relocateCurrentActor<T extends TurnParticipant>(
  participants: T[],
  currentActorId: string | null,
  fallbackIndex: number
): number {
  const active = activeTurnOrder(participants);
  if (active.length === 0) return 0;

  if (currentActorId !== null) {
    const idx = active.findIndex((p) => p.id === currentActorId);
    if (idx !== -1) return idx;
  }

  return Math.min(fallbackIndex, active.length - 1);
}

export type AdvanceTurnResult = {
  nextIndex: number;
  nextRound: number;
  nextActorId: string | null;
};

export function computeAdvanceTurn<T extends TurnParticipant>(
  participants: T[],
  currentTurnIndex: number,
  currentRound: number
): AdvanceTurnResult | null {
  const active = activeTurnOrder(participants);
  if (active.length === 0) return null;

  const safeCurrentIndex = Math.min(currentTurnIndex, active.length - 1);
  let nextIndex = safeCurrentIndex + 1;
  let nextRound = currentRound;

  if (nextIndex >= active.length) {
    nextIndex = 0;
    nextRound += 1;
  }

  return { nextIndex, nextRound, nextActorId: active[nextIndex]?.id ?? null };
}
