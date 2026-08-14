"use client";

import { useEffect } from "react";
import { useCombatStore } from "@/stores/combatStore";
import type { Participant, LogEntry, CombatStatus } from "@/domain/combat/types";

type Props = {
  combat: {
    id: string;
    name: string;
    status: CombatStatus;
    round: number;
    currentTurnIndex: number;
    participants: Participant[];
    logs: LogEntry[];
  };
};

export function CombatStoreInitializer({ combat }: Props) {
  const combatId = useCombatStore((s) => s.combatId);

  useEffect(() => {
    if (combatId !== combat.id) {
      useCombatStore.getState().hydrate(combat);
    }
  }, [combat.id, combatId, combat]);

  return null;
}