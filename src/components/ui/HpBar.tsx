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
  const isCritical = isConscious && hpPct <= 25;
  const numberColor = !isConscious
    ? "text-gothic-on-surface-variant"
    : isCritical
    ? "text-gothic-danger-bright"
    : "text-gothic-success-text";

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Bar */}
      <div
        className={`w-full bg-gothic-background rounded-full overflow-hidden border border-gothic-outline-variant shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] ${heightClassName}`}
      >
        <div
          className={`${heightClassName} rounded-full transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] ${barColor} ${isCritical ? "animate-pulse" : ""}`}
          style={{ width: `${hpPct}%` }}
        />
      </div>

      {/* Numbers */}
      <div className="flex justify-between">
        <span className={`font-mono text-sm ${numberColor}`}>
          <strong>{currentHp}</strong>

          <span className="text-gothic-on-surface-variant">/{maxHp}</span>

          {tempHp > 0 && (
            <span className="text-gothic-brass-bright ml-1">
              +{tempHp}
            </span>
          )}
        </span>

        {showPercentage && (
          <span className="text-xs font-mono text-gothic-on-surface-variant">
            {hpPct}%
          </span>
        )}
      </div>
    </div>
  );
}