"use client";

import { useState } from "react";

import { COMMON_CONDITIONS } from "@/lib/constants/conditions";

import { ConditionBadges } from "./ConditionBadges";

type Condition = {
  name: string;
};

type Props = {
  conditions: Condition[];
  disabled?: boolean;
  showConcentration?: boolean;
  onAddCondition: (name: string) => void;
  onRemoveCondition: (name: string) => void;
};

export function ConditionsPanel({
  conditions,
  disabled = false,
  showConcentration = false,
  onAddCondition,
  onRemoveCondition,
}: Props) {
  const [customCondition, setCustomCondition] = useState("");
  const [concentrationSpell, setConcentrationSpell] = useState("");

  function submitCustomCondition() {
    const trimmed = customCondition.trim();

    if (!trimmed) return;

    onAddCondition(trimmed);

    setCustomCondition("");
  }

  function submitConcentration() {
    const trimmed = concentrationSpell.trim();

    if (!trimmed) return;

    onAddCondition(`Concentration: ${trimmed}`);

    setConcentrationSpell("");
  }

  const availableConditions = COMMON_CONDITIONS.filter(
    (cn) => !conditions.some((c) => c.name === cn)
  );

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gothic-on-surface-variant uppercase tracking-widest">
        Condiciones
      </p>

      {/* Active conditions */}
      <ConditionBadges
        conditions={conditions}
        removable
        disabled={disabled}
        onRemove={onRemoveCondition}
      />

      {/* Concentration */}
      {showConcentration && (
        <div className="flex gap-2">
          <input
            type="text"
            value={concentrationSpell}
            disabled={disabled}
            placeholder="Concentrando en…"
            onChange={(e) => setConcentrationSpell(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                submitConcentration();
              }
            }}
            className="
              flex-1
              rounded-gothic-sm bg-gothic-surface-low px-3 h-11
              text-sm text-gothic-on-surface
              ring-1 ring-gothic-outline-variant
              shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)]
              placeholder:text-gothic-outline
              focus:outline-none focus:ring-gothic-primary
              transition-all
            "
          />

          <button
            type="button"
            disabled={disabled || !concentrationSpell.trim()}
            onClick={submitConcentration}
            className="
              rounded-gothic-sm ring-1 ring-gothic-brass-bright
              text-gothic-brass-bright
              px-3 h-11
              text-xs font-bold
              hover:bg-gothic-surface-high
              disabled:opacity-40
              transition-colors
              whitespace-nowrap
            "
          >
            + Conc.
          </button>
        </div>
      )}

      {/* Common conditions */}
      <div className="flex flex-wrap gap-1.5">
        {availableConditions.map((cn) => (
          <button
            key={cn}
            type="button"
            disabled={disabled}
            onClick={() => onAddCondition(cn)}
            className="
              text-xs
              ring-1 ring-gothic-outline-variant
              text-gothic-on-surface-variant
              px-2.5 py-1
              rounded-gothic-sm
              hover:bg-gothic-surface-high
              hover:text-gothic-on-surface
              hover:ring-gothic-outline
              transition-colors
              min-h-[32px]
              disabled:opacity-40
            "
          >
            + {cn}
          </button>
        ))}
      </div>

      {/* Custom condition */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customCondition}
          disabled={disabled}
          placeholder="Condición personalizada…"
          onChange={(e) => setCustomCondition(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              submitCustomCondition();
            }
          }}
          className="
            flex-1
            rounded-gothic-sm bg-gothic-surface-low px-3 h-11
            text-sm text-gothic-on-surface
            ring-1 ring-gothic-outline-variant
            shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)]
            placeholder:text-gothic-outline
            focus:outline-none focus:ring-gothic-primary
            transition-all
          "
        />

        <button
          type="button"
          disabled={disabled || !customCondition.trim()}
          onClick={submitCustomCondition}
          className="
            rounded-gothic-sm ring-1 ring-gothic-outline-variant
            text-gothic-on-surface-variant
            px-4 h-11
            text-sm
            hover:bg-gothic-surface-high
            disabled:opacity-40
            transition-colors
          "
        >
          Agregar
        </button>
      </div>
    </div>
  );
}