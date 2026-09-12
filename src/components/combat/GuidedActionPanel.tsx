"use client";

import type { ActionEconomy, TemplateActionView } from "@/domain/combat/types";

// F — guided attack/heal roll flow (etapa-3-acciones-tiradas.md §4 + §4b + §5).
// Purely presentational: CombatRow owns all state (economy filter, selected
// action, use counter, roll result) and the actual dice/AC math — this
// component only renders it and bubbles up clicks.

const ECONOMY_OPTIONS: { value: ActionEconomy; label: string }[] = [
  { value: "ACTION",       label: "Acción" },
  { value: "BONUS_ACTION", label: "Bono" },
  { value: "REACTION",     label: "Reacción" },
];

const KIND_LABELS: Record<string, string> = { ATTACK: "Ataque", HEAL: "Curación" };
const KIND_COLORS: Record<string, string> = {
  ATTACK: "bg-gothic-danger/20 text-gothic-danger-bright",
  HEAL:   "bg-gothic-success-bg text-gothic-success-text",
};

export type RollInfo = { text: string; hit?: boolean };

type Props = {
  actions: TemplateActionView[];
  actionUsed: boolean;
  bonusUsed: boolean;
  reactionUsed: boolean;
  disabled?: boolean;
  economy: ActionEconomy | null;
  onSelectEconomy: (economy: ActionEconomy) => void;
  selectedAction: TemplateActionView | null;
  onSelectAction: (action: TemplateActionView) => void;
  onCancel: () => void;
  useIndex: number;
  rollInfo: RollInfo | null;
  onRoll: () => void;
  targetName: string;
};

export function GuidedActionPanel({
  actions,
  actionUsed,
  bonusUsed,
  reactionUsed,
  disabled = false,
  economy,
  onSelectEconomy,
  selectedAction,
  onSelectAction,
  onCancel,
  useIndex,
  rollInfo,
  onRoll,
  targetName,
}: Props) {
  // Nothing to guide — the free amount input below is the only path, and
  // that's fine (§4b punto 6).
  if (actions.length === 0) return null;

  const usedByEconomy: Record<ActionEconomy, boolean> = {
    ACTION: actionUsed,
    BONUS_ACTION: bonusUsed,
    REACTION: reactionUsed,
  };

  const availableActions = economy ? actions.filter((a) => a.economyType === economy) : [];

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gothic-on-surface-variant uppercase tracking-widest">
        Acción guardada
      </p>

      <div className="grid grid-cols-3 gap-2">
        {ECONOMY_OPTIONS.map(({ value, label }) => {
          const used = usedByEconomy[value];
          const active = economy === value;
          return (
            <button
              key={value}
              type="button"
              disabled={disabled || used}
              onClick={() => onSelectEconomy(value)}
              className={`
                h-11 rounded-gothic-sm text-sm font-semibold ring-1 transition-all
                disabled:opacity-40
                ${active
                  ? "bg-gothic-primary ring-gothic-primary text-gothic-on-primary shadow-[inset_0_1px_0px_rgba(255,255,255,0.4)]"
                  : "ring-gothic-outline-variant text-gothic-on-surface-variant hover:ring-gothic-outline"}
              `}
            >
              {used ? `✓ ${label}` : label}
            </button>
          );
        })}
      </div>

      {economy && !selectedAction && (
        <div className="space-y-1.5">
          {availableActions.length === 0 && (
            <p className="text-xs text-gothic-on-surface-variant italic px-1">
              Sin acciones guardadas de este tipo.
            </p>
          )}

          {availableActions.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectAction(a)}
              className="
                w-full flex items-center gap-2 rounded-gothic-sm px-3 py-2 text-left
                ring-1 ring-gothic-outline-variant bg-gothic-surface
                hover:bg-gothic-surface-high transition-all disabled:opacity-40
              "
            >
              <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-gothic-sm flex-shrink-0 ${KIND_COLORS[a.kind] ?? ""}`}>
                {KIND_LABELS[a.kind] ?? a.kind}
              </span>
              <span className="font-semibold text-sm text-gothic-on-surface flex-1 truncate min-w-0">
                {a.name}
              </span>
              <span className="text-xs font-mono text-gothic-on-surface-variant flex-shrink-0 whitespace-nowrap">
                {a.kind === "ATTACK" && a.attackBonus != null && (
                  <>{a.attackBonus >= 0 ? `+${a.attackBonus}` : a.attackBonus}{" "}</>
                )}
                {a.formula}
                {a.uses > 1 && ` ×${a.uses}`}
              </span>
            </button>
          ))}
        </div>
      )}

      {selectedAction && (
        <div className="rounded-gothic-sm bg-gothic-surface-low ring-1 ring-gothic-outline-variant p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-gothic-on-surface">
              <span className="font-semibold">{selectedAction.name}</span>
              {selectedAction.uses > 1 && (
                <span className="text-gothic-on-surface-variant">
                  {" "}— uso {useIndex}/{selectedAction.uses}
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={onCancel}
              disabled={disabled}
              className="text-xs text-gothic-on-surface-variant hover:text-gothic-primary transition-colors disabled:opacity-40"
            >
              Cancelar
            </button>
          </div>

          <p className="text-xs text-gothic-on-surface-variant">
            Objetivo actual: <span className="text-gothic-on-surface">{targetName}</span>
          </p>

          <button
            type="button"
            disabled={disabled}
            onClick={onRoll}
            className="
              w-full h-10 rounded-gothic-sm bg-gothic-primary text-sm font-semibold text-gothic-on-primary
              hover:bg-gothic-brass-bright disabled:opacity-40 transition-colors
            "
          >
            {rollInfo ? "Repetir tirada" : "Tirar"}
          </button>

          {rollInfo && (
            <p
              className={`text-sm font-mono text-center ${
                rollInfo.hit === undefined
                  ? "text-gothic-on-surface"
                  : rollInfo.hit
                    ? "text-gothic-success-text"
                    : "text-gothic-danger-bright"
              }`}
            >
              {rollInfo.text}
            </p>
          )}

          {rollInfo && (
            <p className="text-xs text-gothic-on-surface-variant text-center">
              Cantidad prellenada abajo — confirmá con el botón de siempre.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
