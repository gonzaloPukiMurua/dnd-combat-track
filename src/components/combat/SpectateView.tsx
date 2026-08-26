"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CombatLog } from "@/components/combat/CombatLog";
import { DeathSaveTracker } from "@/components/combat/DeathSaveTracker";
import { CombatantSheet } from "@/components/combat/CombatantSheet";
import { CombatStatusBadges } from "@/components/ui/CombatStatusBadges";
import { ConditionBadges } from "@/components/ui/ConditionBadges";
import {
  dealDamage,
  healParticipant,
  addCondition,
  removeCondition,
} from "@/lib/actions/participant";
import { makeFormData } from "@/lib/utils/formData";
import {
  computeAcTotal,
  computeHpPct,
  qualitativeHpLabel,
  TYPE_ACCENT,
} from "@/domain/combat/selectors";
import type {
  Participant,
  LogEntry,
  CombatStatus,
  Condition,
} from "@/domain/combat/types";
import { HpBar } from "@/components/ui/HpBar";
import { ConditionsPanel } from "@/components/ui/ConditionsPanel";

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
  // null when the viewer has no CharacterTemplate fielded in this combat —
  // a DM previewing the player view, or a player whose character wasn't
  // added to this particular encounter. Nobody gets highlighted as "yours"
  // in that case, but the combat is still viewable.
  playerParticipantId: string | null;
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
  const isMyTurn = !isFinished && currentActorId !== null && currentActorId === playerParticipantId;

  return (
    <div className="space-y-4 pb-8">

      {/* Header */}
      <div className="pt-2 flex items-start justify-between">
        <div>
          <h1 className="font-gothic-headline text-gothic-headline-sm text-gothic-primary uppercase tracking-wide">{combat.name}</h1>
          <p className="text-sm text-gothic-on-surface-variant mt-0.5">
            {isFinished
              ? "Combate finalizado"
              : `Ronda ${combat.round} · Vista de jugador`}
          </p>
        </div>
      </div>

      {/* Turn banner — only when it's this viewer's own character's turn */}
      {isMyTurn && (
        <div className="w-full bg-gothic-success-bg text-gothic-success-text px-4 py-2.5 rounded-gothic-sm flex items-center justify-center gap-2 shadow-[inset_0_-1px_0_rgba(255,255,255,0.1)]">
          <span className="font-gothic-headline text-sm uppercase tracking-widest font-semibold">Es tu turno</span>
        </div>
      )}

      {/* Initiative list */}
      <section className="space-y-2">
        <h2 className="text-xs font-medium text-gothic-on-surface-variant uppercase tracking-widest">
          Orden de iniciativa
        </h2>

        {combat.participants.map((p) => {
          const isCurrentTurn = p.id === currentActorId;
          const isMyCharacter = p.id === playerParticipantId;

          return (
            <ParticipantRow
              key={p.id}
              participant={p}
              combatId={combat.id}
              logs={combat.logs}
              isCurrentTurn={isCurrentTurn}
              isMyCharacter={isMyCharacter}
              isFinished={isFinished}
              onMutate={() => router.refresh()}
            />
          );
        })}
      </section>

      {!isFinished && (
        <p className="text-center text-sm text-gothic-on-surface-variant opacity-70">
          Solo el DM puede avanzar el turno.
        </p>
      )}

      {/* Combat log */}
      {combat.logs.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-medium text-gothic-on-surface-variant uppercase tracking-widest">
            Bitácora
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
  logs,
  isCurrentTurn,
  isMyCharacter,
  isFinished,
  onMutate,
}: {
  participant:   Participant;
  combatId:      string;
  logs:          LogEntry[];
  isCurrentTurn: boolean;
  isMyCharacter: boolean;
  isFinished:    boolean;
  onMutate:      () => void;
}) {
  const [expanded,  setExpanded]  = useState(isMyCharacter);
  const [amount,    setAmount]    = useState("");
  const [condInput, setCondInput] = useState("");
  const [isPending, startTransition] = useTransition();

  const conditions = ((p.conditions as unknown as Condition[]) ?? []);
  const acTotal    = computeAcTotal(p.baseAc, p.acModifiers);
  const hpPct      = computeHpPct(p.currentHp, p.maxHp);
  const isDead     = p.deathSaveFailures >= 3;
  const qualitativeHp = qualitativeHpLabel(hpPct, p.isConscious);

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
      rounded-gothic-md border-l-4 overflow-hidden transition-all
      bg-gothic-surface ring-1 ring-gothic-outline-variant
      ${isCurrentTurn ? "border-l-gothic-primary shadow-[0_2px_8px_rgba(0,0,0,0.4)]" : TYPE_ACCENT[p.template.type] ?? "border-l-gothic-outline-variant"}
      ${isMyCharacter ? "ring-2 ring-gothic-primary" : ""}
      ${!p.isConscious ? "opacity-70" : ""}
    `}>

      {/* Collapsed header */}
      <div
        onClick={() => isMyCharacter && setExpanded((e) => !e)}
        className={`px-4 py-3 space-y-2 transition-colors
          ${isCurrentTurn ? "bg-gothic-surface-high" : ""}
          ${isMyCharacter ? "cursor-pointer hover:bg-gothic-surface-high/40" : "cursor-default"}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-gothic-sm flex items-center justify-center text-sm font-bold font-mono flex-shrink-0 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]
              ${isCurrentTurn ? "bg-gothic-surface-low ring-1 ring-gothic-primary text-gothic-primary" : "bg-gothic-surface-low ring-1 ring-gothic-outline-variant text-gothic-on-surface-variant"}`}>
              {p.initiative}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className={`font-gothic-headline uppercase tracking-wide leading-tight truncate
                  ${!p.isConscious ? "line-through text-gothic-on-surface-variant" : isMyCharacter ? "text-gothic-primary" : "text-gothic-on-surface"}`}>
                  {p.displayName}
                </p>
                {isMyCharacter && (
                  <span className="text-[10px] font-mono text-gothic-on-surface-variant flex-shrink-0">
                    (VOS)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <CombatStatusBadges isConscious={p.isConscious} isStabilized={p.isStabilized} isDead={isDead} />
                {!isMyCharacter && qualitativeHp && !isDead && !p.isStabilized && (
                  <span className="text-xs font-mono uppercase bg-gothic-danger/20 text-gothic-danger-bright border border-gothic-danger px-1.5 py-0.5 rounded-gothic-sm">
                    {qualitativeHp}
                  </span>
                )}
                <ConditionBadges conditions={conditions} removable={false} disabled={false} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {isMyCharacter && (
              <span className="text-sm text-gothic-outline">
                CA <strong className="text-gothic-on-surface font-mono">{acTotal}</strong>
              </span>
            )}
            {isMyCharacter && !isFinished && (
              <span className="text-gothic-outline text-xs">{expanded ? "▲" : "▼"}</span>
            )}
          </div>
        </div>

        {/* HP — exact bar for your own character, hidden (qualitative only) for everyone else */}
        {isMyCharacter && (
          <HpBar
            currentHp={p.currentHp}
            maxHp={p.maxHp}
            tempHp={p.tempHp}
            isConscious={p.isConscious}
          />
        )}

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
        <div className={`border-t border-gothic-outline-variant bg-gothic-background/60 px-4 py-4 space-y-4
          ${isPending ? "opacity-60 pointer-events-none" : ""}`}>

          {/* D10 — ficha de combatiente (solo para tu propio personaje) */}
          <CombatantSheet participant={p} acTotal={acTotal} logs={logs} />

          {/* Damage / Heal */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gothic-on-surface-variant uppercase tracking-widest">Cantidad</p>
            <div className="flex gap-2">
              <input type="number" min={1} value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDamage()}
                placeholder="ej. 8"
                className="flex-1 rounded-gothic-sm bg-gothic-surface-low px-3 h-11 text-base text-gothic-on-surface ring-1 ring-gothic-outline-variant shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] focus:outline-none focus:ring-gothic-primary transition-all" />
              <button type="button" onClick={handleDamage}
                disabled={!amount || isPending}
                className="bg-gothic-wine text-gothic-on-surface rounded-gothic-sm px-4 h-11 font-bold text-sm hover:bg-gothic-danger disabled:opacity-40 min-w-[64px] transition-colors">
                Daño
              </button>
              <button type="button" onClick={handleHeal}
                disabled={!amount || isPending}
                className="bg-gothic-success-bg text-gothic-success-text rounded-gothic-sm px-4 h-11 font-bold text-sm hover:brightness-110 disabled:opacity-40 min-w-[64px] transition-colors">
                Curar
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
            <p className="text-xs text-gothic-on-surface-variant text-center animate-pulse">Guardando…</p>
          )}
        </div>
      )}
    </div>
  );
}