"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createCampaign, type CreateCampaignState } from "@/lib/actions/campaigns";
import { InviteCodeChip } from "@/components/campaigns/InviteCodeChip";

const INITIAL: CreateCampaignState = {};

const inputClass =
  "w-full rounded-gothic-sm bg-gothic-surface-low px-4 py-3 font-gothic-body text-sm text-gothic-on-surface outline-none ring-1 ring-gothic-outline-variant shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] transition-all placeholder:text-gothic-outline focus:bg-gothic-surface focus:ring-gothic-primary";

export default function NewCampaignPage() {
  const [state, action, isPending] = useActionState(createCampaign, INITIAL);

  // D5 — no separate route: the same screen swaps to the confirmation view
  // once the action returns a created campaign.
  if (state.campaign) {
    return <CampaignCreated campaign={state.campaign} />;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-gothic-headline text-gothic-headline-sm uppercase tracking-[0.1em] text-gothic-primary">
          Nueva Campaña
        </h1>
        <p className="text-sm text-gothic-on-surface-variant">
          Iniciá tu próxima partida definiendo los parámetros básicos. Vas a poder invitar jugadores más tarde.
        </p>
      </div>

      <form action={action} className="flex flex-col gap-5">
        {state.error && (
          <p className="rounded-gothic-sm bg-gothic-danger px-4 py-2 text-center text-sm text-gothic-danger-bright">
            {state.error}
          </p>
        )}

        <div className="space-y-1">
          <label htmlFor="name" className="pl-1 text-xs font-medium uppercase tracking-widest text-gothic-on-surface-variant">
            Nombre de la campaña
          </label>
          <input id="name" name="name" required placeholder="Ej: La Maldición de Strahd" className={inputClass} />
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
            placeholder="Un breve resumen de la trama o reglas de la mesa..."
            className={`${inputClass} resize-none`}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-2 h-12 w-full rounded-gothic-sm bg-gothic-primary font-gothic-body text-sm font-semibold text-gothic-on-primary shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] transition-all hover:bg-gothic-brass-bright active:scale-[0.98] disabled:opacity-50"
        >
          {isPending ? "Forjando..." : "Crear campaña"}
        </button>
      </form>
    </div>
  );
}

function CampaignCreated({ campaign }: { campaign: { id: string; name: string; inviteCode: string } }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <h1 className="font-gothic-headline text-gothic-headline text-gothic-primary">¡Campaña creada!</h1>
        <p className="max-w-xs text-sm text-gothic-on-surface-variant">
          Compartí el código de abajo para invitar a los jugadores de{" "}
          <strong className="text-gothic-on-surface">{campaign.name}</strong>. El código no vence y se usa una sola
          vez por jugador.
        </p>
      </div>

      <InviteCodeChip code={campaign.inviteCode} size="lg" label="Código de invitación" />

      <Link
        href={`/campaigns/${campaign.id}`}
        className="text-sm text-gothic-on-surface-variant underline decoration-gothic-outline-variant underline-offset-4 transition-colors hover:text-gothic-primary hover:decoration-gothic-primary"
      >
        Continuar a mi campaña →
      </Link>
    </div>
  );
}
