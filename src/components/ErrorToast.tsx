"use client";

import { useEffect } from "react";
import { useCombatStore } from "@/stores/combatStore";

/**
 * ErrorToast
 *
 * Reads the error field from the combat store.
 * Auto-dismisses after 4 seconds.
 * Sits fixed at the top of the screen, above everything including the nav.
 *
 * Place this once inside the combat/[id]/page.tsx client wrapper.
 */
export function ErrorToast() {
  const error     = useCombatStore((s) => s.error);
  const clearError = useCombatStore((s) => s.clearError);

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(clearError, 4000);
    return () => clearTimeout(timer);
  }, [error, clearError]);

  if (!error) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
    >
      <div className="flex items-start gap-3 bg-red-600 text-white px-4 py-3 rounded-2xl shadow-xl">
        {/* Icon */}
        <span className="text-lg flex-shrink-0 mt-0.5">⚠️</span>

        {/* Message */}
        <p className="flex-1 text-sm font-medium leading-snug">{error}</p>

        {/* Dismiss button */}
        <button
          type="button"
          onClick={clearError}
          aria-label="Dismiss error"
          className="flex-shrink-0 text-red-200 hover:text-white transition-colors text-lg leading-none"
        >
          ✕
        </button>
      </div>

      {/* Progress bar showing time until auto-dismiss */}
      <div className="h-1 bg-red-800 rounded-full mt-1 mx-1 overflow-hidden">
        <div className="h-full bg-red-300 rounded-full animate-[shrink_4s_linear_forwards]" />
      </div>
    </div>
  );
}
