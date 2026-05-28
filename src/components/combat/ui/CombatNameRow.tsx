"use client";

import { ActionBadges } from "./ActionBadges";
import { CombatStatusBadges } from "./CombatStatusBadges";

type Condition = {
  name: string;
};

type Props = {
  initiative: number;
  displayName: string;
  isConscious: boolean;
  isStabilized: boolean;
  conditions: Condition[];
  actionUsed: boolean;
  bonusUsed: boolean;
  reactionUsed: boolean;
  acTotal: number;
  isCurrentTurn: boolean;
  isFinished?: boolean;
  expanded?: boolean;
};

export function CombatantNameRow({
  initiative,
  displayName,
  isConscious,
  isStabilized,
  conditions,
  actionUsed,
  bonusUsed,
  reactionUsed,
  acTotal,
  isCurrentTurn,
  isFinished,
  expanded,
}: Props) {
  const isDead = false; // optionally pass this as prop instead

  return (
    <div className="flex items-center justify-between gap-2">

      {/* Left side */}
      <div className="flex items-center gap-3 min-w-0">

        {/* Initiative badge */}
        <div
          className={`
            w-9 h-9 rounded-xl flex items-center justify-center
            text-sm font-bold font-mono flex-shrink-0
            ${isCurrentTurn
              ? "bg-blue-500 text-white"
              : "bg-slate-700 text-slate-300"}
          `}
        >
          {initiative}
        </div>

        {/* Name + statuses */}
        <div className="min-w-0">
          <p
            className={`
              font-bold leading-tight truncate
              ${!isConscious
                ? "line-through text-slate-500"
                : "text-white"}
            `}
          >
            {displayName}
          </p>

          <CombatStatusBadges
            isConscious={isConscious}
            isStabilized={isStabilized}
            isDead={isDead}
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 flex-shrink-0">

        <ActionBadges
          actionUsed={actionUsed}
          bonusUsed={bonusUsed}
          reactionUsed={reactionUsed}
        />

        <span className="text-sm text-slate-400">
          AC <strong className="text-white font-mono">{acTotal}</strong>
        </span>

        {!isFinished && expanded !== undefined && (
          <span className="text-slate-600 text-xs">
            {expanded ? "▲" : "▼"}
          </span>
        )}
      </div>
    </div>
  );
}