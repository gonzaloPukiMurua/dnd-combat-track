"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CombatLog } from "@/components/combat/CombatLog";
import { DeathSaveTracker } from "@/components/combat/DeathSaveTracker";
import {
  dealDamage,
  healParticipant,
  addCondition,
  removeCondition,
} from "@/lib/actions/participant";
import type { Participant, LogEntry, CombatStatus } from "@/stores/combatStore";

type AcModifier = { source: string; value: number };
type Condition  = { name: string };

type Props = {
  combat: {
    id:               string;
    name:             string;
    status:           CombatStatus;
    round:            number;
    currentTurnIndex: number;
    participants:     Participant[];
    logs:             LogEntry[];
  };
  playerParticipantId: string;
  isFinished:          boolean;
  currentActorId:      string | null;
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

const TYPE_ACCENT: Record<string, string> = {
  PLAYER:  "border-l-indigo-400",
  NPC:     "border-l-emerald-400",
  MONSTER: "border-l-red-400",
};

export function SpectateView({
  combat,
  playerParticipantId,
  isFinished,
  currentActorId,
}: Props) {
  const router = useRouter();

  return (
    <div className="space-y-4 pb-8">

      {/* Header */}
      <div className="pt-2 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{combat.name}</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {isFinished
              ? "Combat finished"
              : `Round ${combat.round} · Spectating`}
          </p>
        </div>
        <span className="text-xs bg-blue-100 text-blue-700 border border-blue-200 font-bold px-2.5 py-1 rounded-full">
          Player view
        </span>
      </div>

      {/* Initiative list */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Initiative order
        </h2>

        {combat.participants.map((p) => {
          const isCurrentTurn = p.id === currentActorId;
          const isMyCharacter = p.id === playerParticipantId;

          return (
            <ParticipantRow
              key={p.id}
              participant={p}
              combatId={combat.id}
              round={combat.round}
              isCurrentTurn={isCurrentTurn}
              isMyCharacter={isMyCharacter}
              isFinished={isFinished}
              onMutate={() => router.refresh()}
            />
          );
        })}
      </section>

      {/* Combat log */}
      {combat.logs.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Log
          </h2>
          <CombatLog logs={combat.logs} />
        </section>
      )}
    </div>
  );
}

// ─── Individual participant row ───────────────────────────────────────────────

