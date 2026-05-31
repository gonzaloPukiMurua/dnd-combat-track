"use client";

import { useEffect, useRef } from "react";
import {
  useCombatStore,
  type Participant,
  type LogEntry,
  type CombatStatus,
} from "@/stores/combatStore";

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
    console.log("HYDRATING", combat.id);

    useCombatStore.getState().hydrate(combat);
  }, [combat]);

  useEffect(() => {
    if (combatId !== combat.id) {
      useCombatStore.getState().hydrate(combat);
    }
  }, [combat.id, combatId, combat]);

  return null;
}