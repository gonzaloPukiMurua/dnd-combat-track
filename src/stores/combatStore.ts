import { create } from "zustand";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AcModifier = { source: string; value: number };
export type Condition  = { name: string };

export type Participant = {
  id:                 string;
  combatId:           string;
  templateId:         string;
  displayName:        string;
  initiative:         number;
  turnOrder:          number;
  maxHp:              number;
  currentHp:          number;
  tempHp:             number;
  baseAc:             number;
  acModifiers:        AcModifier[];
  conditions:         Condition[];
  isConscious:        boolean;
  isStabilized:       boolean;
  deathSaveSuccesses: number;
  deathSaveFailures:  number;
  actionUsed:         boolean;
  bonusUsed:          boolean;
  reactionUsed:       boolean;
  template: {
    id:              string;
    name:            string;
    type:            string;
    maxHp:           number;
    baseAc:          number;
    initiativeBonus: number;
  };
};

export type LogEntry = {
  id:        string;
  combatId:  string;
  round:     number;
  type:      "DAMAGE" | "HEAL" | "CONDITION_ADDED" | "CONDITION_REMOVED" | "NOTE";
  actorId:   string | null;
  targetId:  string | null;
  amount:    number | null;
  note:      string | null;
  createdAt: Date;
  actor:     { displayName: string } | null;
  target:    { displayName: string } | null;
};

export type CombatStatus = "SETUP" | "ACTIVE" | "FINISHED";

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
  currentActor:          () => Participant | null;
  consciousParticipants: () => Participant[];

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
  toggleAction:              (targetId: string, field: "actionUsed" | "bonusUsed" | "reactionUsed") => void;
  advanceTurnOptimistic:     () => void;
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

  consciousParticipants: () =>
    get().participants.filter((p) => p.isConscious),

  currentActor: () => {
    const { participants, currentTurnIndex } = get();
    const conscious = [...participants]
      .filter((p) => p.isConscious)
      .sort((a, b) => a.turnOrder - b.turnOrder);
    return conscious[currentTurnIndex] ?? null;
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
      let amount = rawAmount;
      let newTempHp = p.tempHp;
      let newHp = p.currentHp;
      if (newTempHp > 0) {
        const absorbed = Math.min(newTempHp, amount);
        newTempHp -= absorbed;
        amount    -= absorbed;
      }
      if (amount > 0) newHp = Math.max(0, newHp - amount);
      return { ...p, currentHp: newHp, tempHp: newTempHp, isConscious: newHp > 0 };
    }),
  })),

  applyHeal: (targetId, amount) => set((state) => ({
    participants: state.participants.map((p) => {
      if (p.id !== targetId) return p;
      const newHp = Math.min(p.maxHp, p.currentHp + amount);
      return { ...p, currentHp: newHp, isConscious: newHp > 0 };
    }),
  })),

  applyTempHp: (targetId, amount) => set((state) => ({
    participants: state.participants.map((p) => {
      if (p.id !== targetId) return p;
      return { ...p, tempHp: Math.max(p.tempHp, amount) };
    }),
  })),

  applyCondition: (targetId, condition) => set((state) => ({
    participants: state.participants.map((p) => {
      if (p.id !== targetId) return p;
      if (p.conditions.some((c) => c.name.toLowerCase() === condition.toLowerCase())) return p;
      return { ...p, conditions: [...p.conditions, { name: condition }] };
    }),
  })),

  removeConditionOptimistic: (targetId, condition) => set((state) => ({
    participants: state.participants.map((p) => {
      if (p.id !== targetId) return p;
      return {
        ...p,
        conditions: p.conditions.filter(
          (c) => c.name.toLowerCase() !== condition.toLowerCase()
        ),
      };
    }),
  })),

  toggleAction: (targetId, field) => set((state) => ({
    participants: state.participants.map((p) => {
      if (p.id !== targetId) return p;
      return { ...p, [field]: !p[field] };
    }),
  })),

  advanceTurnOptimistic: () => set((state) => {
    const conscious = [...state.participants]
      .filter((p) => p.isConscious)
      .sort((a, b) => a.turnOrder - b.turnOrder);

    if (conscious.length === 0) return {};

    let nextIndex = state.currentTurnIndex + 1;
    let nextRound = state.round;

    if (nextIndex >= conscious.length) {
      nextIndex = 0;
      nextRound += 1;
    }

    const participants = state.participants.map((p) => ({
      ...p,
      actionUsed:   false,
      bonusUsed:    false,
      reactionUsed: false,
    }));

    return { currentTurnIndex: nextIndex, round: nextRound, participants };
  }),

  applyDeathSave: (targetId, result) => set((state) => ({
    participants: state.participants.map((p) => {
      if (p.id !== targetId) return p;
      let { deathSaveSuccesses, deathSaveFailures, isStabilized } = p;
      if (result === "success") {
        deathSaveSuccesses = Math.min(3, deathSaveSuccesses + 1);
        if (deathSaveSuccesses >= 3) isStabilized = true;
      } else {
        deathSaveFailures = Math.min(3, deathSaveFailures + 1);
      }
      return { ...p, deathSaveSuccesses, deathSaveFailures, isStabilized };
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
