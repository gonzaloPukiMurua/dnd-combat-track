"use client";

import { ActionBadges } from "@/components/ui/ActionBadges";
import { CombatStatusBadges } from "@/components/ui/CombatStatusBadges";
import { ConditionBadges } from "@/components/ui/ConditionBadges";

type Condition = { name: string };

type Props = {
  initiative:    number;
  displayName:   string;
  isConscious:   boolean;
  isStabilized:  boolean;
  isDead:        boolean;        // ← was hardcoded false, now a real prop
  conditions:    Condition[];    // ← was missing
  actionUsed:    boolean;
  bonusUsed:     boolean;
  reactionUsed:  boolean;
  acTotal:       number;
  isCurrentTurn: boolean;
  isFinished?:   boolean;
  expanded?:     boolean;
};

export function CombatantNameRow({
  initiative, displayName, isConscious, isStabilized,
  isDead, conditions, actionUsed, bonusUsed, reactionUsed,
  acTotal, isCurrentTurn, isFinished, expanded,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-2">

      {/* Left side */}
      <div className="flex items-center gap-3 min-w-0">

        {/* Initiative badge */}
        <div className={`w-9 h-9 rounded-gothic-sm flex items-center justify-center
          text-sm font-bold font-mono flex-shrink-0 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]
          ${isCurrentTurn ? "bg-gothic-surface-low ring-1 ring-gothic-primary text-gothic-primary" : "bg-gothic-surface-low ring-1 ring-gothic-outline-variant text-gothic-on-surface-variant"}`}>
          {initiative}
        </div>

        {/* Name + statuses + conditions */}
        <div className="min-w-0">
          <p className={`font-bold leading-tight truncate
            ${!isConscious ? "line-through text-gothic-on-surface-variant" : "text-gothic-on-surface"}`}>
            {displayName}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <CombatStatusBadges
              isConscious={isConscious}
              isStabilized={isStabilized}
              isDead={isDead}
            />
            <ConditionBadges
              conditions={conditions}
              removable={false}
              disabled={false}
            />
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <ActionBadges
          actionUsed={actionUsed}
          bonusUsed={bonusUsed}
          reactionUsed={reactionUsed}
        />
        <span className="text-sm text-gothic-outline">
          AC <strong className="text-gothic-on-surface font-mono">{acTotal}</strong>
        </span>
        {!isFinished && expanded !== undefined && (
          <span className="text-gothic-outline text-xs">
            {expanded ? "▲" : "▼"}
          </span>
        )}
      </div>
    </div>
  );
}