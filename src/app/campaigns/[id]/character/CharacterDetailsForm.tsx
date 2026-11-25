"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCharacterDetails } from "@/lib/actions/character";
import { MAX_BACKSTORY, MAX_SHORT_TEXT, PHYSICAL_FIELDS, type PhysicalKey } from "@/domain/character/details";

// A2 / D-17 — lo que el jugador edita de su personaje: datos físicos, historia
// breve y plata. Un solo botón de guardar para no mandar una acción por campo.

type Values = Record<PhysicalKey, string> & { backstory: string; silver: string };

const labelClass = "text-[10px] uppercase tracking-widest text-gothic-on-surface-variant";
const inputClass =
  "w-full rounded-gothic-sm bg-gothic-surface-low px-3 py-2 font-gothic-body text-sm text-gothic-on-surface outline-none ring-1 ring-gothic-outline-variant shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] transition-all placeholder:text-gothic-outline focus:bg-gothic-surface focus:ring-gothic-primary";

export function CharacterDetailsForm({ templateId, initial }: { templateId: string; initial: Values }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const dirty = (Object.keys(values) as (keyof Values)[]).some((k) => values[k] !== saved[k]);
  const tooLong = values.backstory.length > MAX_BACKSTORY;

  function set<K extends keyof Values>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setJustSaved(false);
  }

  function save() {
    if (!dirty || tooLong) return;
    setError(null);
    startTransition(async () => {
      const res = await updateCharacterDetails(templateId, { ...values, silver: Number(values.silver || 0) });
      if (res.error) {
        setError(res.error);
      } else {
        setSaved(values);
        setJustSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-gothic-sm bg-gothic-surface p-4 ring-1 ring-gothic-outline-variant">
      {error && (
        <p className="rounded-gothic-sm bg-gothic-danger px-4 py-2 text-center text-sm text-gothic-danger-bright">{error}</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PHYSICAL_FIELDS.map(({ key, label }) => (
          <label key={key} className="flex flex-col gap-1">
            <span className={labelClass}>{label}</span>
            <input
              className={inputClass}
              maxLength={MAX_SHORT_TEXT}
              value={values[key]}
              onChange={(e) => set(key, e.target.value)}
            />
          </label>
        ))}
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Plata (pp)</span>
          <input
            className={`${inputClass} font-mono`}
            type="number"
            min={0}
            step={1}
            value={values.silver}
            onChange={(e) => set("silver", e.target.value)}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Historia breve</span>
        <textarea
          className={`${inputClass} resize-y`}
          rows={3}
          value={values.backstory}
          onChange={(e) => set("backstory", e.target.value)}
          placeholder="De dónde viene, qué busca…"
        />
      </label>

      <div className="flex items-center justify-between gap-3">
        <span className={`font-gothic-data text-xs ${tooLong ? "text-gothic-danger-bright" : "text-gothic-on-surface-variant"}`}>
          {values.backstory.length}/{MAX_BACKSTORY}
        </span>
        <div className="flex items-center gap-3">
          {justSaved && !dirty && <span className="text-xs text-gothic-success-text">Guardado</span>}
          <button
            type="button"
            onClick={save}
            disabled={isPending || !dirty || tooLong}
            className="h-11 shrink-0 rounded-gothic-sm bg-gothic-primary px-5 font-gothic-body text-sm font-semibold text-gothic-on-primary shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] transition-all hover:bg-gothic-brass-bright active:scale-[0.98] disabled:opacity-50"
          >
            {isPending ? "Guardando…" : "Guardar datos"}
          </button>
        </div>
      </div>
    </div>
  );
}