function ParticipantRow({
  participant: p,
  combatId,
  round,
  isCurrentTurn,
  isMyCharacter,
  isFinished,
  onMutate,
}: {
  participant:   Participant;
  combatId:      string;
  round:         number;
  isCurrentTurn: boolean;
  isMyCharacter: boolean;
  isFinished:    boolean;
  onMutate:      () => void;
}) {
  const [expanded,  setExpanded]  = useState(isMyCharacter);
  const [amount,    setAmount]    = useState("");
  const [condInput, setCondInput] = useState("");
  const [isPending, startTransition] = useTransition();

  const acMods     = (p.acModifiers as unknown as AcModifier[]) ?? [];
  const conditions = (p.conditions  as unknown as Condition[])  ?? [];
  const acTotal    = p.baseAc + acMods.reduce((s, m) => s + m.value, 0);
  const hpPct      = p.maxHp > 0 ? Math.max(0, Math.round((p.currentHp / p.maxHp) * 100)) : 0;
  const barColor   = hpBarColor(hpPct, p.isConscious);
  const isDead     = p.deathSaveFailures >= 3;

  function run(fn: () => Promise<void>) {
    startTransition(async () => { await fn(); onMutate(); });
  }

  function handleDamage() {
    const n = parseInt(amount);
    if (!n || n < 1) return;
    run(async () => {
      await dealDamage(makeFormData({ combatId, targetId: p.id, amount: n }));
      setAmount("");
    });
  }

  function handleHeal() {
    const n = parseInt(amount);
    if (!n || n < 1) return;
    run(async () => {
      await healParticipant(makeFormData({ combatId, targetId: p.id, amount: n }));
      setAmount("");
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

  const COMMON_CONDITIONS = [
    "Blinded","Charmed","Deafened","Frightened","Grappled",
    "Incapacitated","Poisoned","Prone","Restrained","Stunned",
  ];

  return (
    <div className={`
      rounded-2xl border-l-4 overflow-hidden transition-all
      bg-slate-800 border border-slate-700
      ${isCurrentTurn ? "border-l-blue-400 shadow-lg shadow-blue-900/30" : TYPE_ACCENT[p.template.type] ?? "border-l-slate-600"}
      ${isMyCharacter ? "ring-2 ring-indigo-400 ring-offset-1 ring-offset-slate-900" : ""}
      ${!p.isConscious ? "opacity-70" : ""}
    `}>

      {/* Collapsed header */}
      <div
        onClick={() => isMyCharacter && setExpanded((e) => !e)}
        className={`px-4 py-3 space-y-2 transition-colors
          ${isCurrentTurn ? "bg-blue-900/20" : ""}
          ${isMyCharacter ? "cursor-pointer hover:bg-slate-700/40" : "cursor-default"}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold font-mono flex-shrink-0
              ${isCurrentTurn ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-300"}`}>
              {p.initiative}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className={`font-bold leading-tight truncate ${!p.isConscious ? "line-through text-slate-500" : "text-white"}`}>
                  {p.displayName}
                </p>
                {isMyCharacter && (
                  <span className="text-xs bg-indigo-500 text-white px-1.5 py-0.5 rounded-lg font-bold flex-shrink-0">
                    You
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {isDead        && <span className="text-xs text-red-400 font-medium">💀 Dead</span>}
                {!isDead && !p.isConscious && !p.isStabilized && <span className="text-xs text-amber-400 font-medium">⚠ Unconscious</span>}
                {p.isStabilized && <span className="text-xs text-green-400 font-medium">💚 Stable</span>}
                {conditions.map((c) => (
                  <span key={c.name} className="text-xs bg-purple-900/60 text-purple-300 border border-purple-700 px-1.5 py-0.5 rounded-lg">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-sm text-slate-400">
              AC <strong className="text-white font-mono">{acTotal}</strong>
            </span>
            {isMyCharacter && !isFinished && (
              <span className="text-slate-600 text-xs">{expanded ? "▲" : "▼"}</span>
            )}
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

        {/* Death saves — visible to player for their own character */}
        {!p.isConscious && isMyCharacter && (
          <DeathSaveTracker
            participantId={p.id}
            combatId={combatId}
            displayName={p.displayName}
            deathSaveSuccesses={p.deathSaveSuccesses}
            deathSaveFailures={p.deathSaveFailures}
            isStabilized={p.isStabilized}
          />
        )}
      </div>

      {/* Expanded controls — only for player's own character */}
      {expanded && isMyCharacter && !isFinished && (
        <div className={`border-t border-slate-700 bg-slate-900/50 px-4 py-4 space-y-4
          ${isPending ? "opacity-60 pointer-events-none" : ""}`}>

          {/* Damage / Heal */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Amount</p>
            <div className="flex gap-2">
              <input type="number" min={1} value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDamage()}
                placeholder="e.g. 8"
                className="flex-1 border-2 border-slate-600 rounded-xl px-3 h-11 text-base bg-slate-800 text-white focus:outline-none focus:border-blue-500" />
              <button type="button" onClick={handleDamage}
                disabled={!amount || isPending}
                className="bg-red-600 text-white rounded-xl px-4 h-11 font-bold text-sm hover:bg-red-500 disabled:opacity-40 min-w-[64px] transition-colors">
                DMG
              </button>
              <button type="button" onClick={handleHeal}
                disabled={!amount || isPending}
                className="bg-green-600 text-white rounded-xl px-4 h-11 font-bold text-sm hover:bg-green-500 disabled:opacity-40 min-w-[64px] transition-colors">
                Heal
              </button>
            </div>
          </div>

          {/* Conditions */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Conditions</p>

            {conditions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {conditions.map((c) => (
                  <button key={c.name} type="button"
                    onClick={() => handleRemoveCondition(c.name)}
                    className="text-xs bg-purple-900/60 text-purple-300 border border-purple-700 px-2.5 py-1 rounded-lg hover:bg-red-900/60 hover:text-red-300 hover:border-red-700 transition-colors min-h-[32px]"
                    title="Tap to remove">
                    {c.name} ✕
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {COMMON_CONDITIONS
                .filter((cn) => !conditions.some((c) => c.name === cn))
                .map((cn) => (
                  <button key={cn} type="button"
                    onClick={() => handleAddCondition(cn)}
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
              <button type="button"
                onClick={() => handleAddCondition(condInput)}
                disabled={!condInput || isPending}
                className="border-2 border-slate-600 text-slate-400 rounded-xl px-4 h-11 text-sm hover:bg-slate-700 disabled:opacity-40 transition-colors">
                Add
              </button>
            </div>
          </div>

          {isPending && (
            <p className="text-xs text-slate-500 text-center animate-pulse">Saving…</p>
          )}
        </div>
      )}
    </div>
  );
}