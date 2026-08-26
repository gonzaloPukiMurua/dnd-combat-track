type Props = {
  actionUsed: boolean;
  bonusUsed: boolean;
  reactionUsed: boolean;
};

export function ActionBadges({
  actionUsed,
  bonusUsed,
  reactionUsed,
}: Props) {
  const hasActions =
    actionUsed || bonusUsed || reactionUsed;

  if (!hasActions) return null;

  return (
    <div className="flex gap-1">
      {actionUsed && (
        <span
          className="
            text-xs font-mono font-bold
            bg-gothic-surface-high text-gothic-on-surface-variant
            ring-1 ring-gothic-outline-variant
            px-1.5 py-0.5 rounded-gothic-sm
          "
          title="Acción usada"
        >
          A
        </span>
      )}

      {bonusUsed && (
        <span
          className="
            text-xs font-mono font-bold
            bg-gothic-surface-high text-gothic-on-surface-variant
            ring-1 ring-gothic-outline-variant
            px-1.5 py-0.5 rounded-gothic-sm
          "
          title="Acción adicional usada"
        >
          B
        </span>
      )}

      {reactionUsed && (
        <span
          className="
            text-xs font-mono font-bold
            bg-gothic-surface-high text-gothic-on-surface-variant
            ring-1 ring-gothic-outline-variant
            px-1.5 py-0.5 rounded-gothic-sm
          "
          title="Reacción usada"
        >
          R
        </span>
      )}
    </div>
  );
}