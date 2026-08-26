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
  damageLabel = "Daño",
  healLabel = "Curar",
  placeholder = "ej. 8",
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
      <p className="text-xs font-medium text-gothic-on-surface-variant uppercase tracking-widest">
        Cantidad
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
          onClick={onDamage}
          className="
            bg-gothic-wine text-gothic-on-surface
            rounded-gothic-sm px-4 h-11
            font-bold text-sm
            hover:bg-gothic-danger
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
            bg-gothic-success-bg text-gothic-success-text
            rounded-gothic-sm px-4 h-11
            font-bold text-sm
            hover:brightness-110
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