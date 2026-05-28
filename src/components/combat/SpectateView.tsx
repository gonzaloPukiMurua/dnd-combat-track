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
import { makeFormData } from "@/lib/utils/formData";
import { 
  hpBarColor, 
  TYPE_ACCENT
} from "@/lib/utils/combat";
import type { 
  Participant, 
  LogEntry, 
  CombatStatus
 } from "@/stores/combatStore";
import { HpBar } from "./ui/HpBar";
import { ConditionsPanel } from "./ui/ConditionsPanel";
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
    run(async () => {
      await removeCondition(
        makeFormData({ 
          combatId, 
          targetId: p.id, 
          condition: name })
        );
      });
    }

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
        <HpBar
          currentHp={p.currentHp}
          maxHp={p.maxHp}
          tempHp={p.tempHp}
          isConscious={p.isConscious}
        />

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
          <ConditionsPanel
            conditions={conditions}
            disabled={isPending}
            onAddCondition={handleAddCondition}
            onRemoveCondition={handleRemoveCondition}
          />

          {isPending && (
            <p className="text-xs text-slate-500 text-center animate-pulse">Saving…</p>
          )}
        </div>
      )}
    </div>
  );
}