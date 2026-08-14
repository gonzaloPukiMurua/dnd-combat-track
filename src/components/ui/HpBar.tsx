"use client";

import { hpBarColor } from "@/domain/combat/selectors";

type HpBarProps = {
  currentHp: number;
  maxHp: number;
  tempHp?: number;
  isConscious?: boolean;

  /**
   * Optional UI customizations
   */
  showPercentage?: boolean;
  heightClassName?: string;
  className?: string;
};

export function HpBar({
  currentHp,
  maxHp,
  tempHp = 0,
  isConscious = true,
  showPercentage = true,
  heightClassName = "h-2.5",
  className = "",
}: HpBarProps) {
  const hpPct =
    maxHp > 0
      ? Math.max(0, Math.round((currentHp / maxHp) * 100))
      : 0;

  const barColor = hpBarColor(hpPct, isConscious);

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Bar */}
      <div
        className={`w-full bg-slate-700 rounded-full overflow-hidden ${heightClassName}`}
      >
        <div
          className={`${heightClassName} rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${hpPct}%` }}
        />
      </div>

      {/* Numbers */}
      <div className="flex justify-between">
        <span className="text-sm font-mono text-slate-300">
          <strong
            className={currentHp === 0 ? "text-red-400" : "text-white"}
          >
            {currentHp}
          </strong>

          <span className="text-slate-500">/{maxHp}</span>

          {tempHp > 0 && (
            <span className="text-blue-400 ml-1">
              +{tempHp}
            </span>
          )}
        </span>

        {showPercentage && (
          <span className="text-xs text-slate-500 font-mono">
            {hpPct}%
          </span>
        )}
      </div>
    </div>
  );
}