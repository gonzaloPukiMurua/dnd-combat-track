"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  dealDamage,
  healParticipant,
  setTempHp,
  addCondition,
  removeCondition,
  toggleActionState,
} from "@/lib/actions/participant";

type AcModifier = { source: string; value: number };
type Condition  = { name: string };

type ParticipantSummary = {
  id:          string;
  displayName: string;
  isConscious: boolean;
  currentHp:   number;
  maxHp:       number;
};

type Participant = {
  id:           string;
  displayName:  string;
  initiative:   number;
  currentHp:    number;
  maxHp:        number;
  tempHp:       number;
  baseAc:       number;
  acModifiers:  unknown;
  conditions:   unknown;
  isConscious:  boolean;
  actionUsed:   boolean;
  bonusUsed:    boolean;
  reactionUsed: boolean;
  template:     { type: string };
};

const COMMON_CONDITIONS = [
  "Blinded", "Charmed", "Deafened", "Frightened", "Grappled",
  "Incapacitated", "Invisible", "Paralyzed", "Petrified",
  "Poisoned", "Prone", "Restrained", "Stunned", "Unconscious",
];

function makeFormData(fields: Record<string, string | number>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, String(v));
  return fd;
}

export function CombatantRow({
  participant: p,
  combatId,
  isCurrentTurn,
  isFinished,
  round,
  allParticipants,
}: {
  participant:     Participant;
  combatId:        string;
  isCurrentTurn:   boolean;
  isFinished:      boolean;
  round:           number;
  allParticipants: ParticipantSummary[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [expanded,    setExpanded]   = useState(false);
  const [amount,      setAmount]     = useState("");
  const [tempAmount,  setTempAmount] = useState("");
  const [condInput,   setCondInput]  = useState("");

  // Target for damage/heal — defaults to self
  const [targetId, setTargetId] = useState(p.id);

  const acMods     = (p.acModifiers as AcModifier[]) ?? [];
  const conditions = (p.conditions  as Condition[])  ?? [];
  const acTotal    = p.baseAc + acMods.reduce((s, m) => s + m.value, 0);
  const hpPct      = p.maxHp > 0 ? Math.max(0, Math.round((p.currentHp / p.maxHp) * 100)) : 0;

  const barColor =
    !p.isConscious ? "bg-gray-400" :
    hpPct > 60     ? "bg-green-500" :
    hpPct > 30     ? "bg-yellow-500" :
                     "bg-red-500";

  // ── Helpers ───────────────────────────────────────────────────────────────

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
        actorId:  p.id,      // who is dealing
        targetId,            // who receives — may differ from self
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
        actorId:  p.id,
        targetId,
        amount:   n,
      }));
      setAmount("");
    });
  }

  function handleSetTempHp() {
    const n = parseInt(tempAmount);
    if (isNaN(n) || n < 0) return;
    run(async () => {
      await setTempHp(makeFormData({ combatId, targetId: p.id, amount: n }));
      setTempAmount("");
    });
  }

  function handleAddCondition(name: string) {
    if (!name.trim()) return;
    run(async () => {
      await addCondition(makeFormData({ combatId, targetId: p.id, condition: name }));
      setCondInput("");
    });
  }

  function handleRemoveCondition(name: string) {
    run(() => removeCondition(makeFormData({ combatId, targetId: p.id, condition: name })));
  }

  function handleToggleAction(field: string) {
    run(() => toggleActionState(makeFormData({ combatId, targetId: p.id, field })));
  }

  // The selected target's summary (for showing HP preview)
  const selectedTarget = allParticipants.find((ap) => ap.id === targetId);

  return (
    <div className={`rounded-xl border-2 transition-all
      ${isCurrentTurn ? "border-blue-500 shadow-md" : "border-gray-200"}
      ${!p.isConscious ? "opacity-60" : ""}
    `}>

      {/* ── Collapsed header ───────────────────────────────────────────── */}
      <div
        onClick={() => !isFinished && setExpanded((e) => !e)}
        className="p-3 space-y-2 cursor-pointer active:scale-[0.99] transition select-none"
      >
        {/* Row 1: initiative bubble + name + AC */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {/* Active turn pulse */}
            <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-mono font-bold
              ${isCurrentTurn ? "bg-blue-500 text-white animate-pulse" : "bg-gray-100 text-gray-600"}`}>
              {p.initiative}
            </div>

            <div>
              <p className={`font-semibold leading-tight
                ${!p.isConscious ? "line-through text-gray-400" : "text-gray-800"}`}>
                {p.displayName}
              </p>
              {!p.isConscious && (
                <p className="text-xs text-red-400">Unconscious</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Action trackers — compact view */}
            {(p.actionUsed || p.bonusUsed || p.reactionUsed) && (
              <div className="flex gap-1">
                {p.actionUsed   && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">A</span>}
                {p.bonusUsed    && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">B</span>}
                {p.reactionUsed && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">R</span>}
              </div>
            )}
            <span className="text-sm text-gray-500">
              AC <strong className="text-gray-800">{acTotal}</strong>
            </span>
            {!isFinished && (
              <span className="text-gray-300 text-xs">{expanded ? "▲" : "▼"}</span>
            )}
          </div>
        </div>

        {/* Row 2: HP bar */}
        <div className="space-y-1">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className={`h-3 rounded-full transition-all ${barColor}`}
              style={{ width: `${hpPct}%` }} />
          </div>
          <div className="flex justify-between text-sm font-mono text-gray-600">
            <span>
              <strong className={p.currentHp === 0 ? "text-red-500" : ""}>{p.currentHp}</strong>
              /{p.maxHp}
              {p.tempHp > 0 && <span className="text-blue-500 ml-1">+{p.tempHp}</span>}
            </span>
            <span className="text-gray-400">{hpPct}%</span>
          </div>
        </div>

        {/* Row 3: conditions */}
        {conditions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {conditions.map((c) => (
              <span key={c.name}
                className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                {c.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Expanded panel ─────────────────────────────────────────────── */}
      {expanded && !isFinished && (
        <div className={`border-t px-3 pb-4 pt-3 space-y-4 bg-gray-50 rounded-b-xl
          ${isPending ? "opacity-60 pointer-events-none" : ""}`}>

          {/* ACTION TRACKERS */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Turn actions</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { field: "actionUsed",   label: "Action",   used: p.actionUsed,   color: "blue" },
                { field: "bonusUsed",    label: "Bonus",    used: p.bonusUsed,    color: "purple" },
                { field: "reactionUsed", label: "Reaction", used: p.reactionUsed, color: "orange" },
              ].map(({ field, label, used, color }) => (
                <button
                  key={field}
                  type="button"
                  onClick={() => handleToggleAction(field)}
                  className={`py-2.5 rounded-lg text-sm font-medium min-h-[44px] border-2 transition-all
                    ${used
                      ? `bg-${color}-500 border-${color}-500 text-white`
                      : `border-gray-200 text-gray-500 hover:border-${color}-300`
                    }`}
                >
                  {used ? `✓ ${label}` : label}
                </button>
              ))}
            </div>
          </div>

          {/* TARGET SELECTOR */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Target for damage / heal
            </p>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full border-2 rounded-lg px-3 h-11 text-sm focus:outline-none focus:border-blue-400"
            >
              {allParticipants.map((ap) => (
                <option key={ap.id} value={ap.id}>
                  {ap.id === p.id ? "Self — " : ""}{ap.displayName}
                  {" "}({ap.currentHp}/{ap.maxHp} HP)
                  {!ap.isConscious ? " [unconscious]" : ""}
                </option>
              ))}
            </select>

            {/* Show target HP bar as a quick preview */}
            {selectedTarget && selectedTarget.id !== p.id && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      selectedTarget.currentHp / selectedTarget.maxHp > 0.6 ? "bg-green-500" :
                      selectedTarget.currentHp / selectedTarget.maxHp > 0.3 ? "bg-yellow-500" :
                      "bg-red-500"
                    }`}
                    style={{ width: `${Math.round((selectedTarget.currentHp / selectedTarget.maxHp) * 100)}%` }}
                  />
                </div>
                <span>{selectedTarget.currentHp}/{selectedTarget.maxHp} HP</span>
              </div>
            )}
          </div>

          {/* DAMAGE / HEAL */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</p>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDamage()}
                placeholder="e.g. 8"
                className="flex-1 border-2 rounded-lg px-3 h-11 text-base focus:outline-none focus:border-blue-400"
              />
              <button
                type="button"
                onClick={handleDamage}
                disabled={!amount || isPending}
                className="bg-red-500 text-white rounded-lg px-4 h-11 text-sm font-semibold hover:bg-red-600 disabled:opacity-40 transition-colors min-w-[72px]"
              >
                DMG
              </button>
              <button
                type="button"
                onClick={handleHeal}
                disabled={!amount || isPending}
                className="bg-green-500 text-white rounded-lg px-4 h-11 text-sm font-semibold hover:bg-green-600 disabled:opacity-40 transition-colors min-w-[72px]"
              >
                Heal
              </button>
            </div>
          </div>

          {/* TEMP HP */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Temp HP (self)</p>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                value={tempAmount}
                onChange={(e) => setTempAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSetTempHp()}
                placeholder="e.g. 10"
                className="flex-1 border-2 rounded-lg px-3 h-11 text-base focus:outline-none focus:border-blue-400"
              />
              <button
                type="button"
                onClick={handleSetTempHp}
                disabled={!tempAmount || isPending}
                className="bg-blue-400 text-white rounded-lg px-4 h-11 text-sm font-semibold hover:bg-blue-500 disabled:opacity-40 transition-colors"
              >
                Set
              </button>
            </div>
          </div>

          {/* CONDITIONS (always applied to self) */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Conditions (self)</p>

            {/* Active conditions — tap to remove */}
            {conditions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {conditions.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => handleRemoveCondition(c.name)}
                    className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors min-h-[32px]"
                    title="Tap to remove"
                  >
                    {c.name} ✕
                  </button>
                ))}
              </div>
            )}

            {/* Quick-add buttons */}
            <div className="flex flex-wrap gap-1.5">
              {COMMON_CONDITIONS
                .filter((cn) => !conditions.some((c) => c.name === cn))
                .map((cn) => (
                  <button
                    key={cn}
                    type="button"
                    onClick={() => handleAddCondition(cn)}
                    className="text-xs border-2 px-2.5 py-1 rounded-full text-gray-500 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 transition-colors min-h-[32px]"
                  >
                    + {cn}
                  </button>
                ))}
            </div>

            {/* Custom condition */}
            <div className="flex gap-2">
              <input
                type="text"
                value={condInput}
                onChange={(e) => setCondInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCondition(condInput)}
                placeholder="Custom condition…"
                className="flex-1 border-2 rounded-lg px-3 h-11 text-sm focus:outline-none focus:border-blue-400"
              />
              <button
                type="button"
                onClick={() => handleAddCondition(condInput)}
                disabled={!condInput || isPending}
                className="border-2 rounded-lg px-4 h-11 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {isPending && (
            <p className="text-xs text-gray-400 text-center animate-pulse">Saving…</p>
          )}
        </div>
      )}
    </div>
  );
}
