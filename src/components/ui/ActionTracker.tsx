"use client";

type ActionField =
  | "actionUsed"
  | "bonusUsed"
  | "reactionUsed";

type Props = {
  actionUsed: boolean;
  bonusUsed: boolean;
  reactionUsed: boolean;
  disabled?: boolean;
  onToggle: (field: ActionField) => void;
};

const ACTIONS = [
  { field: "actionUsed" as const, label: "Acción" },
  { field: "bonusUsed" as const, label: "Adicional" },
  { field: "reactionUsed" as const, label: "Reacción" },
];

export function ActionTracker({
  actionUsed,
  bonusUsed,
  reactionUsed,
  disabled = false,
  onToggle,
}: Props) {
  const state = {
    actionUsed,
    bonusUsed,
    reactionUsed,
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gothic-on-surface-variant uppercase tracking-widest">
        Economía de turno
      </p>

      <div className="grid grid-cols-3 gap-2">
        {ACTIONS.map(({ field, label }) => {
          const used = state[field];

          return (
            <button
              key={field}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(field)}
              className={`
                h-11 rounded-gothic-sm text-sm font-semibold
                ring-1 transition-all
                ${
                  used
                    ? "bg-gothic-primary ring-gothic-primary text-gothic-on-primary shadow-[inset_0_1px_0px_rgba(255,255,255,0.4)]"
                    : "ring-gothic-outline-variant text-gothic-on-surface-variant hover:ring-gothic-outline"
                }
              `}
            >
              {used ? `✓ ${label}` : label}
            </button>
          );
        })}
      </div>
    </div>
  );
}