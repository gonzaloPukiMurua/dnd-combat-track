"use client";

import { useCombatStore } from "@/stores/combatStore";

/**
 * useCombatMutation
 *
 * Single hook used by every component that mutates combat state.
 *
 * Pattern:
 *   1. Apply the optimistic update immediately (the UI never waits or blocks)
 *   2. Queue the server call; calls run one at a time, in click order, so the
 *      server applies them in the same order the DM made them
 *   3. Success → clear error
 *   4. Failure → roll back to the last CONFIRMED state (this drops every
 *      optimistic change still pending), show the error, and skip the queued
 *      calls that were not sent yet
 *
 * The snapshot is taken when the queue is empty, so it always holds the last
 * confirmed server state. While a rollback is in flight, new calls are ignored
 * (they would otherwise apply on top of a state that is being discarded).
 *
 * The queue lives at module level on purpose: the store is a single instance
 * shared by every component, so the queue has to be too.
 */

let pending = 0;
let failing = false;
let queue: Promise<void> = Promise.resolve();

function settle() {
  pending -= 1;
  if (pending === 0) failing = false;
  useCombatStore.getState().setMutating(pending > 0);
}

export function useCombatMutation() {
  const storeIsMutating = useCombatStore((s) => s.isMutating);

  function mutate({
    optimistic,
    action,
  }: {
    // Runs immediately — pure store update, no async
    optimistic: () => void;
    // Async server call — must return { ok: true } or { ok: false; error: string }
    action: () => Promise<{ ok: boolean; error?: string }>;
  }) {
    if (failing) return;

    const store = useCombatStore.getState();
    if (pending === 0) store.takeSnapshot();

    optimistic();
    pending += 1;
    store.setMutating(true);

    queue = queue.then(async () => {
      if (failing) {
        settle();
        return;
      }

      let error: string | null = null;
      try {
        const result = await action();
        if (!result.ok) error = result.error ?? "Something went wrong. Try again.";
      } catch (err) {
        error = err instanceof Error ? err.message : "Network error. Check your connection.";
      }

      if (error) {
        failing = true;
        useCombatStore.getState().rollback();
        useCombatStore.getState().setError(error);
      } else {
        useCombatStore.getState().clearError();
      }
      settle();
    });
  }

  return {
    mutate,
    isMutating: storeIsMutating,
  };
}
