"use client";

import { useEffect } from "react";
import { useCombatStore, type Participant, type LogEntry, type CombatStatus } from "@/stores/combatStore";

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
  // Hydrate immediately — before children render
  // getState() is called outside React's render cycle so no ref needed
  const store = useCombatStore.getState();
  if (store.combatId !== combat.id) {
    store.hydrate(combat);
  }

  // Re-hydrate if combat prop changes (navigating between combats)
  useEffect(() => {
    useCombatStore.getState().hydrate(combat);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combat.id]);

  return null;
}