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
  {
    field: "actionUsed" as const,
    label: "Action",
    active: "bg-blue-600 border-blue-500",
    hover: "hover:border-blue-600",
  },
  {
    field: "bonusUsed" as const,
    label: "Bonus",
    active: "bg-purple-600 border-purple-500",
    hover: "hover:border-purple-600",
  },
  {
    field: "reactionUsed" as const,
    label: "Reaction",
    active: "bg-orange-600 border-orange-500",
    hover: "hover:border-orange-600",
  },
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
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
        Turn actions
      </p>

      <div className="grid grid-cols-3 gap-2">
        {ACTIONS.map(({ field, label, active, hover }) => {
          const used = state[field];

          return (
            <button
              key={field}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(field)}
              className={`
                h-11 rounded-xl text-sm font-bold
                border-2 transition-all
                ${
                  used
                    ? `${active} text-white`
                    : `border-slate-600 text-slate-400 ${hover}`
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