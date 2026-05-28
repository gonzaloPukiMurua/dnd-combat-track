type Props = {
  isConscious: boolean;
  isStabilized: boolean;
  isDead: boolean;
};

export function CombatStatusBadges({
  isConscious,
  isStabilized,
  isDead,
}: Props) {

  return (
    <>
      {isDead && (
        <span className="text-xs text-red-400 font-medium">
          💀 Dead
        </span>
      )}

      {!isDead && !isConscious && !isStabilized && (
        <span className="text-xs text-amber-400 font-medium">
          ⚠ Unconscious
        </span>
      )}

      {isStabilized && (
        <span className="text-xs text-green-400 font-medium">
          💚 Stable
        </span>
      )}
    </>
  );
}