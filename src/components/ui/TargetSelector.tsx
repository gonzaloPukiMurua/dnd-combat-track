"use client";

import { HpBar } from "./HpBar";

type ParticipantSummary = {
  id: string;
  displayName: string;
  currentHp: number;
  maxHp: number;
  tempHp: number;
  isConscious: boolean;
};

type Props = {
  value: string;
  participants: ParticipantSummary[];
  currentParticipantId?: string;
  disabled?: boolean;
  onChange: (targetId: string) => void;
};

export function TargetSelector({
  value,
  participants,
  currentParticipantId,
  disabled = false,
  onChange,
}: Props) {
  const selectedTarget = participants.find((p) => p.id === value);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gothic-on-surface-variant uppercase tracking-widest">
        Objetivo
      </p>

      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="
          w-full
          rounded-gothic-sm bg-gothic-surface-low px-3 h-11
          text-sm text-gothic-on-surface
          ring-1 ring-gothic-outline-variant
          shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)]
          focus:outline-none focus:ring-gothic-primary
          transition-all
        "
      >
        {participants.map((p) => (
          <option
            key={p.id}
            value={p.id}
          >
            {p.id === currentParticipantId ? "Uno mismo — " : ""}
            {p.displayName}
            {" "}
            ({p.currentHp}/{p.maxHp} HP)
            {!p.isConscious ? " 💀" : ""}
          </option>
        ))}
      </select>

      {selectedTarget &&
        selectedTarget.id !== currentParticipantId && (
          <div className="space-y-1">
            <HpBar
              currentHp={selectedTarget.currentHp}
              maxHp={selectedTarget.maxHp}
              tempHp={selectedTarget.tempHp}
              isConscious={selectedTarget.isConscious}
              heightClassName="h-1.5"
              showPercentage={false}
            />

            <div className="flex justify-end">
              <span className="text-xs font-mono text-gothic-on-surface-variant whitespace-nowrap">
                {selectedTarget.currentHp}/{selectedTarget.maxHp}

                {selectedTarget.tempHp > 0 && (
                  <span className="text-gothic-brass-bright">
                    {" "}
                    +{selectedTarget.tempHp}
                  </span>
                )}
              </span>
            </div>
          </div>
        )}
    </div>
  );
}