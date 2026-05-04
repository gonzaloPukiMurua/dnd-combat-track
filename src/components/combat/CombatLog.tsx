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
  DAMAGE:            { label: "DMG",  color: "bg-red-100 text-red-700" },
  HEAL:              { label: "HEAL", color: "bg-green-100 text-green-700" },
  CONDITION_ADDED:   { label: "COND", color: "bg-purple-100 text-purple-700" },
  CONDITION_REMOVED: { label: "COND", color: "bg-gray-100 text-gray-500" },
  NOTE:              { label: "NOTE", color: "bg-gray-100 text-gray-600" },
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
    <div className="border rounded bg-white divide-y max-h-80 overflow-y-auto">
      {rounds.map((round) => (
        <div key={round}>
          <div className="px-3 py-1 bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wide sticky top-0">
            Round {round}
          </div>
          {byRound[round].map((log) => {
            const style = TYPE_STYLES[log.type];
            return (
              <div key={log.id} className="flex items-start gap-3 px-3 py-2 text-sm">
                {/* Type badge */}
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${style.color}`}>
                  {style.label}
                </span>

                {/* Description */}
                <span className="text-gray-700 flex-1">
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
  const actor  = log.actor?.displayName  ?? "Someone";
  const target = log.target?.displayName ?? "someone";

  switch (log.type) {
    case "DAMAGE":
      return log.note
        ? `${actor} dealt ${log.amount} damage to ${target}. ${log.note}`
        : `${actor} dealt ${log.amount} damage to ${target}`;
    case "HEAL":
      return log.note
        ? `${target} was healed for ${log.amount} HP. ${log.note}`
        : `${target} was healed for ${log.amount} HP`;
    case "CONDITION_ADDED":
    case "CONDITION_REMOVED":
      return log.note ?? `Condition changed on ${target}`;
    case "NOTE":
      return log.note ?? "";
    default:
      return "";
  }
}
