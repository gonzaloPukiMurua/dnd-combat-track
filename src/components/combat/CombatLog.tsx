import { LogType } from "@prisma/client";

type LogEntry = {
  id:        string;
  round:     number;
  type:      LogType;
  amount:    number | null;
  note:      string | null;
  actor:     { displayName: string } | null;
  target:    { displayName: string } | null;
  createdAt: Date;
};

const TYPE_STYLES: Record<LogType, { label: string; color: string }> = {
  DAMAGE:            { label: "DAÑO", color: "bg-gothic-wine text-gothic-on-surface" },
  HEAL:              { label: "CURA", color: "bg-gothic-success-bg text-gothic-success-text" },
  CONDITION_ADDED:   { label: "COND", color: "bg-gothic-accent-brass text-gothic-on-primary" },
  CONDITION_REMOVED: { label: "COND", color: "bg-gothic-surface-high text-gothic-on-surface-variant" },
  NOTE:              { label: "NOTA", color: "bg-gothic-surface-high text-gothic-on-surface-variant" },
};

export function CombatLog({ logs }: { logs: LogEntry[] }) {
  // Group by round
  const byRound = logs.reduce<Record<number, LogEntry[]>>((acc, log) => {
    if (!acc[log.round]) acc[log.round] = [];
    acc[log.round].push(log);
    return acc;
  }, {});

  const rounds = Object.keys(byRound)
    .map(Number)
    .sort((a, b) => b - a); // most recent round first

  return (
    <div className="rounded-gothic-md ring-1 ring-gothic-outline-variant bg-gothic-surface-low divide-y divide-gothic-outline-variant max-h-80 overflow-y-auto">
      {rounds.map((round) => (
        <div key={round}>
          <div className="px-3 py-1 bg-gothic-surface-high text-xs font-medium text-gothic-on-surface-variant uppercase tracking-widest sticky top-0">
            Ronda {round}
          </div>
          {byRound[round].map((log) => {
            const style = TYPE_STYLES[log.type];
            return (
              <div key={log.id} className="flex items-start gap-3 px-3 py-2 text-sm">
                {/* Type badge */}
                <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded-gothic-sm flex-shrink-0 mt-0.5 ${style.color}`}>
                  {style.label}
                </span>

                {/* Description */}
                <span className="text-gothic-on-surface-variant flex-1">
                  {describeLog(log)}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function describeLog(log: LogEntry): string {
  const actor  = log.actor?.displayName  ?? "Alguien";
  const target = log.target?.displayName ?? "alguien";

  switch (log.type) {
    case "DAMAGE":
      return log.note
        ? `${actor} le hizo ${log.amount} de daño a ${target}. ${log.note}`
        : `${actor} le hizo ${log.amount} de daño a ${target}`;
    case "HEAL":
      return log.note
        ? `${target} recuperó ${log.amount} PV. ${log.note}`
        : `${target} recuperó ${log.amount} PV`;
    case "CONDITION_ADDED":
    case "CONDITION_REMOVED":
      return log.note ?? `Cambió una condición de ${target}`;
    case "NOTE":
      return log.note ?? "";
    default:
      return "";
  }
}
