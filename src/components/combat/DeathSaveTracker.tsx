"use client";

import { useCombatStore } from "@/stores/combatStore";
import { useCombatMutation } from "@/hooks/useCombatMutation";

import {
  recordDeathSave,
  resetDeathSaves,
} from "@/lib/actions/participant";

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();

  for (const [k, v] of Object.entries(fields)) {
    fd.set(k, v);
  }

  return fd;
}

type Props = {
  participantId: string;
  combatId: string;
  displayName: string;
  deathSaveSuccesses: number;
  deathSaveFailures: number;
  isStabilized: boolean;
};

// ─────────────────────────────────────────────────────────────

function Pips({
  count,
  total = 3,
  filled,
  empty,
}: {
  count: number;
  total?: number;
  filled: string;
  empty: string;
}) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`
            w-5 h-5 rounded-full border-2 transition-all
            ${i < count ? filled : empty}
          `}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

export function DeathSaveTracker({
  participantId,
  combatId,
  displayName,
  deathSaveSuccesses,
  deathSaveFailures,
  isStabilized,
}: Props) {
  const store = useCombatStore();

  const { mutate, isMutating } = useCombatMutation();

  const isDead = deathSaveFailures >= 3;

  function handleSave(result: "success" | "failure") {
    mutate({
      optimistic: () => {
        store.applyDeathSave(participantId, result);
      },

      action: () =>
        recordDeathSave(
          makeFormData({
            combatId,
            targetId: participantId,
            result,
          })
        ),
    });
  }

  function handleReset() {
    mutate({
      optimistic: () => {
        store.hydrate({
          id: store.combatId!,
          name: store.combatName,
          status: store.status,
          round: store.round,
          currentTurnIndex: store.currentTurnIndex,

          participants: store.participants.map((p) => {
            if (p.id !== participantId) return p;

            return {
              ...p,
              deathSaveSuccesses: 0,
              deathSaveFailures: 0,
              isStabilized: false,
            };
          }),

          logs: store.logs,
        });
      },

      action: () =>
        resetDeathSaves(
          makeFormData({
            combatId,
            targetId: participantId,
          })
        ),
    });
  }

  return (
    <div
      className={`
        rounded-xl border-2 px-4 py-3 space-y-3 transition-all
        ${
          isDead
            ? "border-red-300 bg-red-50"
            : isStabilized
            ? "border-green-300 bg-green-50"
            : "border-yellow-300 bg-yellow-50"
        }
        ${isMutating ? "opacity-60 pointer-events-none" : ""}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">
            {isDead ? "💀" : isStabilized ? "💚" : "⚠️"}
          </span>

          <div>
            <p className="text-sm font-semibold text-gray-800">
              {isDead
                ? `${displayName} is dead`
                : isStabilized
                ? `${displayName} is stable`
                : `${displayName} — Death Saves`}
            </p>

            {!isDead && !isStabilized && (
              <p className="text-xs text-gray-500">
                Roll d20 at start of turn · 10+ success
              </p>
            )}
          </div>
        </div>

        {/* Reset */}
        <button
          type="button"
          onClick={handleReset}
          disabled={isMutating}
          className="
            text-xs text-gray-400 hover:text-gray-600
            underline disabled:opacity-40
          "
        >
          Reset
        </button>
      </div>

      {/* Pips */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-green-700 uppercase tracking-wide">
            Successes
          </p>

          <Pips
            count={deathSaveSuccesses}
            filled="bg-green-500 border-green-500"
            empty="border-green-300 bg-white"
          />
        </div>

        <div className="space-y-1 text-right">
          <p className="text-xs font-medium text-red-700 uppercase tracking-wide">
            Failures
          </p>

          <Pips
            count={deathSaveFailures}
            filled="bg-red-500 border-red-500"
            empty="border-red-300 bg-white"
          />
        </div>
      </div>

      {/* Buttons */}
      {!isStabilized && !isDead && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleSave("success")}
            disabled={isMutating}
            className="
              h-11 rounded-xl bg-green-500 text-white
              text-sm font-semibold hover:bg-green-600
              disabled:opacity-40 transition-colors
            "
          >
            ✓ Success
          </button>

          <button
            type="button"
            onClick={() => handleSave("failure")}
            disabled={isMutating}
            className="
              h-11 rounded-xl bg-red-500 text-white
              text-sm font-semibold hover:bg-red-600
              disabled:opacity-40 transition-colors
            "
          >
            ✕ Failure
          </button>
        </div>
      )}

      {/* Stable */}
      {isStabilized && (
        <p className="text-sm text-green-700 text-center font-medium">
          Stable — no more saves needed
        </p>
      )}

      {/* Dead */}
      {isDead && (
        <p className="text-sm text-red-700 text-center font-medium">
          3 failed saves — character is dead
        </p>
      )}
    </div>
  );
}