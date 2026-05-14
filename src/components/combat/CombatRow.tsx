"use client";

import { useState } from "react";
import { useCombatStore, type Participant } from "@/stores/combatStore";
import { useCombatMutation } from "@/hooks/useCombatMutation";
import { DeathSaveTracker } from "@/components/combat/DeathSaveTracker";
import {
  dealDamage, healParticipant, setTempHp,
  addCondition, removeCondition, toggleActionState,
} from "@/lib/actions/participant";

type ParticipantSummary = {
  id: string; displayName: string; isConscious: boolean;
  currentHp: number; maxHp: number; tempHp: number;
};

const COMMON_CONDITIONS = [
  "Blinded","Charmed","Deafened","Frightened","Grappled",
  "Incapacitated","Invisible","Paralyzed","Petrified",
  "Poisoned","Prone","Restrained","Stunned","Unconscious",
];

const TYPE_ACCENT: Record<string, string> = {
  PLAYER:  "border-l-indigo-400",
  NPC:     "border-l-emerald-400",
  MONSTER: "border-l-red-400",
};

function makeFormData(fields: Record<string, string | number>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, String(v));
  return fd;
}

function hpBarColor(pct: number, conscious: boolean) {
  if (!conscious) return "bg-slate-600";
  if (pct > 60)   return "bg-green-500";
  if (pct > 30)   return "bg-yellow-400";
  return "bg-red-500";
}

