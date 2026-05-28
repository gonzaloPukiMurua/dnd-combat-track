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
  label = "Temp HP",
  buttonLabel = "Set",
  placeholder = "e.g. 10",
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
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
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
            border-2 border-slate-600
            rounded-xl px-3 h-11
            text-base
            bg-slate-800 text-white
            focus:outline-none
            focus:border-blue-500
          "
        />

        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          className="
            bg-blue-500 text-white
            rounded-xl px-4 h-11
            font-bold text-sm
            hover:bg-blue-400
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