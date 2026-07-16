"use client";

import { useEffect } from "react";
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
  useEffect(() => {
    useCombatStore.getState().hydrate(combat);
  }, [combat]);

  return null;
}