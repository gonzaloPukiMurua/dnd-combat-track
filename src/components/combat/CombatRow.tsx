"use client";

import { useState } from "react";
import { dealDamage, healParticipant, setTempHp, addCondition, removeCondition } from "@/lib/actions/participant";

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
  template: {
    type: string;
  };
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

export function CombatantRow({
  participant: p,
  combatId,
  isCurrentTurn,
  isFinished,
  round,
}: {
  participant:  Participant;
  combatId:     string;
  isCurrentTurn: boolean;
  isFinished:   boolean;
  round:        number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [amount, setAmount]     = useState("");
  const [tempAmount, setTempAmount] = useState("");
  const [condInput, setCondInput]   = useState("");

  const hpPct      = Math.max(0, Math.round((p.currentHp / p.maxHp) * 100));
  const acMods     = (p.acModifiers as AcModifier[]) ?? [];
  const conditions = (p.conditions as Condition[])   ?? [];
  const acTotal    = p.baseAc + acMods.reduce((s, m) => s + m.value, 0);

  const barColor =
    !p.isConscious   ? "bg-gray-400" :
    hpPct > 60       ? "bg-green-500" :
    hpPct > 30       ? "bg-yellow-500" :
                       "bg-red-500";

  const typeColor = TYPE_COLORS[p.template.type] ?? "border-gray-200 bg-white";

  return (
    <div className={`border-2 rounded-lg overflow-hidden transition-all ${
      isCurrentTurn ? "border-blue-500 shadow-md" : typeColor
    } ${!p.isConscious ? "opacity-50" : ""}`}>

      {/* Main row */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => !isFinished && setExpanded((e) => !e)}
      >
        {/* Turn indicator */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
          isCurrentTurn ? "bg-blue-500" : "bg-transparent"
        }`} />

        {/* Initiative */}
        <span className="text-sm font-mono text-gray-400 w-6 text-right flex-shrink-0">
          {p.initiative}
        </span>

        {/* Name */}
        <span className={`font-medium flex-1 ${!p.isConscious ? "line-through text-gray-400" : ""}`}>
          {p.displayName}
          {!p.isConscious && (
            <span className="ml-2 text-xs text-red-400">unconscious</span>
          )}
        </span>

        {/* Conditions (compact) */}
        {conditions.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {conditions.map((c) => (
              <span key={c.name} className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
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
          <div className="w-20 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${barColor}`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
          <span className="text-sm font-mono w-16 text-right">
            <strong>{p.currentHp}</strong>
            <span className="text-gray-400">/{p.maxHp}</span>
            {p.tempHp > 0 && (
              <span className="text-blue-500 ml-1">+{p.tempHp}</span>
            )}
          </span>
        </div>

        {/* Expand chevron */}
        {!isFinished && (
          <span className="text-gray-300 text-xs ml-1">
            {expanded ? "▲" : "▼"}
          </span>
        )}
      </div>

      {/* Expanded controls */}
      {expanded && !isFinished && (
        <div className="border-t px-4 py-3 space-y-3 bg-white">

          {/* Damage / Heal */}
          <div className="flex gap-2 items-end">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-500">Amount</label>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="border rounded px-2 py-1 text-sm w-full"
              />
            </div>

            <form action={dealDamage}>
              <input type="hidden" name="combatId"  value={combatId} />
              <input type="hidden" name="targetId"  value={p.id} />
              <input type="hidden" name="amount"    value={amount} />
              <button
                type="submit"
                disabled={!amount}
                onClick={() => setAmount("")}
                className="bg-red-500 text-white rounded px-3 py-1.5 text-sm font-medium hover:bg-red-600 disabled:opacity-40"
              >
                Damage
              </button>
            </form>

            <form action={healParticipant}>
              <input type="hidden" name="combatId"  value={combatId} />
              <input type="hidden" name="targetId"  value={p.id} />
              <input type="hidden" name="amount"    value={amount} />
              <button
                type="submit"
                disabled={!amount}
                onClick={() => setAmount("")}
                className="bg-green-500 text-white rounded px-3 py-1.5 text-sm font-medium hover:bg-green-600 disabled:opacity-40"
              >
                Heal
              </button>
            </form>
          </div>

          {/* Temp HP */}
          <div className="flex gap-2 items-end">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-500">Temp HP</label>
              <input
                type="number"
                min={0}
                value={tempAmount}
                onChange={(e) => setTempAmount(e.target.value)}
                placeholder="0"
                className="border rounded px-2 py-1 text-sm w-full"
              />
            </div>
            <form action={setTempHp}>
              <input type="hidden" name="combatId" value={combatId} />
              <input type="hidden" name="targetId" value={p.id} />
              <input type="hidden" name="amount"   value={tempAmount} />
              <button
                type="submit"
                disabled={!tempAmount}
                onClick={() => setTempAmount("")}
                className="bg-blue-400 text-white rounded px-3 py-1.5 text-sm font-medium hover:bg-blue-500 disabled:opacity-40"
              >
                Set temp HP
              </button>
            </form>
          </div>

          {/* Conditions */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500">Conditions</label>

            {/* Active conditions */}
            {conditions.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {conditions.map((c) => (
                  <form key={c.name} action={removeCondition}>
                    <input type="hidden" name="combatId"   value={combatId} />
                    <input type="hidden" name="targetId"   value={p.id} />
                    <input type="hidden" name="condition"  value={c.name} />
                    <button
                      type="submit"
                      className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded hover:bg-red-100 hover:text-red-600 transition-colors"
                    >
                      {c.name} ✕
                    </button>
                  </form>
                ))}
              </div>
            )}

            {/* Quick-add common conditions */}
            <div className="flex gap-1 flex-wrap">
              {COMMON_CONDITIONS.filter(
                (cn) => !conditions.some((c) => c.name === cn)
              ).map((cn) => (
                <form key={cn} action={addCondition}>
                  <input type="hidden" name="combatId"  value={combatId} />
                  <input type="hidden" name="targetId"  value={p.id} />
                  <input type="hidden" name="condition" value={cn} />
                  <button
                    type="submit"
                    className="text-xs border px-2 py-0.5 rounded text-gray-500 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 transition-colors"
                  >
                    + {cn}
                  </button>
                </form>
              ))}
            </div>

            {/* Custom condition input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={condInput}
                onChange={(e) => setCondInput(e.target.value)}
                placeholder="Custom condition…"
                className="border rounded px-2 py-1 text-sm flex-1"
              />
              <form action={addCondition}>
                <input type="hidden" name="combatId"  value={combatId} />
                <input type="hidden" name="targetId"  value={p.id} />
                <input type="hidden" name="condition" value={condInput} />
                <button
                  type="submit"
                  disabled={!condInput}
                  onClick={() => setCondInput("")}
                  className="border rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  Add
                </button>
              </form>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
