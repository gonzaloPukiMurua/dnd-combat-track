"use client";

import { useActionState } from "react";
import { createTemplate, type TemplateFormState } from "@/lib/actions/templates";

const INITIAL_STATE: TemplateFormState = {};

const labelClass = "text-xs font-medium uppercase tracking-widest text-gothic-on-surface-variant";
const inputClass =
  "w-full rounded-gothic-sm bg-gothic-surface-low px-3 py-2 font-gothic-body text-sm text-gothic-on-surface outline-none ring-1 ring-gothic-outline-variant shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] transition-all placeholder:text-gothic-outline focus:bg-gothic-surface focus:ring-gothic-primary";
const numberInputClass = `${inputClass} font-mono`;

export function CreateTemplateForm({ campaignId }: { campaignId: string }) {
  const [state, action, isPending] = useActionState(createTemplate, INITIAL_STATE);

  return (
    <form
      action={action}
      className="rounded-gothic-md border border-dashed border-gothic-outline-variant bg-gothic-surface-low p-4 space-y-3"
    >
      <h2 className="font-gothic-headline text-lg text-gothic-primary">Nuevo personaje</h2>

      <input type="hidden" name="campaignId" value={campaignId} />

      {state.error && (
        <p className="rounded-gothic-sm bg-gothic-danger px-4 py-2 text-center text-sm text-gothic-danger-bright">
          {state.error}
        </p>
      )}

      {state.success && (
        <p className="rounded-gothic-sm bg-gothic-success-bg px-4 py-2 text-center text-sm text-gothic-success-text">
          ¡Personaje creado!
        </p>
      )}

      {/* Name */}
      <div className="flex flex-col gap-1">
        <label className={labelClass}>Nombre</label>
        <input
          name="name"
          placeholder="Trasgo, Thora, Dragón Antiguo…"
          required
          className={inputClass}
        />
      </div>

      {/* Type + HP side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Tipo</label>
          <select name="type" className={inputClass}>
            <option value="PLAYER">Jugador</option>
            <option value="NPC">PNJ</option>
            <option value="MONSTER">Monstruo</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClass}>PV máx.</label>
          <input
            name="maxHp"
            type="number"
            min={1}
            placeholder="10"
            required
            className={numberInputClass}
          />
        </div>
      </div>

      {/* AC + Initiative side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Clase de armadura</label>
          <input
            name="baseAc"
            type="number"
            min={1}
            placeholder="12"
            required
            className={numberInputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClass}>Bono de iniciativa</label>
          <input
            name="initiativeBonus"
            type="number"
            placeholder="0"
            defaultValue={0}
            className={numberInputClass}
          />
        </div>
      </div>

      {/* Level + Proficiency bonus */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Nivel</label>
          <input name="level" type="number" min={1} defaultValue={1} className={numberInputClass} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Bono de competencia</label>
          <input name="proficiencyBonus" type="number" defaultValue={2} className={numberInputClass} />
        </div>
      </div>

      {/* Ability scores */}
      <div className="grid grid-cols-3 gap-3">
        {([
          ["str", "FUE"],
          ["dex", "DES"],
          ["con", "CON"],
          ["int", "INT"],
          ["wis", "SAB"],
          ["cha", "CAR"],
        ] as const).map(([key, label]) => (
          <div key={key} className="flex flex-col gap-1">
            <label className={labelClass}>{label}</label>
            <input name={key} type="number" min={1} max={30} defaultValue={10} className={numberInputClass} />
          </div>
        ))}
      </div>

      {/* Exhaustion */}
      <div className="flex flex-col gap-1">
        <label className={labelClass}>Nivel de agotamiento</label>
        <input name="exhaustionLevel" type="number" min={0} max={6} defaultValue={0} className={numberInputClass} />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full h-11 rounded-gothic-sm bg-gothic-primary font-gothic-body text-sm font-semibold text-gothic-on-primary shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] transition-all hover:bg-gothic-brass-bright active:scale-[0.98] disabled:opacity-50"
      >
        {isPending ? "Creando…" : "Crear personaje"}
      </button>
    </form>
  );
}
