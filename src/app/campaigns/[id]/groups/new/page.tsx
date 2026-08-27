"use client";

import { useActionState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import { createGroup, type GroupFormState } from "@/lib/actions/groups";
import Link from "next/link";

const INITIAL: GroupFormState = {};

// D16 — was the flat /groups/new route; moved under /campaigns/[id]. Stays
// a client component (useActionState needs it), so campaignId comes from
// useParams() rather than an awaited `params` prop — the DM-only guard
// still runs server-side in ../layout.tsx before this ever renders.
export default function NewGroupPage() {
  const router = useRouter();
  const { id: campaignId } = useParams<{ id: string }>();
  const [state, action, isPending] = useActionState(createGroup, INITIAL);

  useEffect(() => {
    if (state.success) router.push(`/campaigns/${campaignId}/groups`);
  }, [state.success, router, campaignId]);

  const inputClass =
    "w-full rounded-gothic-sm bg-gothic-surface-low px-3 py-2 font-gothic-body text-sm text-gothic-on-surface outline-none ring-1 ring-gothic-outline-variant shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] transition-all placeholder:text-gothic-outline focus:bg-gothic-surface focus:ring-gothic-primary";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href={`/campaigns/${campaignId}/groups`} className="text-sm text-gothic-on-surface-variant hover:text-gothic-primary transition-colors">
          ← Volver a grupos
        </Link>
        <h1 className="font-gothic-headline text-gothic-headline-sm text-gothic-primary mt-1">Nuevo grupo</h1>
      </div>

      <form
        action={action}
        className="rounded-gothic-md border border-dashed border-gothic-outline-variant bg-gothic-surface-low p-5 space-y-4"
      >
        <input type="hidden" name="campaignId" value={campaignId} />

        {state.error && (
          <p className="rounded-gothic-sm bg-gothic-danger px-4 py-2 text-center text-sm text-gothic-danger-bright">
            {state.error}
          </p>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-widest text-gothic-on-surface-variant">Nombre</label>
          <input name="name" placeholder="Los Rompealbas, Emboscada en el bosque…" required className={inputClass} />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-widest text-gothic-on-surface-variant">Descripción (opcional)</label>
          <input name="description" placeholder="Notas sobre este grupo…" className={inputClass} />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href={`/campaigns/${campaignId}/groups`}
            className="flex-1 h-11 flex items-center justify-center rounded-gothic-sm ring-1 ring-gothic-outline-variant text-gothic-on-surface-variant text-sm font-medium hover:bg-gothic-surface-high transition-colors">
            Cancelar
          </Link>
          <button type="submit" disabled={isPending}
            className="flex-1 h-11 rounded-gothic-sm bg-gothic-primary font-gothic-body text-sm font-semibold text-gothic-on-primary shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] hover:bg-gothic-brass-bright disabled:opacity-50 transition-all">
            {isPending ? "Creando…" : "Crear grupo"}
          </button>
        </div>
      </form>
    </div>
  );
}
