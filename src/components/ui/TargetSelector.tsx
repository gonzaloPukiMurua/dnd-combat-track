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
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
        Target
      </p>

      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="
          w-full
          border-2 border-slate-600
          rounded-xl px-3 h-11
          text-sm
          bg-slate-800 text-white
          focus:outline-none
          focus:border-blue-500
        "
      >
        {participants.map((p) => (
          <option
            key={p.id}
            value={p.id}
          >
            {p.id === currentParticipantId ? "Self — " : ""}
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
              <span className="text-xs font-mono text-slate-400 whitespace-nowrap">
                {selectedTarget.currentHp}/{selectedTarget.maxHp}

                {selectedTarget.tempHp > 0 && (
                  <span className="text-blue-400">
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