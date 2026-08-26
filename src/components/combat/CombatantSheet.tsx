import { HpDial } from "@/components/ui/HpDial";
import { AcBadge } from "@/components/ui/AcBadge";
import { CombatLog } from "@/components/combat/CombatLog";
import type { Participant, LogEntry } from "@/domain/combat/types";

// D10 — Ficha de combatiente. No hay referencia Stitch dedicada para esta
// pantalla; construida a partir de los componentes documentados en
// sistema-visual-etapa-1.md §3 (dial de HP, badge de AC, stat cards, ledger).

const ABILITIES: { key: keyof Pick<Participant, "str" | "dex" | "con" | "int" | "wis" | "cha">; label: string }[] = [
  { key: "str", label: "FUE" },
  { key: "dex", label: "DES" },
  { key: "con", label: "CON" },
  { key: "int", label: "INT" },
  { key: "wis", label: "SAB" },
  { key: "cha", label: "CAR" },
];

function modifier(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function StatCard({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center justify-between rounded-gothic-sm bg-gothic-surface-low px-3 py-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] ring-1 ring-gothic-outline-variant">
      <span className="text-xs font-medium uppercase tracking-widest text-gothic-on-surface-variant">{label}</span>
      <span className="font-mono text-sm text-gothic-on-surface">
        {score} <span className="text-gothic-on-surface-variant">({modifier(score)})</span>
      </span>
    </div>
  );
}

export function CombatantSheet({ participant: p, acTotal, logs }: { participant: Participant; acTotal: number; logs: LogEntry[] }) {
  const ownLogs = logs.filter((l) => l.actorId === p.id || l.targetId === p.id);

  return (
    <div className="space-y-4">
      {/* HP dial + AC badge */}
      <div className="flex items-center justify-center gap-6 py-2">
        <HpDial currentHp={p.currentHp} maxHp={p.maxHp} isConscious={p.isConscious} />
        <AcBadge value={acTotal} />
      </div>

      {/* Identity strip */}
      <div className="flex items-center justify-center gap-4 text-xs font-mono text-gothic-on-surface-variant">
        <span>NV {p.level}</span>
        <span>BC +{p.proficiencyBonus}</span>
        <span>VEL {p.speed} ft</span>
        {p.hitDice && <span>DG {p.hitDice}</span>}
      </div>

      {/* Ability score stat cards */}
      <div className="grid grid-cols-2 gap-2">
        {ABILITIES.map(({ key, label }) => (
          <StatCard key={key} label={label} score={p[key]} />
        ))}
      </div>

      {/* Ledger — this combatant's own entries */}
      {ownLogs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gothic-on-surface-variant uppercase tracking-widest">Bitácora</p>
          <CombatLog logs={ownLogs} />
        </div>
      )}
    </div>
  );
}
