"use client";

import { useState, useTransition } from "react";
import { createTrait, deleteTrait } from "@/lib/actions/traits";
import { MAX_TRAIT_DESCRIPTION, MAX_TRAIT_NAME } from "@/domain/character/details";

// A2 — el DM carga los rasgos de clase y dotes del personaje en texto libre (7.3, D-17).
// Si un rasgo tiene usos, se carga además como recurso en la sección de abajo (D-15).

type Trait = { id: string; name: string; description: string | null };

const labelClass = "text-xs font-medium uppercase tracking-widest text-gothic-on-surface-variant";
const inputClass =
  "w-full rounded-gothic-sm bg-gothic-surface-low px-3 py-2 text-sm text-gothic-on-surface ring-1 ring-gothic-outline-variant outline-none focus:ring-gothic-primary";

function TraitRow({ trait }: { trait: Trait }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function remove() {
    setMsg(null);
    startTransition(async () => {
      const r = await deleteTrait(trait.id);
      if (!r.ok) setMsg(r.error);
    });
  }

  return (
    <li className="flex flex-col gap-1 rounded-gothic-sm bg-gothic-surface p-3 ring-1 ring-gothic-outline-variant">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-gothic-on-surface">{trait.name}</span>
          {trait.description && <span className="text-xs text-gothic-on-surface-variant">{trait.description}</span>}
        </div>
        <button
          type="button"
          onClick={remove}
          disabled={isPending}
          className="h-9 shrink-0 px-3 rounded-gothic-sm ring-1 ring-gothic-outline-variant text-xs text-gothic-on-surface-variant hover:text-gothic-danger-bright disabled:opacity-40"
        >
          Borrar
        </button>
      </div>
      {msg && <p className="text-xs text-gothic-danger-bright">{msg}</p>}
    </li>
  );
}

export function TraitsManager({ templateId, traits }: { templateId: string; traits: Trait[] }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function add() {
    setMsg(null);
    startTransition(async () => {
      const r = await createTrait(templateId, { name, description });
      if (r.ok) {
        setName(""); setDescription("");
        setMsg({ ok: true, text: "Rasgo agregado" });
      } else {
        setMsg({ ok: false, text: r.error });
      }
    });
  }

  return (
    <section className="rounded-gothic-md bg-gothic-surface-low ring-1 ring-gothic-outline-variant p-5 space-y-4">
      <div className="space-y-1">
        <h2 className="font-gothic-headline text-lg text-gothic-primary">Rasgos y dotes</h2>
        <p className="text-xs text-gothic-on-surface-variant">
          Texto libre. Si un rasgo tiene usos (Furia, Segundo Aire), cargalo también como recurso.
        </p>
      </div>

      {traits.length === 0 ? (
        <p className="text-sm text-gothic-on-surface-variant">Todavía no hay rasgos cargados.</p>
      ) : (
        <ul className="space-y-2">
          {traits.map((t) => <TraitRow key={t.id} trait={t} />)}
        </ul>
      )}

      <div className="space-y-3 border-t border-gothic-outline-variant pt-4">
        <p className={labelClass}>Agregar rasgo o dote</p>
        <input
          className={inputClass}
          aria-label="Nombre del rasgo"
          placeholder="Nombre (ej. Ataque furtivo)"
          maxLength={MAX_TRAIT_NAME}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className={`${inputClass} resize-y`}
          aria-label="Descripción del rasgo"
          rows={2}
          placeholder="Descripción breve (opcional)"
          maxLength={MAX_TRAIT_DESCRIPTION}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={add}
            disabled={isPending || name.trim() === ""}
            className="h-11 px-5 rounded-gothic-sm bg-gothic-primary font-gothic-body text-sm font-semibold text-gothic-on-primary hover:bg-gothic-brass-bright disabled:opacity-40"
          >
            {isPending ? "Agregando…" : "Agregar rasgo"}
          </button>
          {msg && <span className={`text-xs ${msg.ok ? "text-gothic-success-text" : "text-gothic-danger-bright"}`}>{msg.text}</span>}
        </div>
      </div>
    </section>
  );
}
