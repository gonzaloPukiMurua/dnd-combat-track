"use client";

import { useState, useTransition } from "react";
import {
  dealDamage,
  healParticipant,
  setTempHp,
  addCondition,
  removeCondition,
} from "@/lib/actions/participant";

type AcModifier = { source: string; value: number };
type Condition  = { name: string };

type Participant = {
  id:          string;
  displayName: string;
  initiative:  number;
  currentHp:   number;
  maxHp:       number;
  tempHp:      number;
  baseAc:      number;
  acModifiers: unknown;
  conditions:  unknown;
  isConscious: boolean;
  template: { type: string };
};

const COMMON_CONDITIONS = [
  "Blinded", "Charmed", "Deafened", "Frightened", "Grappled",
  "Incapacitated", "Invisible", "Paralyzed", "Petrified",
  "Poisoned", "Prone", "Restrained", "Stunned", "Unconscious",
];

const TYPE_COLORS: Record<string, string> = {
  PLAYER:  "border-blue-300 bg-blue-50",
  NPC:     "border-green-300 bg-green-50",
  MONSTER: "border-red-300 bg-red-50",
};

// ─── Helper: build a FormData from a plain object ─────────────────────────────
function makeFormData(fields: Record<string, string | number>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.set(k, String(v));
  }
  return fd;
}

