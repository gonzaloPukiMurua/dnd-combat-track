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
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
        Conditions
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
            placeholder="Concentrating on…"
            onChange={(e) => setConcentrationSpell(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                submitConcentration();
              }
            }}
            className="
              flex-1
              border-2 border-slate-600
              rounded-xl px-3 h-11
              text-sm
              bg-slate-800 text-white
              focus:outline-none
              focus:border-purple-500
            "
          />

          <button
            type="button"
            disabled={disabled || !concentrationSpell.trim()}
            onClick={submitConcentration}
            className="
              border-2 border-purple-600
              text-purple-400
              rounded-xl px-3 h-11
              text-xs font-bold
              hover:bg-purple-900/40
              disabled:opacity-40
              transition-colors
              whitespace-nowrap
            "
          >
            + Conc
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
              border border-slate-600
              text-slate-400
              px-2.5 py-1
              rounded-lg
              hover:bg-purple-900/40
              hover:text-purple-300
              hover:border-purple-700
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
          placeholder="Custom condition…"
          onChange={(e) => setCustomCondition(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              submitCustomCondition();
            }
          }}
          className="
            flex-1
            border-2 border-slate-600
            rounded-xl px-3 h-11
            text-sm
            bg-slate-800 text-white
            focus:outline-none
            focus:border-blue-500
          "
        />

        <button
          type="button"
          disabled={disabled || !customCondition.trim()}
          onClick={submitCustomCondition}
          className="
            border-2 border-slate-600
            text-slate-400
            rounded-xl px-4 h-11
            text-sm
            hover:bg-slate-700
            disabled:opacity-40
            transition-colors
          "
        >
          Add
        </button>
      </div>
    </div>
  );
}