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
            text-xs font-bold
            bg-blue-800 text-blue-300
            px-1.5 py-0.5 rounded-lg
          "
          title="Action used"
        >
          A
        </span>
      )}

      {bonusUsed && (
        <span
          className="
            text-xs font-bold
            bg-purple-800 text-purple-300
            px-1.5 py-0.5 rounded-lg
          "
          title="Bonus action used"
        >
          B
        </span>
      )}

      {reactionUsed && (
        <span
          className="
            text-xs font-bold
            bg-orange-800 text-orange-300
            px-1.5 py-0.5 rounded-lg
          "
          title="Reaction used"
        >
          R
        </span>
      )}
    </div>
  );
}