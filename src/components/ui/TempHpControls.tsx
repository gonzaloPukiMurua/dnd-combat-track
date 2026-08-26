"use client";

type Props = {
  value: string;
  disabled?: boolean;
  label?: string;
  buttonLabel?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function TempHpControls({
  value,
  disabled = false,
  label = "PV temporales",
  buttonLabel = "Fijar",
  placeholder = "ej. 10",
  onChange,
  onSubmit,
}: Props) {
  const canSubmit = value.trim() !== "" && !disabled;

  function handleEnter(
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (e.key === "Enter") {
      onSubmit();
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gothic-on-surface-variant uppercase tracking-widest">
        {label}
      </p>

      <div className="flex gap-2">
        <input
          type="number"
          min={0}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleEnter}
          className="
            flex-1
            rounded-gothic-sm bg-gothic-surface-low px-3 h-11
            text-base text-gothic-on-surface
            ring-1 ring-gothic-outline-variant
            shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)]
            focus:outline-none focus:ring-gothic-primary
            transition-all
          "
        />

        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          className="
            bg-gothic-accent-brass text-gothic-on-primary
            rounded-gothic-sm px-4 h-11
            font-bold text-sm
            hover:bg-gothic-brass-bright
            disabled:opacity-40
            transition-colors
          "
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}