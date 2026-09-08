"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createTemplateAction,
  updateTemplateAction,
  deleteTemplateAction,
  type TemplateActionInput,
} from "@/lib/actions/templateActions";

type ActionRow = {
  id:          string;
  name:        string;
  kind:        string;
  attackBonus: number | null;
  formula:     string;
  damageType:  string | null;
  uses:        number;
};

const labelClass = "text-xs font-medium uppercase tracking-widest text-gothic-on-surface-variant";
const inputClass =
  "w-full rounded-gothic-sm bg-gothic-surface-low px-3 py-2 font-gothic-body text-sm text-gothic-on-surface outline-none ring-1 ring-gothic-outline-variant shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] transition-all placeholder:text-gothic-outline focus:bg-gothic-surface focus:ring-gothic-primary";
const numberInputClass = `${inputClass} font-mono`;

const KIND_LABELS: Record<string, string> = { ATTACK: "Ataque", HEAL: "Curación" };
const KIND_COLORS: Record<string, string> = {
  ATTACK: "bg-gothic-danger/20 text-gothic-danger-bright",
  HEAL:   "bg-gothic-success-bg text-gothic-success-text",
};

// ─── Add / edit form ─────────────────────────────────────────────────────────

function ActionForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<ActionRow>;
  submitLabel: string;
  onSubmit: (input: TemplateActionInput) => Promise<{ ok: boolean; error?: string }>;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<string>(initial?.kind ?? "ATTACK");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const attackBonusRaw = fd.get("attackBonus")?.toString().trim();
    const usesRaw = fd.get("uses")?.toString().trim();
    const input: TemplateActionInput = {
      name:       fd.get("name")?.toString() ?? "",
      kind,
      attackBonus: kind === "ATTACK" && attackBonusRaw ? Number(attackBonusRaw) : null,
      formula:    fd.get("formula")?.toString() ?? "",
      damageType: fd.get("damageType")?.toString() ?? null,
      uses:       usesRaw ? Number(usesRaw) : null,
    };
    setError(null);
    startTransition(async () => {
      const result = await onSubmit(input);
      if (result.ok) {
        // Both callers (add box / inline edit) unmount this form on success,
        // so there's nothing to reset here.
        onCancel?.();
        router.refresh();
      } else {
        setError(result.error ?? "Algo salió mal");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-gothic-sm bg-gothic-surface ring-1 ring-gothic-outline-variant p-3">
      {error && (
        <p className="rounded-gothic-sm bg-gothic-danger px-3 py-2 text-xs text-gothic-danger-bright">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className={labelClass}>Nombre</label>
          <input name="name" defaultValue={initial?.name ?? ""} required placeholder="Espada larga" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Tipo</label>
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className={inputClass}>
            <option value="ATTACK">Ataque</option>
            <option value="HEAL">Curación</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className={labelClass}>Fórmula</label>
          <input name="formula" defaultValue={initial?.formula ?? ""} required placeholder="1d8+3" className={numberInputClass} />
        </div>
        {kind === "ATTACK" ? (
          <div className="space-y-1.5">
            <label className={labelClass}>Bono de ataque</label>
            <input
              name="attackBonus"
              type="number"
              defaultValue={initial?.attackBonus ?? ""}
              required
              placeholder="+5"
              className={numberInputClass}
            />
          </div>
        ) : (
          <div />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className={labelClass}>
            Tipo de daño <span className="normal-case tracking-normal text-gothic-outline">(opcional)</span>
          </label>
          <input name="damageType" defaultValue={initial?.damageType ?? ""} placeholder="cortante" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>
            Usos por acción <span className="normal-case tracking-normal text-gothic-outline">(multiataque)</span>
          </label>
          <input
            name="uses"
            type="number"
            min={1}
            defaultValue={initial?.uses ?? 1}
            className={numberInputClass}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-10 rounded-gothic-sm ring-1 ring-gothic-outline-variant text-sm text-gothic-on-surface-variant hover:bg-gothic-surface-high transition-colors"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 h-10 rounded-gothic-sm bg-gothic-primary text-sm font-semibold text-gothic-on-primary shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] hover:bg-gothic-brass-bright transition-all disabled:opacity-50"
        >
          {isPending ? "Guardando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ─── One row in the list ─────────────────────────────────────────────────────

function ActionListItem({ action }: { action: ActionRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirm(`¿Borrar la acción "${action.name}"?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTemplateAction(action.id);
      if (result.ok) router.refresh();
      else setError(result.error ?? "No se pudo borrar");
    });
  }

  if (editing) {
    return (
      <li>
        <ActionForm
          initial={action}
          submitLabel="Guardar cambios"
          onSubmit={(input) => updateTemplateAction(action.id, input)}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className={`rounded-gothic-sm bg-gothic-surface ring-1 ring-gothic-outline-variant ${isPending ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-gothic-sm flex-shrink-0 ${KIND_COLORS[action.kind] ?? ""}`}>
          {KIND_LABELS[action.kind] ?? action.kind}
        </span>
        <span className="font-semibold text-sm text-gothic-on-surface truncate flex-1 min-w-0">{action.name}</span>
        <span className="hidden sm:flex items-center gap-2 text-xs font-mono text-gothic-on-surface-variant flex-shrink-0">
          {action.kind === "ATTACK" && action.attackBonus != null && (
            <span>{action.attackBonus >= 0 ? `+${action.attackBonus}` : action.attackBonus}</span>
          )}
          <span className="text-gothic-on-surface">{action.formula}</span>
          {action.uses > 1 && <span>×{action.uses}</span>}
          {action.damageType && <span className="italic">{action.damageType}</span>}
        </span>

        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Editar ${action.name}`}
          className="w-8 h-8 flex items-center justify-center rounded-gothic-sm text-gothic-on-surface-variant hover:text-gothic-primary hover:bg-gothic-surface-high transition-colors flex-shrink-0"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          aria-label={`Borrar ${action.name}`}
          className="w-8 h-8 flex items-center justify-center rounded-gothic-sm text-gothic-on-surface-variant hover:text-gothic-danger-bright hover:bg-gothic-danger/20 transition-colors flex-shrink-0 disabled:opacity-40"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* formula line on mobile */}
      <div className="sm:hidden px-3 pb-2 -mt-1 text-xs font-mono text-gothic-on-surface-variant flex gap-2">
        {action.kind === "ATTACK" && action.attackBonus != null && (
          <span>{action.attackBonus >= 0 ? `+${action.attackBonus}` : action.attackBonus}</span>
        )}
        <span className="text-gothic-on-surface">{action.formula}</span>
        {action.uses > 1 && <span>×{action.uses}</span>}
        {action.damageType && <span className="italic">{action.damageType}</span>}
      </div>

      {error && (
        <p className="mx-3 mb-2 text-xs rounded-gothic-sm bg-gothic-danger px-3 py-1.5 text-gothic-danger-bright">
          {error}
        </p>
      )}
    </li>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

export function TemplateActionsSection({
  characterTemplateId,
  actions,
}: {
  characterTemplateId: string;
  actions: ActionRow[];
}) {
  const [adding, setAdding] = useState(false);

  return (
    <section className="rounded-gothic-md bg-gothic-surface-low ring-1 ring-gothic-outline-variant p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-gothic-headline text-lg text-gothic-primary">Acciones</h2>
          <p className="text-xs text-gothic-on-surface-variant mt-0.5">
            Ataques y curaciones con su fórmula de dados, para tirar en combate.
          </p>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="h-9 px-3 rounded-gothic-sm bg-gothic-primary text-xs font-semibold text-gothic-on-primary shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] hover:bg-gothic-brass-bright transition-all whitespace-nowrap flex-shrink-0"
          >
            + Agregar acción
          </button>
        )}
      </div>

      {actions.length > 0 && (
        <ul className="space-y-2">
          {actions.map((a) => (
            <ActionListItem key={a.id} action={a} />
          ))}
        </ul>
      )}

      {actions.length === 0 && !adding && (
        <p className="text-sm text-gothic-on-surface-variant text-center py-3">
          Este personaje todavía no tiene acciones.
        </p>
      )}

      {adding && (
        <ActionForm
          submitLabel="Agregar acción"
          onSubmit={(input) => createTemplateAction(characterTemplateId, input)}
          onCancel={() => setAdding(false)}
        />
      )}
    </section>
  );
}
