"use client";

type Props = {
  amount: string;
  disabled?: boolean;
  damageLabel?: string;
  healLabel?: string;
  placeholder?: string;
  onAmountChange: (value: string) => void;
  onDamage: () => void;
  onHeal: () => void;
};

export function AmountControls({
  amount,
  disabled = false,
  damageLabel = "DMG",
  healLabel = "Heal",
  placeholder = "e.g. 8",
  onAmountChange,
  onDamage,
  onHeal,
}: Props) {
  const canSubmit = !!amount && !disabled;

  function handleEnter(
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (e.key === "Enter") {
      onDamage();
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
        Amount
      </p>

      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          value={amount}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onAmountChange(e.target.value)}
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
          onClick={onDamage}
          className="
            bg-red-600 text-white
            rounded-xl px-4 h-11
            font-bold text-sm
            hover:bg-red-500
            disabled:opacity-40
            min-w-[64px]
            transition-colors
          "
        >
          {damageLabel}
        </button>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={onHeal}
          className="
            bg-green-600 text-white
            rounded-xl px-4 h-11
            font-bold text-sm
            hover:bg-green-500
            disabled:opacity-40
            min-w-[64px]
            transition-colors
          "
        >
          {healLabel}
        </button>
      </div>
    </div>
  );
}