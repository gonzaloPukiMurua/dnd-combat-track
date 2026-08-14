"use client";

type Condition = {
  name: string;
};

type Props = {
  conditions: Condition[];
  removable?: boolean;
  disabled?: boolean;
  onRemove?: (name: string) => void;
};

export function ConditionBadges({
  conditions,
  removable = false,
  disabled = false,
  onRemove,
}: Props) {
  if (conditions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {conditions.map((c) => (
        removable ? (
          <button
            key={c.name}
            type="button"
            disabled={disabled}
            onClick={() => onRemove?.(c.name)}
            title="Tap to remove"
            className="
              text-xs bg-purple-900/60 text-purple-300
              border border-purple-700
              px-2.5 py-1 rounded-lg
              hover:bg-red-900/60
              hover:text-red-300
              hover:border-red-700
              transition-colors
              min-h-[32px]
            "
          >
            {c.name} ✕
          </button>
        ) : (
          <span
            key={c.name}
            className="
              text-xs bg-purple-900/60 text-purple-300
              border border-purple-700
              px-1.5 py-0.5 rounded-lg
            "
          >
            {c.name}
          </span>
        )
      ))}
    </div>
  );
}