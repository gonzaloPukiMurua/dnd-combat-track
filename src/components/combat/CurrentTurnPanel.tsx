"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  dealDamage,
  healParticipant,
  toggleActionState,
} from "@/lib/actions/participant";
import { advanceTurn } from "@/lib/actions/combat";

type ParticipantSummary = {
  id:          string;
  displayName: string;
  isConscious: boolean;
  currentHp:   number;
  maxHp:       number;
  tempHp:      number;
};

type CurrentActor = {
  id:           string;
  displayName:  string;
  currentHp:    number;
  maxHp:        number;
  tempHp:       number;
  actionUsed:   boolean;
  bonusUsed:    boolean;
  reactionUsed: boolean;
};

function makeFormData(fields: Record<string, string | number>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, String(v));
  return fd;
}

export function CurrentTurnPanel({
  actor,
  combatId,
  round,
  allParticipants,
}: {
  actor:           CurrentActor;
  combatId:        string;
  round:           number;
  allParticipants: ParticipantSummary[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [amount,   setAmount]   = useState("");
  const [targetId, setTargetId] = useState(actor.id);
  const [expanded, setExpanded] = useState(true);

  const hpPct = actor.maxHp > 0
    ? Math.max(0, Math.round((actor.currentHp / actor.maxHp) * 100))
    : 0;

  const barColor =
    hpPct > 60 ? "bg-green-500" :
    hpPct > 30 ? "bg-yellow-400" :
                 "bg-red-500";

  const selectedTarget = allParticipants.find((p) => p.id === targetId);

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  function handleDamage() {
    const n = parseInt(amount);
    if (!n || n < 1) return;
    run(async () => {
      await dealDamage(makeFormData({
        combatId,
        actorId:  actor.id,
        targetId,
        amount:   n,
      }));
      setAmount("");
    });
  }

  function handleHeal() {
    const n = parseInt(amount);
    if (!n || n < 1) return;
    run(async () => {
      await healParticipant(makeFormData({
        combatId,
        actorId:  actor.id,
        targetId,
        amount:   n,
      }));
      setAmount("");
    });
  }

  function handleToggle(field: string) {
    run(() => toggleActionState(makeFormData({
      combatId,
      targetId: actor.id,
      field,
    })));
  }

  function handleEndTurn() {
    run(async () => {
      await advanceTurn(combatId);
      // Reset panel state for next actor
      setAmount("");
      setTargetId(""); // will be reset by parent re-render
    });
  }

  return (
    /*
      Positioning:
      - mobile:  fixed to bottom, above the nav tab bar (bottom-16 = 64px = tab bar height)
      - desktop: fixed to bottom, no tab bar offset (sm:bottom-0)
      - max-w-2xl + mx-auto keeps it aligned with the page content on wide screens
    */
    <div className={`
      fixed bottom-16 sm:bottom-0 left-0 right-0 z-30
      transition-all duration-200
      ${isPending ? "opacity-70" : ""}
    `}>
      <div className="max-w-2xl mx-auto px-2 pb-2">
        <div className="bg-white border-2 border-blue-400 rounded-2xl shadow-xl overflow-hidden">

          {/* ── Header — always visible, tap to collapse ─────────────────── */}
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="w-full px-4 py-2.5 flex items-center gap-3 bg-blue-50 border-b border-blue-100 active:bg-blue-100 transition-colors"
          >
            {/* Pulse dot */}
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />

            {/* Actor name + round */}
            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold text-blue-900 truncate text-sm leading-tight">
                {actor.displayName}
              </p>
              <p className="text-xs text-blue-500">Round {round}</p>
            </div>

            {/* Actor HP bar + numbers */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-16 bg-blue-100 rounded-full h-1.5 hidden sm:block">
                <div
                  className={`h-1.5 rounded-full transition-all ${barColor}`}
                  style={{ width: `${hpPct}%` }}
                />
              </div>
              <span className="text-xs font-mono text-blue-800 whitespace-nowrap">
                <strong>{actor.currentHp}</strong>
                <span className="text-blue-400">/{actor.maxHp}</span>
                {actor.tempHp > 0 && (
                  <span className="text-blue-500"> +{actor.tempHp}</span>
                )}
              </span>
            </div>

            {/* Collapse chevron */}
            <span className="text-blue-300 text-xs flex-shrink-0 ml-1">
              {expanded ? "▼" : "▲"}
            </span>
          </button>

          {/* ── Expanded body ─────────────────────────────────────────────── */}
          {expanded && (
            <div className="px-3 py-3 space-y-3">

              {/* TARGET + AMOUNT + BUTTONS — one row on mobile */}
              <div className="flex gap-2">
                {/* Target selector */}
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="flex-1 min-w-0 border-2 rounded-xl px-2 h-11 text-sm focus:outline-none focus:border-blue-400 bg-white"
                >
                  {allParticipants.map((p) => (
                    <option key={p.id} value={p.id} disabled={!p.isConscious && p.id !== actor.id}>
                      {p.id === actor.id ? "Self" : p.displayName}
                      {" "}({p.currentHp}/{p.maxHp})
                      {!p.isConscious ? " 💀" : ""}
                    </option>
                  ))}
                </select>

                {/* Amount input */}
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleDamage()}
                  placeholder="Amt"
                  className="w-16 border-2 rounded-xl px-2 h-11 text-base text-center focus:outline-none focus:border-blue-400"
                />

                {/* DMG */}
                <button
                  type="button"
                  onClick={handleDamage}
                  disabled={!amount || isPending}
                  className="bg-red-500 text-white rounded-xl px-3 h-11 text-sm font-bold hover:bg-red-600 disabled:opacity-40 transition-colors flex-shrink-0"
                >
                  DMG
                </button>

                {/* Heal */}
                <button
                  type="button"
                  onClick={handleHeal}
                  disabled={!amount || isPending}
                  className="bg-green-500 text-white rounded-xl px-3 h-11 text-sm font-bold hover:bg-green-600 disabled:opacity-40 transition-colors flex-shrink-0"
                >
                  Heal
                </button>
              </div>

              {/* TARGET HP PREVIEW — only when target != self */}
              {selectedTarget && selectedTarget.id !== actor.id && (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {selectedTarget.displayName}
                  </span>
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        selectedTarget.currentHp / selectedTarget.maxHp > 0.6 ? "bg-green-500" :
                        selectedTarget.currentHp / selectedTarget.maxHp > 0.3 ? "bg-yellow-400" :
                        "bg-red-500"
                      }`}
                      style={{
                        width: `${Math.round(
                          (selectedTarget.currentHp / selectedTarget.maxHp) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono text-gray-500 whitespace-nowrap">
                    {selectedTarget.currentHp}/{selectedTarget.maxHp}
                    {selectedTarget.tempHp > 0 && (
                      <span className="text-blue-400"> +{selectedTarget.tempHp}</span>
                    )}
                  </span>
                </div>
              )}

              {/* ACTION TRACKERS + END TURN — one row */}
              <div className="flex gap-2">
                {/* Action */}
                <button
                  type="button"
                  onClick={() => handleToggle("actionUsed")}
                  disabled={isPending}
                  className={`flex-1 h-10 rounded-xl text-xs font-semibold border-2 transition-all
                    ${actor.actionUsed
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "border-gray-200 text-gray-500 hover:border-blue-300"
                    }`}
                >
                  {actor.actionUsed ? "✓ Action" : "Action"}
                </button>

                {/* Bonus */}
                <button
                  type="button"
                  onClick={() => handleToggle("bonusUsed")}
                  disabled={isPending}
                  className={`flex-1 h-10 rounded-xl text-xs font-semibold border-2 transition-all
                    ${actor.bonusUsed
                      ? "bg-purple-500 border-purple-500 text-white"
                      : "border-gray-200 text-gray-500 hover:border-purple-300"
                    }`}
                >
                  {actor.bonusUsed ? "✓ Bonus" : "Bonus"}
                </button>

                {/* Reaction */}
                <button
                  type="button"
                  onClick={() => handleToggle("reactionUsed")}
                  disabled={isPending}
                  className={`flex-1 h-10 rounded-xl text-xs font-semibold border-2 transition-all
                    ${actor.reactionUsed
                      ? "bg-orange-500 border-orange-500 text-white"
                      : "border-gray-200 text-gray-500 hover:border-orange-300"
                    }`}
                >
                  {actor.reactionUsed ? "✓ React" : "React"}
                </button>

                {/* End turn */}
                <button
                  type="button"
                  onClick={handleEndTurn}
                  disabled={isPending}
                  className="flex-1 h-10 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  End Turn →
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
