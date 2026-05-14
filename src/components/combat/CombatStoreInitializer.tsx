"use client";

import { useEffect, useRef } from "react";
import { useCombatStore, type Participant, type LogEntry, type CombatStatus } from "@/stores/combatStore";

type Props = {
  combat: {
    id:               string;
    name:             string;
    status:           CombatStatus;
    round:            number;
    currentTurnIndex: number;
    participants:     Participant[];
    logs:             LogEntry[];
  };
};

/**
 * CombatStoreInitializer
 *
 * Renders nothing — its only job is to hydrate the Zustand store
 * once when the combat page first mounts.
 *
 * Why a separate component instead of hydrating in the page?
 * The combat page is a Server Component. It can't call hooks.
 * This client component receives the server data as props and
 * bridges it into the store.
 *
 * The `hasHydrated` ref prevents re-hydration on subsequent renders
 * (e.g. React Strict Mode double-invoke in dev).
 */
export function CombatStoreInitializer({ combat }: Props) {
  const hydrate     = useCombatStore((s) => s.hydrate);
  const hasHydrated = useRef(false);

  useEffect(() => {
    if (hasHydrated.current) return;
    hasHydrated.current = true;
    hydrate(combat);
  }, [combat, hydrate]);

  return null;
}