export function CombatantRow({
  participant: p, combatId, isCurrentTurn, isFinished,
  round, allParticipants, globalMutating,
}: {
  participant: Participant; combatId: string;
  isCurrentTurn: boolean; isFinished: boolean; round: number;
  allParticipants: ParticipantSummary[]; globalMutating: boolean;
}) {
  const store = useCombatStore();
  const { mutate, isMutating } = useCombatMutation();

  const [expanded,   setExpanded]   = useState(false);
  const [amount,     setAmount]     = useState("");
  const [tempAmount, setTempAmount] = useState("");
  const [condInput,  setCondInput]  = useState("");
  const [targetId,   setTargetId]   = useState(p.id);

  const acTotal  = p.baseAc + p.acModifiers.reduce((s, m) => s + m.value, 0);
  const hpPct    = p.maxHp > 0 ? Math.max(0, Math.round((p.currentHp / p.maxHp) * 100)) : 0;
  const barColor = hpBarColor(hpPct, p.isConscious);
  const isDead   = p.deathSaveFailures >= 3;
  const disabled = isMutating || globalMutating || isFinished;
  const selectedTarget = allParticipants.find((ap) => ap.id === targetId);

  function handleDamage() {
    const n = parseInt(amount);
    if (!n || n < 1) return;
    mutate({
      optimistic: () => store.applyDamage(targetId, n),
      action: async () => {
        const r = await dealDamage(makeFormData({ combatId, actorId: p.id, targetId, amount: n }));
        setAmount(""); return r;
      },
    });
  }

  function handleHeal() {
    const n = parseInt(amount);
    if (!n || n < 1) return;
    mutate({
      optimistic: () => store.applyHeal(targetId, n),
      action: async () => {
        const r = await healParticipant(makeFormData({ combatId, actorId: p.id, targetId, amount: n }));
        setAmount(""); return r;
      },
    });
  }

  function handleSetTempHp() {
    const n = parseInt(tempAmount);
    if (isNaN(n) || n < 0) return;
    mutate({
      optimistic: () => store.applyTempHp(p.id, n),
      action: async () => {
        const r = await setTempHp(makeFormData({ combatId, targetId: p.id, amount: n }));
        setTempAmount(""); return r;
      },
    });
  }

  function handleAddCondition(name: string) {
    if (!name.trim()) return;
    mutate({
      optimistic: () => store.applyCondition(p.id, name),
      action: async () => {
        const r = await addCondition(makeFormData({ combatId, targetId: p.id, condition: name }));
        setCondInput(""); return r;
      },
    });
  }

  function handleRemoveCondition(name: string) {
    mutate({
      optimistic: () => store.removeConditionOptimistic(p.id, name),
      action: () => removeCondition(makeFormData({ combatId, targetId: p.id, condition: name })),
    });
  }

  function handleToggleAction(field: "actionUsed" | "bonusUsed" | "reactionUsed") {
    mutate({
      optimistic: () => store.toggleAction(p.id, field),
      action: () => toggleActionState(makeFormData({ combatId, targetId: p.id, field })),
    });
  }

  return (
    <div className={`
      rounded-2xl border-l-4 overflow-hidden transition-all
      bg-slate-800 border border-slate-700
      ${isCurrentTurn ? "border-l-blue-400 shadow-lg shadow-blue-900/30" : TYPE_ACCENT[p.template.type] ?? "border-l-slate-600"}
      ${!p.isConscious ? "opacity-70" : ""}
    `}>

      {/* ── Collapsed header ─────────────────────────────────────── */}
      <div
        onClick={() => !isFinished && setExpanded((e) => !e)}
        className={`px-4 py-3 cursor-pointer select-none space-y-2 transition-colors
          ${isCurrentTurn ? "bg-blue-900/20" : "hover:bg-slate-700/40"}`}
      >
        {/* Name row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold font-mono flex-shrink-0
              ${isCurrentTurn ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-300"}`}>
              {p.initiative}
            </div>
            <div className="min-w-0">
              <p className={`font-bold leading-tight truncate ${!p.isConscious ? "line-through text-slate-500" : "text-white"}`}>
                {p.displayName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {isDead        && <span className="text-xs text-red-400 font-medium">💀 Dead</span>}
                {!isDead && !p.isConscious && !p.isStabilized && <span className="text-xs text-amber-400 font-medium">⚠ Unconscious</span>}
                {p.isStabilized && <span className="text-xs text-green-400 font-medium">💚 Stable</span>}
                {p.conditions.map((c) => (
                  <span key={c.name} className="text-xs bg-purple-900/60 text-purple-300 border border-purple-700 px-1.5 py-0.5 rounded-lg">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {(p.actionUsed || p.bonusUsed || p.reactionUsed) && (
              <div className="flex gap-1">
                {p.actionUsed   && <span className="text-xs bg-blue-800 text-blue-300 px-1.5 py-0.5 rounded-lg font-bold">A</span>}
                {p.bonusUsed    && <span className="text-xs bg-purple-800 text-purple-300 px-1.5 py-0.5 rounded-lg font-bold">B</span>}
                {p.reactionUsed && <span className="text-xs bg-orange-800 text-orange-300 px-1.5 py-0.5 rounded-lg font-bold">R</span>}
              </div>
            )}
            <span className="text-sm text-slate-400">
              AC <strong className="text-white font-mono">{acTotal}</strong>
            </span>
            {!isFinished && <span className="text-slate-600 text-xs">{expanded ? "▲" : "▼"}</span>}
          </div>
        </div>

        {/* HP bar */}
        <div className="space-y-1">
          <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
            <div className={`h-2.5 rounded-full transition-all duration-300 ${barColor}`}
              style={{ width: `${hpPct}%` }} />
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-mono text-slate-300">
              <strong className={p.currentHp === 0 ? "text-red-400" : "text-white"}>{p.currentHp}</strong>
              <span className="text-slate-500">/{p.maxHp}</span>
              {p.tempHp > 0 && <span className="text-blue-400 ml-1">+{p.tempHp}</span>}
            </span>
            <span className="text-xs text-slate-500 font-mono">{hpPct}%</span>
          </div>
        </div>

        {/* Death saves — always visible when unconscious */}
        {!p.isConscious && (
          <DeathSaveTracker
            participantId={p.id} combatId={combatId}
            displayName={p.displayName}
            deathSaveSuccesses={p.deathSaveSuccesses}
            deathSaveFailures={p.deathSaveFailures}
            isStabilized={p.isStabilized}
          />
        )}
      </div>

      {/* ── Expanded panel ───────────────────────────────────────── */}
      {expanded && !isFinished && (
        <div className={`border-t border-slate-700 bg-slate-900/50 px-4 py-4 space-y-4
          ${disabled ? "opacity-60 pointer-events-none" : ""}`}>

          {/* Action trackers */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Turn actions</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { field: "actionUsed"   as const, label: "Action",   used: p.actionUsed,   active: "bg-blue-600 border-blue-500",    hover: "hover:border-blue-600" },
                { field: "bonusUsed"    as const, label: "Bonus",    used: p.bonusUsed,    active: "bg-purple-600 border-purple-500", hover: "hover:border-purple-600" },
                { field: "reactionUsed" as const, label: "Reaction", used: p.reactionUsed, active: "bg-orange-600 border-orange-500", hover: "hover:border-orange-600" },
              ]).map(({ field, label, used, active, hover }) => (
                <button key={field} type="button" onClick={() => handleToggleAction(field)}
                  disabled={disabled}
                  className={`h-11 rounded-xl text-sm font-bold border-2 transition-all
                    ${used ? `${active} text-white` : `border-slate-600 text-slate-400 ${hover}`}`}>
                  {used ? `✓ ${label}` : label}
                </button>
              ))}
            </div>
          </div>

          {/* Target */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Target</p>
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)}
              className="w-full border-2 border-slate-600 rounded-xl px-3 h-11 text-sm bg-slate-800 text-white focus:outline-none focus:border-blue-500">
              {allParticipants.map((ap) => (
                <option key={ap.id} value={ap.id}>
                  {ap.id === p.id ? "Self — " : ""}{ap.displayName} ({ap.currentHp}/{ap.maxHp} HP){!ap.isConscious ? " 💀" : ""}
                </option>
              ))}
            </select>
            {selectedTarget && selectedTarget.id !== p.id && (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all
                    ${hpBarColor(Math.round((selectedTarget.currentHp/selectedTarget.maxHp)*100), selectedTarget.isConscious)}`}
                    style={{ width: `${Math.round((selectedTarget.currentHp/selectedTarget.maxHp)*100)}%` }} />
                </div>
                <span className="text-xs font-mono text-slate-400 whitespace-nowrap">
                  {selectedTarget.currentHp}/{selectedTarget.maxHp}
                  {selectedTarget.tempHp > 0 && <span className="text-blue-400"> +{selectedTarget.tempHp}</span>}
                </span>
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Amount</p>
            <div className="flex gap-2">
              <input type="number" min={1} value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDamage()}
                placeholder="e.g. 8"
                className="flex-1 border-2 border-slate-600 rounded-xl px-3 h-11 text-base bg-slate-800 text-white focus:outline-none focus:border-blue-500" />
              <button type="button" onClick={handleDamage} disabled={!amount || disabled}
                className="bg-red-600 text-white rounded-xl px-4 h-11 font-bold text-sm hover:bg-red-500 disabled:opacity-40 min-w-[64px] transition-colors">
                DMG
              </button>
              <button type="button" onClick={handleHeal} disabled={!amount || disabled}
                className="bg-green-600 text-white rounded-xl px-4 h-11 font-bold text-sm hover:bg-green-500 disabled:opacity-40 min-w-[64px] transition-colors">
                Heal
              </button>
            </div>
          </div>

          {/* Temp HP */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Temp HP (self)</p>
            <div className="flex gap-2">
              <input type="number" min={0} value={tempAmount}
                onChange={(e) => setTempAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSetTempHp()}
                placeholder="e.g. 10"
                className="flex-1 border-2 border-slate-600 rounded-xl px-3 h-11 text-base bg-slate-800 text-white focus:outline-none focus:border-blue-500" />
              <button type="button" onClick={handleSetTempHp} disabled={!tempAmount || disabled}
                className="bg-blue-500 text-white rounded-xl px-4 h-11 font-bold text-sm hover:bg-blue-400 disabled:opacity-40 transition-colors">
                Set
              </button>
            </div>
          </div>

          {/* Conditions */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Conditions (self)</p>
            {p.conditions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {p.conditions.map((c) => (
                  <button key={c.name} type="button" onClick={() => handleRemoveCondition(c.name)}
                    disabled={disabled}
                    className="text-xs bg-purple-900/60 text-purple-300 border border-purple-700 px-2.5 py-1 rounded-lg hover:bg-red-900/60 hover:text-red-300 hover:border-red-700 transition-colors min-h-[32px]"
                    title="Tap to remove">
                    {c.name} ✕
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {COMMON_CONDITIONS
                .filter((cn) => !p.conditions.some((c) => c.name === cn))
                .map((cn) => (
                  <button key={cn} type="button" onClick={() => handleAddCondition(cn)}
                    disabled={disabled}
                    className="text-xs border border-slate-600 text-slate-400 px-2.5 py-1 rounded-lg hover:bg-purple-900/40 hover:text-purple-300 hover:border-purple-700 transition-colors min-h-[32px]">
                    + {cn}
                  </button>
                ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={condInput}
                onChange={(e) => setCondInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCondition(condInput)}
                placeholder="Custom condition…"
                className="flex-1 border-2 border-slate-600 rounded-xl px-3 h-11 text-sm bg-slate-800 text-white focus:outline-none focus:border-blue-500" />
              <button type="button" onClick={() => handleAddCondition(condInput)}
                disabled={!condInput || disabled}
                className="border-2 border-slate-600 text-slate-400 rounded-xl px-4 h-11 text-sm hover:bg-slate-700 disabled:opacity-40 transition-colors">
                Add
              </button>
            </div>
          </div>

          {isMutating && (
            <p className="text-xs text-slate-500 text-center animate-pulse">Saving…</p>
          )}
        </div>
      )}
    </div>
  );
}