export function CombatantRow({
  participant: p,
  combatId,
  isCurrentTurn,
  isFinished,
}: {
  participant:   Participant;
  combatId:      string;
  isCurrentTurn: boolean;
  isFinished:    boolean;
  round:         number;
}) {
  const [expanded, setExpanded]     = useState(false);
  const [amount, setAmount]         = useState("");
  const [tempAmount, setTempAmount] = useState("");
  const [condInput, setCondInput]   = useState("");
  const [isPending, startTransition] = useTransition();

  const hpPct      = p.maxHp > 0 ? Math.max(0, Math.round((p.currentHp / p.maxHp) * 100)) : 0;
  const acMods     = (p.acModifiers as AcModifier[]) ?? [];
  const conditions = (p.conditions  as Condition[])  ?? [];
  const acTotal    = p.baseAc + acMods.reduce((s, m) => s + m.value, 0);

  const barColor =
    !p.isConscious ? "bg-gray-400" :
    hpPct > 60     ? "bg-green-500" :
    hpPct > 30     ? "bg-yellow-500" :
                     "bg-red-500";

  const typeColor = TYPE_COLORS[p.template.type] ?? "border-gray-200 bg-white";

  // ── Action helpers — build FormData manually so we own the values ────────────

  function handleDamage() {
    const n = parseInt(amount);
    if (!n || n < 1) return;
    startTransition(async () => {
      await dealDamage(makeFormData({ combatId, targetId: p.id, amount: n }));
      setAmount("");
    });
  }

  function handleHeal() {
    const n = parseInt(amount);
    if (!n || n < 1) return;
    startTransition(async () => {
      await healParticipant(makeFormData({ combatId, targetId: p.id, amount: n }));
      setAmount("");
    });
  }

  function handleSetTempHp() {
    const n = parseInt(tempAmount);
    if (isNaN(n) || n < 0) return;
    startTransition(async () => {
      await setTempHp(makeFormData({ combatId, targetId: p.id, amount: n }));
      setTempAmount("");
    });
  }

  function handleAddCondition(name: string) {
    if (!name.trim()) return;
    startTransition(async () => {
      await addCondition(makeFormData({ combatId, targetId: p.id, condition: name }));
      setCondInput("");
    });
  }

  function handleRemoveCondition(name: string) {
    startTransition(async () => {
      await removeCondition(makeFormData({ combatId, targetId: p.id, condition: name }));
    });
  }

  return (
    <div className={`border-2 rounded-lg overflow-hidden transition-all ${
      isCurrentTurn ? "border-blue-500 shadow-md" : typeColor
    } ${!p.isConscious ? "opacity-50" : ""}`}>

      {/* ── Collapsed row ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer select-none"
        onClick={() => !isFinished && setExpanded((e) => !e)}
      >
        {/* Active turn dot */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
          isCurrentTurn ? "bg-blue-500 animate-pulse" : "bg-transparent"
        }`} />

        {/* Initiative number */}
        <span className="text-sm font-mono text-gray-400 w-6 text-right flex-shrink-0">
          {p.initiative}
        </span>

        {/* Name */}
        <span className={`font-medium flex-1 min-w-0 truncate ${
          !p.isConscious ? "line-through text-gray-400" : ""
        }`}>
          {p.displayName}
          {!p.isConscious && (
            <span className="ml-2 text-xs text-red-400 no-underline">unconscious</span>
          )}
        </span>

        {/* Condition badges */}
        {conditions.length > 0 && (
          <div className="hidden sm:flex gap-1 flex-wrap max-w-[180px]">
            {conditions.map((c) => (
              <span key={c.name} className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded whitespace-nowrap">
                {c.name}
              </span>
            ))}
          </div>
        )}

        {/* AC */}
        <span className="text-sm text-gray-500 flex-shrink-0">
          AC <strong className="text-gray-800">{acTotal}</strong>
        </span>

        {/* HP bar + numbers */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-16 bg-gray-200 rounded-full h-2 hidden sm:block">
            <div
              className={`h-2 rounded-full transition-all ${barColor}`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
          <span className="text-sm font-mono whitespace-nowrap">
            <strong className={p.currentHp === 0 ? "text-red-500" : ""}>{p.currentHp}</strong>
            <span className="text-gray-400">/{p.maxHp}</span>
            {p.tempHp > 0 && (
              <span className="text-blue-500 ml-1">+{p.tempHp}</span>
            )}
          </span>
        </div>

        {/* Expand chevron */}
        {!isFinished && (
          <span className="text-gray-300 text-xs ml-1 flex-shrink-0">
            {expanded ? "▲" : "▼"}
          </span>
        )}
      </div>

      {/* ── Expanded controls ──────────────────────────────────────────────── */}
      {expanded && !isFinished && (
        <div className={`border-t px-4 py-3 space-y-4 bg-white ${isPending ? "opacity-60 pointer-events-none" : ""}`}>

          {/* HP bar (full width in expanded) */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>HP</span>
              <span>{p.currentHp} / {p.maxHp}{p.tempHp > 0 ? ` (+${p.tempHp} temp)` : ""}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${barColor}`}
                style={{ width: `${hpPct}%` }}
              />
            </div>
          </div>

          {/* Damage / Heal */}
          <div className="flex gap-2 items-end">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-500 font-medium">Amount</label>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDamage()}
                placeholder="e.g. 8"
                className="border rounded px-2 py-1.5 text-sm w-full"
              />
            </div>
            <button
              type="button"
              onClick={handleDamage}
              disabled={!amount || isPending}
              className="bg-red-500 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-red-600 disabled:opacity-40 transition-colors"
            >
              Damage
            </button>
            <button
              type="button"
              onClick={handleHeal}
              disabled={!amount || isPending}
              className="bg-green-500 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-green-600 disabled:opacity-40 transition-colors"
            >
              Heal
            </button>
          </div>

          {/* Temp HP */}
          <div className="flex gap-2 items-end">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-500 font-medium">Temporary HP</label>
              <input
                type="number"
                min={0}
                value={tempAmount}
                onChange={(e) => setTempAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSetTempHp()}
                placeholder="e.g. 10"
                className="border rounded px-2 py-1.5 text-sm w-full"
              />
            </div>
            <button
              type="button"
              onClick={handleSetTempHp}
              disabled={!tempAmount || isPending}
              className="bg-blue-400 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-500 disabled:opacity-40 transition-colors"
            >
              Set temp HP
            </button>
          </div>

          {/* Conditions */}
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">Conditions</p>

            {/* Active conditions — click to remove */}
            {conditions.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {conditions.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => handleRemoveCondition(c.name)}
                    disabled={isPending}
                    className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded hover:bg-red-100 hover:text-red-600 transition-colors"
                    title="Click to remove"
                  >
                    {c.name} ✕
                  </button>
                ))}
              </div>
            )}

            {/* Quick-add buttons for conditions not already active */}
            <div className="flex gap-1 flex-wrap">
              {COMMON_CONDITIONS
                .filter((cn) => !conditions.some((c) => c.name === cn))
                .map((cn) => (
                  <button
                    key={cn}
                    type="button"
                    onClick={() => handleAddCondition(cn)}
                    disabled={isPending}
                    className="text-xs border px-2 py-0.5 rounded text-gray-500 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 transition-colors"
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
                className="border rounded px-2 py-1 text-sm flex-1"
              />
              <button
                type="button"
                onClick={() => handleAddCondition(condInput)}
                disabled={!condInput || isPending}
                className="border rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>

          {/* Pending indicator */}
          {isPending && (
            <p className="text-xs text-gray-400 text-center">Saving…</p>
          )}
        </div>
      )}
    </div>
  );
}
