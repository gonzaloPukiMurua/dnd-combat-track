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
            title="Tocá para quitar"
            className="
              text-xs font-mono uppercase bg-gothic-danger/20 text-gothic-danger-bright
              border border-gothic-danger
              px-2.5 py-1 rounded-gothic-sm
              hover:bg-gothic-danger
              hover:text-gothic-on-surface
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
              text-xs font-mono uppercase bg-gothic-danger/20 text-gothic-danger-bright
              border border-gothic-danger
              px-1.5 py-0.5 rounded-gothic-sm
            "
          >
            {c.name}
          </span>
        )
      ))}
    </div>
  );
}