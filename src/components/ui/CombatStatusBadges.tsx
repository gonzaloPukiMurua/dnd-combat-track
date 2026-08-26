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
        <span className="text-xs text-gothic-danger-bright font-medium">
          💀 Muerto
        </span>
      )}

      {!isDead && !isConscious && !isStabilized && (
        <span className="text-xs text-gothic-brass-bright font-medium">
          ⚠ Inconsciente
        </span>
      )}

      {isStabilized && (
        <span className="text-xs text-gothic-success-text font-medium">
          💚 Estable
        </span>
      )}
    </>
  );
}