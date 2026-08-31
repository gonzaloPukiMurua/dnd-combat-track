"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateCampaign, type UpdateCampaignState } from "@/lib/actions/campaigns";

const INITIAL: UpdateCampaignState = {};

// Same shared look as campaigns/new/page.tsx.
const inputClass =
  "w-full rounded-gothic-sm bg-gothic-surface-low px-4 py-3 font-gothic-body text-sm text-gothic-on-surface outline-none ring-1 ring-gothic-outline-variant shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] transition-all placeholder:text-gothic-outline focus:bg-gothic-surface focus:ring-gothic-primary";

// Client form mirrored on campaigns/new/page.tsx (useActionState + inputClass).
// updateCampaign redirects to the hub itself on success, so there's no
// success branch to handle here — only the error state.
export function EditCampaignForm({
  campaignId,
  name,
  description,
}: {
  campaignId: string;
  name: string;
  description: string;
}) {
  const [state, action, isPending] = useActionState(updateCampaign, INITIAL);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Link
          href={`/campaigns/${campaignId}`}
          className="text-sm text-gothic-on-surface-variant transition-colors hover:text-gothic-primary"
        >
          ← Volver a la campaña
        </Link>
        <h1 className="font-gothic-headline text-gothic-headline-sm uppercase tracking-[0.1em] text-gothic-primary">
          Editar Campaña
        </h1>
      </div>

      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="campaignId" value={campaignId} />

        {state.error && (
          <p className="rounded-gothic-sm bg-gothic-danger px-4 py-2 text-center text-sm text-gothic-danger-bright">
            {state.error}
          </p>
        )}

        <div className="space-y-1">
          <label htmlFor="name" className="pl-1 text-xs font-medium uppercase tracking-widest text-gothic-on-surface-variant">
            Nombre de la campaña
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={name}
            placeholder="Ej: La Maldición de Strahd"
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="description"
            className="flex items-center justify-between pl-1 text-xs font-medium uppercase tracking-widest text-gothic-on-surface-variant"
          >
            <span>Descripción</span>
            <span className="text-[10px] normal-case tracking-normal text-gothic-on-surface-variant/70">(Opcional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={description}
            placeholder="Un breve resumen de la trama o reglas de la mesa..."
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="mt-2 flex gap-3">
          <Link
            href={`/campaigns/${campaignId}`}
            className="flex h-12 flex-1 items-center justify-center rounded-gothic-sm text-sm font-medium text-gothic-on-surface-variant ring-1 ring-gothic-outline-variant transition-colors hover:bg-gothic-surface-high"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="h-12 flex-1 rounded-gothic-sm bg-gothic-primary font-gothic-body text-sm font-semibold text-gothic-on-primary shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] transition-all hover:bg-gothic-brass-bright active:scale-[0.98] disabled:opacity-50"
          >
            {isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
