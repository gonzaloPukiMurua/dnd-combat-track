import { create } from "zustand";
import type { AcModifier, Condition, Participant, LogEntry, CombatStatus } from "@/domain/combat/types";
import {
  applyDamage as ruleApplyDamage,
  applyHeal as ruleApplyHeal,
  applyTempHp as ruleApplyTempHp,
  addCondition as ruleAddCondition,
  removeCondition as ruleRemoveCondition,
  applyDeathSave as ruleApplyDeathSave,
  computeCurrentActor,
  computeAdvanceTurn,
  computeTurnOrder,
  relocateCurrentActor,
} from "@/domain/combat/rules";

export type { AcModifier, Condition, Participant, LogEntry, CombatStatus };

// ─── State shape ──────────────────────────────────────────────────────────────

type CombatState = {
  combatId:         string | null;
  combatName:       string;
  status:           CombatStatus;
  round:            number;
  currentTurnIndex: number;
  participants:     Participant[];
  logs:             LogEntry[];
  isMutating:       boolean;
  error:            string | null;
  _snapshot:        Omit<CombatState, "_snapshot" | keyof CombatActions> | null;
} & CombatActions;

type CombatActions = {
  // Derived
  currentActor: () => Participant | null;

  // Hydration — called once on page load
  hydrate: (data: {
    id: string; name: string; status: CombatStatus;
    round: number; currentTurnIndex: number;
    participants: Participant[]; logs: LogEntry[];
  }) => void;

  // Optimistic mutations
  applyDamage:               (targetId: string, amount: number) => void;
  applyHeal:                 (targetId: string, amount: number) => void;
  applyTempHp:               (targetId: string, amount: number) => void;
  applyCondition:            (targetId: string, condition: string) => void;
  removeConditionOptimistic: (targetId: string, condition: string) => void;
  resetDeathSavesOptimistic: (targetId: string) => void;
  toggleAction:              (targetId: string, field: "actionUsed" | "bonusUsed" | "reactionUsed") => void;
  advanceTurnOptimistic:     () => void;
  reorderParticipantsOptimistic: (orderedIds: string[]) => void;
  setParticipantInitiativeOptimistic: (participantId: string, initiative: number) => void;
  applyDeathSave:            (targetId: string, result: "success" | "failure") => void;
  appendLog:                 (entry: LogEntry) => void;

  // Snapshot / rollback
  takeSnapshot: () => void;
  rollback:     () => void;

  // Mutation flags
  setMutating: (v: boolean) => void;
  setError:    (msg: string | null) => void;
  clearError:  () => void;
};

// ─── Store implementation ─────────────────────────────────────────────────────

