"use client";

import { useState } from "react";
import {
  dealDamage,
  healParticipant,
  setTempHp,
  addCondition,
  removeCondition,
  toggleActionState
} from "@/lib/actions/participant";

type AcModifier = { source: string; value: number };
type Condition = { name: string };

type Participant = {
  id: string;
  displayName: string;
  initiative: number;
  currentHp: number;
  maxHp: number;
  tempHp: number;
  baseAc: number;
  acModifiers: unknown;
  conditions: unknown;
  isConscious: boolean;
  actionUsed: boolean;
  bonusUsed: boolean;
  reactionUsed: boolean;
  template: {
    type: string;
  };
};

const COMMON_CONDITIONS = [
  "Blinded","Charmed","Deafened","Frightened","Grappled",
  "Incapacitated","Invisible","Paralyzed","Petrified",
  "Poisoned","Prone","Restrained","Stunned","Unconscious",
];

export function CombatantRow({
  participant: p,
  combatId,
  isCurrentTurn,
  isFinished,
}: {
  participant: Participant;
  combatId: string;
  isCurrentTurn: boolean;
  isFinished: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [amount, setAmount] = useState("");
  const [tempAmount, setTempAmount] = useState("");
  const [condInput, setCondInput] = useState("");

  const acMods = (p.acModifiers as AcModifier[]) ?? [];
  const conditions = (p.conditions as Condition[]) ?? [];
  const acTotal = p.baseAc + acMods.reduce((s, m) => s + m.value, 0);

  const hpPct = Math.max(0, Math.round((p.currentHp / p.maxHp) * 100));

  const barColor =
    !p.isConscious ? "bg-gray-400" :
    hpPct > 60 ? "bg-green-500" :
    hpPct > 30 ? "bg-yellow-500" :
    "bg-red-500";

  return (
    <div
      className={`rounded-xl border p-3 space-y-2 transition ${
        isCurrentTurn ? "border-blue-500 shadow-md" : "border-gray-200"
      } ${!p.isConscious ? "opacity-60" : ""}`}
    >

      {/* CLICKABLE HEADER */}
      <div
        onClick={() => !isFinished && setExpanded(e => !e)}
        className="space-y-2 cursor-pointer active:scale-[0.99] transition"
      >

        {/* ROW 1: Initiative + Name */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">

            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-sm font-mono">
              {p.initiative}
            </div>

            <div className="flex flex-col">
              <span className={`font-medium ${!p.isConscious && "line-through text-gray-400"}`}>
                {p.displayName}
              </span>

              {!p.isConscious && (
                <span className="text-xs text-red-400">
                  Unconscious
                </span>
              )}
            </div>
          </div>

          {/* AC */}
          <div className="text-sm text-gray-500">
            AC <span className="font-semibold text-gray-800">{acTotal}</span>
          </div>
        </div>

        {/* ROW 2: HP BAR */}
        <div className="space-y-1">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full ${barColor}`}
              style={{ width: `${hpPct}%` }}
            />
          </div>

          <div className="flex justify-between text-sm font-mono">
            <span>
              {p.currentHp}/{p.maxHp}
              {p.tempHp > 0 && (
                <span className="text-blue-500 ml-1">
                  +{p.tempHp}
                </span>
              )}
            </span>

            <span className="text-gray-400">{hpPct}%</span>
          </div>
        </div>

        {/* ROW 3: CONDITIONS */}
        {conditions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {conditions.map(c => (
              <span
                key={c.name}
                className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full"
              >
                {c.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* EXPANDED PANEL */}
      {expanded && !isFinished && (
        <div className="pt-2 border-t space-y-3">
          <div className="space-y-2">
  <p className="text-xs text-gray-500">Turn actions</p>

  <div className="grid grid-cols-3 gap-2">

    {/* ACTION */}
    <form action={toggleActionState}>
      <input type="hidden" name="combatId" value={combatId} />
      <input type="hidden" name="targetId" value={p.id} />
      <input type="hidden" name="field" value="actionUsed" />

      <button
        className={`w-full py-2 rounded text-xs font-medium min-h-[44px] transition ${
          p.actionUsed
            ? "bg-blue-600 text-white"
            : "border text-gray-500"
        }`}
      >
        Action
      </button>
    </form>

    {/* BONUS */}
    <form action={toggleActionState}>
      <input type="hidden" name="combatId" value={combatId} />
      <input type="hidden" name="targetId" value={p.id} />
      <input type="hidden" name="field" value="bonusUsed" />

      <button
        className={`w-full py-2 rounded text-xs font-medium min-h-[44px] transition ${
          p.bonusUsed
            ? "bg-purple-600 text-white"
            : "border text-gray-500"
        }`}
      >
        Bonus
      </button>
    </form>

    {/* REACTION */}
    <form action={toggleActionState}>
      <input type="hidden" name="combatId" value={combatId} />
      <input type="hidden" name="targetId" value={p.id} />
      <input type="hidden" name="field" value="reactionUsed" />

      <button
        className={`w-full py-2 rounded text-xs font-medium min-h-[44px] transition ${
          p.reactionUsed
            ? "bg-orange-600 text-white"
            : "border text-gray-500"
        }`}
      >
        Reaction
      </button>
    </form>

  </div>
</div>
          {/* DAMAGE / HEAL */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className="flex-1 border rounded px-3 py-2 text-sm w-full"
            />
            <div className="flex gap-2">
              <form action={dealDamage}>
                <input type="hidden" name="combatId" value={combatId} />
                <input type="hidden" name="targetId" value={p.id} />
                <input type="hidden" name="amount" value={amount} />
                <button className="bg-red-500 text-white px-3 py-2 rounded text-sm min-h-[44px]">
                  DMG
                </button>
              </form>

              <form action={healParticipant}>
                <input type="hidden" name="combatId" value={combatId} />
                <input type="hidden" name="targetId" value={p.id} />
                <input type="hidden" name="amount" value={amount} />
                <button className="bg-green-500 text-white px-3 py-2 rounded text-sm min-h-[44px]">
                  Heal
                </button>
              </form>
            </div>
          </div>

          {/* TEMP HP */}
          <div className="flex gap-2">
            <input
              type="number"
              value={tempAmount}
              onChange={(e) => setTempAmount(e.target.value)}
              placeholder="Temp HP"
              className="flex-1 border rounded px-3 py-2 text-sm"
            />

            <form action={setTempHp}>
              <input type="hidden" name="combatId" value={combatId} />
              <input type="hidden" name="targetId" value={p.id} />
              <input type="hidden" name="amount" value={tempAmount} />
              <button className="bg-blue-500 text-white px-3 py-2 rounded text-sm min-h-[44px]">
                Set
              </button>
            </form>
          </div>

          {/* CONDITIONS QUICK ADD */}
          <div className="flex flex-wrap gap-1">
            {COMMON_CONDITIONS.map(cn => (
              <form key={cn} action={addCondition}>
                <input type="hidden" name="combatId" value={combatId} />
                <input type="hidden" name="targetId" value={p.id} />
                <input type="hidden" name="condition" value={cn} />
                <button className="text-xs border px-2 py-1 rounded">
                  + {cn}
                </button>
              </form>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}