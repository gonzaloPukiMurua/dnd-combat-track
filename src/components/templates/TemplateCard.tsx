"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTemplate } from "@/lib/actions/templates";
import { CharacterType } from "@prisma/client";

type Template = {
  id:              string;
  name:            string;
  type:            CharacterType;
  maxHp:           number;
  baseAc:          number;
  initiativeBonus: number;
};

const TYPE_LABELS: Record<CharacterType, string> = {
  PLAYER:  "Jugador",
  NPC:     "PNJ",
  MONSTER: "Monstruo",
};

const TYPE_COLORS: Record<CharacterType, string> = {
  PLAYER:  "bg-gothic-primary/20 text-gothic-primary",
  NPC:     "bg-gothic-success-bg text-gothic-success-text",
  MONSTER: "bg-gothic-danger/20 text-gothic-danger-bright",
};

export function TemplateCard({ template: t, campaignId }: { template: Template; campaignId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const bonus = t.initiativeBonus >= 0
    ? `+${t.initiativeBonus}`
    : `${t.initiativeBonus}`;

  function handleDelete() {
    if (!confirm(`¿Eliminar "${t.name}"? Esta acción no se puede deshacer.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTemplate(t.id);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className={`rounded-gothic-md bg-gothic-surface-low ring-1 ring-gothic-outline-variant transition-opacity ${isPending ? "opacity-50" : ""}`}>

      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">

        {/* Type badge */}
        <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-gothic-sm flex-shrink-0 ${TYPE_COLORS[t.type]}`}>
          {TYPE_LABELS[t.type]}
        </span>

        {/* Name */}
        <span className="font-gothic-headline font-semibold text-gothic-on-surface flex-1 min-w-0 truncate">
          {t.name}
        </span>

        {/* Stats */}
        <div className="hidden sm:flex gap-3 text-sm text-gothic-on-surface-variant flex-shrink-0">
          <span>PV <strong className="text-gothic-on-surface font-mono">{t.maxHp}</strong></span>
          <span>CA <strong className="text-gothic-on-surface font-mono">{t.baseAc}</strong></span>
          <span>Inic. <strong className="text-gothic-on-surface font-mono">{bonus}</strong></span>
        </div>

        {/* Compact stats on mobile */}
        <div className="flex sm:hidden gap-2 text-xs font-mono text-gothic-on-surface-variant flex-shrink-0">
          <span>{t.maxHp}pv</span>
          <span>{t.baseAc}ca</span>
          <span>{bonus}</span>
        </div>

        {/* Edit */}
        <a
          href={`/campaigns/${campaignId}/templates/${t.id}/edit`}
          className="w-9 h-9 flex items-center justify-center rounded-gothic-sm text-gothic-on-surface-variant hover:text-gothic-primary hover:bg-gothic-surface-high transition-colors flex-shrink-0"
          aria-label={`Editar ${t.name}`}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </a>

        {/* Delete */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          aria-label={`Eliminar ${t.name}`}
          className="w-9 h-9 flex items-center justify-center rounded-gothic-sm text-gothic-on-surface-variant hover:text-gothic-danger-bright hover:bg-gothic-danger/20 transition-colors flex-shrink-0 disabled:opacity-40"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Inline error */}
      {error && (
        <div className="px-4 pb-3">
          <p className="text-xs rounded-gothic-sm bg-gothic-danger px-3 py-2 text-gothic-danger-bright">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
