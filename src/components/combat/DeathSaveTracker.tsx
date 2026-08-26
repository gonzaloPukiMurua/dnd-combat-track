"use client";

import { useCombatStore } from "@/stores/combatStore";
import { useCombatMutation } from "@/hooks/useCombatMutation";

import {
  recordDeathSave,
  resetDeathSaves,
} from "@/lib/actions/participant";

import { makeFormData } from "@/lib/utils/formData";

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

  const { mutate, isMutating } = useCombatMutation();

  const isDead = deathSaveFailures >= 3;

  function handleSave(result: "success" | "failure") {
    mutate({
      optimistic: () => {
        useCombatStore.getState().applyDeathSave(participantId, result);
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
      optimistic: () => useCombatStore.getState().resetDeathSavesOptimistic(participantId),
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
        rounded-gothic-md ring-1 px-4 py-3 space-y-3 transition-all
        ${
          isDead
            ? "ring-gothic-danger-bright bg-gothic-danger/20"
            : isStabilized
            ? "ring-gothic-success-text bg-gothic-success-bg/40"
            : "ring-gothic-brass-bright bg-gothic-surface-low"
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
            <p className="text-sm font-semibold text-gothic-on-surface">
              {isDead
                ? `${displayName} está muerto`
                : isStabilized
                ? `${displayName} está estable`
                : `${displayName} — Salvaciones de muerte`}
            </p>

            {!isDead && !isStabilized && (
              <p className="text-xs text-gothic-on-surface-variant">
                Tirá d20 al inicio del turno · 10+ es éxito
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
            text-xs text-gothic-on-surface-variant hover:text-gothic-on-surface
            underline disabled:opacity-40
          "
        >
          Reiniciar
        </button>
      </div>

      {/* Pips */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-gothic-success-text uppercase tracking-wide">
            Éxitos
          </p>

          <Pips
            count={deathSaveSuccesses}
            filled="bg-gothic-success-text border-gothic-success-text"
            empty="border-gothic-outline-variant bg-gothic-surface-low"
          />
        </div>

        <div className="space-y-1 text-right">
          <p className="text-xs font-medium text-gothic-danger-bright uppercase tracking-wide">
            Fallos
          </p>

          <Pips
            count={deathSaveFailures}
            filled="bg-gothic-danger-bright border-gothic-danger-bright"
            empty="border-gothic-outline-variant bg-gothic-surface-low"
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
              h-11 rounded-gothic-sm bg-gothic-success-bg text-gothic-success-text
              text-sm font-semibold hover:brightness-110
              disabled:opacity-40 transition-colors
            "
          >
            ✓ Éxito
          </button>

          <button
            type="button"
            onClick={() => handleSave("failure")}
            disabled={isMutating}
            className="
              h-11 rounded-gothic-sm bg-gothic-wine text-gothic-on-surface
              text-sm font-semibold hover:bg-gothic-danger
              disabled:opacity-40 transition-colors
            "
          >
            ✕ Fallo
          </button>
        </div>
      )}

      {/* Stable */}
      {isStabilized && (
        <p className="text-sm text-gothic-success-text text-center font-medium">
          Estable — no necesita más tiradas
        </p>
      )}

      {/* Dead */}
      {isDead && (
        <p className="text-sm text-gothic-danger-bright text-center font-medium">
          3 fallos — el personaje murió
        </p>
      )}
    </div>
  );
}