export const useCombatStore = create<CombatState>((set, get) => ({
  combatId:         null,
  combatName:       "",
  status:           "SETUP",
  round:            0,
  currentTurnIndex: 0,
  participants:     [],
  logs:             [],
  isMutating:       false,
  error:            null,
  _snapshot:        null,

  // ── Derived ───────────────────────────────────────────────────────────────

  currentActor: () => {
    const { participants, currentTurnIndex } = get();
    return computeCurrentActor(participants, currentTurnIndex);
  },

  // ── Hydration ─────────────────────────────────────────────────────────────

  hydrate: (data) => set({
    combatId:         data.id,
    combatName:       data.name,
    status:           data.status,
    round:            data.round,
    currentTurnIndex: data.currentTurnIndex,
    participants: data.participants.map((p) => ({
      ...p,
      acModifiers: (p.acModifiers as unknown as AcModifier[]) ?? [],
      conditions:  (p.conditions  as unknown as Condition[])  ?? [],
    })),
    logs: data.logs,
  }),

  // ── Optimistic mutations ──────────────────────────────────────────────────

  applyDamage: (targetId, rawAmount) => set((state) => ({
    participants: state.participants.map((p) => {
      if (p.id !== targetId) return p;
      const result = ruleApplyDamage(p, rawAmount);
      return { ...p, ...result };
    }),
  })),

  applyHeal: (targetId, amount) => set((state) => ({
    participants: state.participants.map((p) => {
      if (p.id !== targetId) return p;
      const healed = ruleApplyHeal(p, amount);
      return {
        ...p,
        currentHp:   healed.currentHp,
        isConscious: healed.isConscious,
        ...(healed.regainedConsciousness
          ? {
              deathSaveSuccesses: healed.deathSaveSuccesses!,
              deathSaveFailures:  healed.deathSaveFailures!,
              isStabilized:       healed.isStabilized!,
            }
          : {}),
      };
    }),
  })),

  applyTempHp: (targetId, amount) => set((state) => ({
    participants: state.participants.map((p) => {
      if (p.id !== targetId) return p;
      return { ...p, tempHp: ruleApplyTempHp(p, amount) };
    }),
  })),

  applyCondition: (targetId, condition) => set((state) => ({
    participants: state.participants.map((p) => {
      if (p.id !== targetId) return p;
      return { ...p, conditions: ruleAddCondition(p.conditions, condition) };
    }),
  })),

  removeConditionOptimistic: (targetId, condition) => set((state) => ({
    participants: state.participants.map((p) => {
      if (p.id !== targetId) return p;
      return { ...p, conditions: ruleRemoveCondition(p.conditions, condition) };
    }),
  })),

  toggleAction: (targetId, field) => set((state) => ({
    participants: state.participants.map((p) => {
      if (p.id !== targetId) return p;
      return { ...p, [field]: !p[field] };
    }),
  })),

  advanceTurnOptimistic: () => set((state) => {
    const advance = computeAdvanceTurn(state.participants, state.currentTurnIndex, state.round);
    if (!advance) return {};

    const { nextIndex, nextRound, nextActorId } = advance;

    const participants = state.participants.map((p) => ({
      ...p,
      actionUsed:   p.id === nextActorId ? false : p.actionUsed,
      bonusUsed:    p.id === nextActorId ? false : p.bonusUsed,
      reactionUsed: p.id === nextActorId ? false : p.reactionUsed,
    }));

    return { currentTurnIndex: nextIndex, round: nextRound, participants };
  }),

  reorderParticipantsOptimistic: (orderedIds) => set((state) => {
    const currentActorId = computeCurrentActor(state.participants, state.currentTurnIndex)?.id ?? null;

    // Rebuild the array in the new order — the list renders in array order,
    // so just updating turnOrder in place wouldn't move anything on screen.
    const byId = new Map(state.participants.map((p) => [p.id, p]));
    const reordered = orderedIds.flatMap((id, turnOrder) => {
      const p = byId.get(id);
      return p ? [{ ...p, turnOrder }] : [];
    });
    const missing = state.participants.filter((p) => !byId.has(p.id) || !orderedIds.includes(p.id));
    const participants = [...reordered, ...missing];

    const currentTurnIndex = relocateCurrentActor(participants, currentActorId, state.currentTurnIndex);

    return { participants, currentTurnIndex };
  }),

  // S2-9 — mirror of setParticipantInitiative: set one initiative, then rebuild
  // turnOrder for everyone via the shared rule and rebuild the array in that
  // order (the list renders in array order). Keeps the current actor's slot.
  setParticipantInitiativeOptimistic: (participantId, initiative) => set((state) => {
    const currentActorId =
      computeCurrentActor(state.participants, state.currentTurnIndex)?.id ?? null;

    const orderById = new Map(
      computeTurnOrder(
        state.participants.map((p) => ({
          id:              p.id,
          initiative:      p.id === participantId ? initiative : p.initiative,
          initiativeBonus: p.template.initiativeBonus,
        }))
      ).map((t) => [t.id, t.turnOrder])
    );

    const participants = state.participants
      .map((p) => ({
        ...p,
        initiative: p.id === participantId ? initiative : p.initiative,
        turnOrder:  orderById.get(p.id) ?? p.turnOrder,
      }))
      .sort((a, b) => a.turnOrder - b.turnOrder);

    const currentTurnIndex = relocateCurrentActor(
      participants,
      currentActorId,
      state.currentTurnIndex
    );

    return { participants, currentTurnIndex };
  }),

  applyDeathSave: (targetId, result) => set((state) => ({
    participants: state.participants.map((p) => {
      if (p.id !== targetId) return p;
      return { ...p, ...ruleApplyDeathSave(p, result) };
    }),
  })),

  resetDeathSavesOptimistic: (targetId) => set((state) => ({
    participants: state.participants.map((p) => {
      if (p.id !== targetId) return p;
      return {
        ...p,
        deathSaveSuccesses: 0,
        deathSaveFailures: 0,
        isStabilized: false,
      };
    }),
  })),

  appendLog: (entry) => set((state) => ({
    logs: [...state.logs, entry],
  })),

  // ── Snapshot / rollback ───────────────────────────────────────────────────

  takeSnapshot: () => {
    const { combatId, combatName, status, round, currentTurnIndex, participants, logs } = get();
    set({ _snapshot: { combatId, combatName, status, round, currentTurnIndex, participants, logs, isMutating: false, error: null } });
  },

  rollback: () => {
    const snap = get()._snapshot;
    if (!snap) return;
    set({ ...snap, _snapshot: null, isMutating: false });
  },

  // ── Mutation flags ────────────────────────────────────────────────────────

  setMutating: (v) => set({ isMutating: v }),
  setError:    (msg) => set({ error: msg }),
  clearError:  () => set({ error: null }),
}));
