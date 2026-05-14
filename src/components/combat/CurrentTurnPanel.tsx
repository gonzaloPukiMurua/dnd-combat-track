"use client";

import { useState } from "react";
import { useCombatStore } from "@/stores/combatStore";
import { useCombatMutation } from "@/hooks/useCombatMutation";

import {
  dealDamage,
  healParticipant,
  toggleActionState,
} from "@/lib/actions/participant";

import { advanceTurn } from "@/lib/actions/combat";

type ParticipantSummary = {
  id: string;
  displayName: string;
  isConscious: boolean;
  currentHp: number;
  maxHp: number;
  tempHp: number;
};

type CurrentActor = {
  id: string;
  displayName: string;
  currentHp: number;
  maxHp: number;
  tempHp: number;
  actionUsed: boolean;
  bonusUsed: boolean;
  reactionUsed: boolean;
};

function makeFormData(fields: Record<string, string | number>): FormData {
  const fd = new FormData();

  for (const [k, v] of Object.entries(fields)) {
    fd.set(k, String(v));
  }

  return fd;
}

function hpBarColor(pct: number) {
  if (pct > 60) return "bg-green-500";
  if (pct > 30) return "bg-yellow-400";
  return "bg-red-500";
}

export function CurrentTurnPanel({
  actor,
  combatId,
  round,
  allParticipants,
  globalMutating,
}: {
  actor: CurrentActor;
  combatId: string;
  round: number;
  allParticipants: ParticipantSummary[];
  globalMutating: boolean;
}) {
  const store = useCombatStore();
  const { mutate, isMutating } = useCombatMutation();

  const [amount, setAmount] = useState("");
  const [targetId, setTargetId] = useState(actor.id);
  const [expanded, setExpanded] = useState(true);

  const disabled = isMutating || globalMutating;

  const hpPct =
    actor.maxHp > 0
      ? Math.max(0, Math.round((actor.currentHp / actor.maxHp) * 100))
      : 0;

  const barColor = hpBarColor(hpPct);

  const selectedTarget = allParticipants.find(
    (p) => p.id === targetId
  );

  function handleDamage() {
    const n = parseInt(amount);

    if (!n || n < 1) return;

    mutate({
      optimistic: () => store.applyDamage(targetId, n),

      action: async () => {
        const result = await dealDamage(
          makeFormData({
            combatId,
            actorId: actor.id,
            targetId,
            amount: n,
          })
        );

        setAmount("");

        return result;
      },
    });
  }

  function handleHeal() {
    const n = parseInt(amount);

    if (!n || n < 1) return;

    mutate({
      optimistic: () => store.applyHeal(targetId, n),

      action: async () => {
        const result = await healParticipant(
          makeFormData({
            combatId,
            actorId: actor.id,
            targetId,
            amount: n,
          })
        );

        setAmount("");

        return result;
      },
    });
  }

  function handleToggle(
    field: "actionUsed" | "bonusUsed" | "reactionUsed"
  ) {
    mutate({
      optimistic: () => store.toggleAction(actor.id, field),

      action: () =>
        toggleActionState(
          makeFormData({
            combatId,
            targetId: actor.id,
            field,
          })
        ),
    });
  }

  function handleEndTurn() {
    mutate({
      optimistic: () => {
        store.advanceTurnOptimistic();
      },

      action: async () => {
        const result = await advanceTurn(combatId);

        setAmount("");

        return result;
      },
    });
  }

  return (
    <div
      className={`
        fixed bottom-16 sm:bottom-0 left-0 right-0 z-30
        transition-all duration-200
        ${disabled ? "opacity-70" : ""}
      `}
    >
      <div className="max-w-2xl mx-auto px-2 pb-2">
        <div className="bg-slate-900 border border-blue-500/40 rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="
              w-full px-4 py-2.5 flex items-center gap-3
              bg-blue-950/40 border-b border-blue-900/40
              active:bg-blue-900/40 transition-colors
            "
          >
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />

            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold text-blue-100 truncate text-sm leading-tight">
                {actor.displayName}
              </p>

              <p className="text-xs text-blue-400">
                Round {round}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-16 bg-slate-700 rounded-full h-1.5 hidden sm:block">
                <div
                  className={`h-1.5 rounded-full transition-all ${barColor}`}
                  style={{ width: `${hpPct}%` }}
                />
              </div>

              <span className="text-xs font-mono text-blue-100 whitespace-nowrap">
                <strong>{actor.currentHp}</strong>

                <span className="text-blue-400">
                  /{actor.maxHp}
                </span>

                {actor.tempHp > 0 && (
                  <span className="text-cyan-400">
                    {" "}
                    +{actor.tempHp}
                  </span>
                )}
              </span>
            </div>

            <span className="text-blue-400 text-xs flex-shrink-0 ml-1">
              {expanded ? "▼" : "▲"}
            </span>
          </button>

          {/* Expanded */}
          {expanded && (
            <div className="px-3 py-3 space-y-3">

              {/* Target + Amount */}
              <div className="flex gap-2">
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  disabled={disabled}
                  className="
                    flex-1 min-w-0 border border-slate-700
                    rounded-xl px-2 h-11 text-sm
                    focus:outline-none focus:border-blue-500
                    bg-slate-800 text-white
                  "
                >
                  {allParticipants.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                      disabled={!p.isConscious && p.id !== actor.id}
                    >
                      {p.id === actor.id ? "Self" : p.displayName}
                      {" "}({p.currentHp}/{p.maxHp})
                      {!p.isConscious ? " 💀" : ""}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleDamage()
                  }
                  placeholder="Amt"
                  disabled={disabled}
                  className="
                    w-16 border border-slate-700 rounded-xl
                    px-2 h-11 text-base text-center
                    focus:outline-none focus:border-blue-500
                    bg-slate-800 text-white
                  "
                />

                <button
                  type="button"
                  onClick={handleDamage}
                  disabled={!amount || disabled}
                  className="
                    bg-red-600 text-white rounded-xl px-3 h-11
                    text-sm font-bold hover:bg-red-500
                    disabled:opacity-40 transition-colors
                    flex-shrink-0
                  "
                >
                  DMG
                </button>

                <button
                  type="button"
                  onClick={handleHeal}
                  disabled={!amount || disabled}
                  className="
                    bg-green-600 text-white rounded-xl px-3 h-11
                    text-sm font-bold hover:bg-green-500
                    disabled:opacity-40 transition-colors
                    flex-shrink-0
                  "
                >
                  Heal
                </button>
              </div>

              {/* Target preview */}
              {selectedTarget && selectedTarget.id !== actor.id && (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {selectedTarget.displayName}
                  </span>

                  <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        hpBarColor(
                          Math.round(
                            (selectedTarget.currentHp /
                              selectedTarget.maxHp) *
                              100
                          )
                        )
                      }`}
                      style={{
                        width: `${Math.round(
                          (selectedTarget.currentHp /
                            selectedTarget.maxHp) *
                            100
                        )}%`,
                      }}
                    />
                  </div>

                  <span className="text-xs font-mono text-slate-400 whitespace-nowrap">
                    {selectedTarget.currentHp}/
                    {selectedTarget.maxHp}

                    {selectedTarget.tempHp > 0 && (
                      <span className="text-cyan-400">
                        {" "}
                        +{selectedTarget.tempHp}
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* Actions + End turn */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle("actionUsed")}
                  disabled={disabled}
                  className={`
                    flex-1 h-10 rounded-xl text-xs font-semibold
                    border transition-all
                    ${
                      actor.actionUsed
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "border-slate-700 text-slate-400 hover:border-blue-500"
                    }
                  `}
                >
                  {actor.actionUsed ? "✓ Action" : "Action"}
                </button>

                <button
                  type="button"
                  onClick={() => handleToggle("bonusUsed")}
                  disabled={disabled}
                  className={`
                    flex-1 h-10 rounded-xl text-xs font-semibold
                    border transition-all
                    ${
                      actor.bonusUsed
                        ? "bg-purple-600 border-purple-500 text-white"
                        : "border-slate-700 text-slate-400 hover:border-purple-500"
                    }
                  `}
                >
                  {actor.bonusUsed ? "✓ Bonus" : "Bonus"}
                </button>

                <button
                  type="button"
                  onClick={() => handleToggle("reactionUsed")}
                  disabled={disabled}
                  className={`
                    flex-1 h-10 rounded-xl text-xs font-semibold
                    border transition-all
                    ${
                      actor.reactionUsed
                        ? "bg-orange-600 border-orange-500 text-white"
                        : "border-slate-700 text-slate-400 hover:border-orange-500"
                    }
                  `}
                >
                  {actor.reactionUsed ? "✓ React" : "React"}
                </button>

                <button
                  type="button"
                  onClick={handleEndTurn}
                  disabled={disabled}
                  className="
                    flex-1 h-10 rounded-xl text-xs font-semibold
                    bg-blue-600 text-white hover:bg-blue-500
                    disabled:opacity-40 transition-colors
                  "
                >
                  End Turn →
                </button>
              </div>

              {isMutating && (
                <p className="text-xs text-slate-500 text-center animate-pulse">
                  Saving…
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}