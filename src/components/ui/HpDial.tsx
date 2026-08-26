"use client";

type Props = {
  currentHp: number;
  maxHp: number;
  isConscious?: boolean;
  size?: number;
};

// sistema-visual-etapa-1.md §3 — "Dial circular de HP: anillo de progreso,
// readout en mono al centro. Color condicional: brass-bright por encima del
// 25%, danger-bright + pulso por debajo."
export function HpDial({ currentHp, maxHp, isConscious = true, size = 88 }: Props) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100))) : 0;
  const isCritical = isConscious && pct <= 25;

  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  const ringColorClass = !isConscious
    ? "text-gothic-outline-variant"
    : isCritical
    ? "text-gothic-danger-bright"
    : "text-gothic-brass-bright";

  return (
    <div
      className={`relative inline-flex items-center justify-center ${isCritical ? "animate-pulse" : ""}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="text-gothic-surface-high"
          stroke="currentColor"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${ringColorClass} transition-all duration-300`}
          stroke="currentColor"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-lg font-bold leading-none text-gothic-on-surface">{currentHp}</span>
        <span className="font-mono text-[10px] leading-none text-gothic-on-surface-variant mt-1">/{maxHp}</span>
      </div>
    </div>
  );
}
