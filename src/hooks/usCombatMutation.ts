"use client";

import { useTransition } from "react";
import { useCombatStore } from "@/stores/combatStore";

/**
 * useCombatMutation
 *
 * Single hook used by every component that mutates combat state.
 *
 * Pattern:
 *   1. Block if another mutation is in flight
 *   2. Take rollback snapshot
 *   3. Apply optimistic update immediately (UI feels instant)
 *   4. Call server action in background
 *   5. Success → clear error, release lock
 *   6. Failure → rollback store + show error toast
 */
export function useCombatMutation() {
  const [isPending, startTransition] = useTransition();
  const store = useCombatStore();

  async function mutate({
    optimistic,
    action,
  }: {
    // Runs immediately — pure store update, no async
    optimistic: () => void;
    // Async server call — must return { ok: true } or { ok: false; error: string }
    action: () => Promise<{ ok: boolean; error?: string }>;
  }) {
    // Block double-taps
    if (store.isMutating) return;

    // Save state for rollback
    store.takeSnapshot();

    // Update UI immediately
    optimistic();

    // Lock further mutations
    store.setMutating(true);

    startTransition(async () => {
      try {
        const result = await action();

        if (!result.ok) {
          store.rollback();
          store.setError(result.error ?? "Something went wrong. Try again.");
        } else {
          store.clearError();
          store.setMutating(false);
        }
      } catch (err) {
        store.rollback();
        store.setError(
          err instanceof Error
            ? err.message
            : "Network error. Check your connection."
        );
      }
    });
  }

  return {
    mutate,
    isMutating: store.isMutating || isPending,
  };
}
