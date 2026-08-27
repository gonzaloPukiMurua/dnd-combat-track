"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteGroup } from "@/lib/actions/groups";

type Member = {
  id:       string;
  quantity: number;
  template: {
    name:    string;
    type:    string;
    maxHp:   number;
    baseAc:  number;
  };
};

type Group = {
  id:          string;
  name:        string;
  description: string | null;
  members:     Member[];
};

const TYPE_COLORS: Record<string, string> = {
  PLAYER:  "bg-gothic-primary/20 text-gothic-primary",
  NPC:     "bg-gothic-success-bg text-gothic-success-text",
  MONSTER: "bg-gothic-danger/20 text-gothic-danger-bright",
};

export function GroupCard({ group: g, campaignId }: { group: Group; campaignId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirm(`¿Eliminar "${g.name}"? Esta acción no se puede deshacer.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteGroup(g.id);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  const totalParticipants = g.members.reduce((n, m) => n + m.quantity, 0);

  return (
    <div className={`rounded-gothic-md bg-gothic-surface-low ring-1 ring-gothic-outline-variant transition-opacity ${isPending ? "opacity-50" : ""}`}>

      {/* Header row */}
      <div className="flex items-start gap-3 px-4 py-3">

        {/* Link to detail page */}
        <a href={`/campaigns/${campaignId}/groups/${g.id}`} className="flex-1 min-w-0 group">
          <p className="font-gothic-headline font-semibold text-gothic-on-surface group-hover:text-gothic-primary transition-colors truncate">
            {g.name}
          </p>
          <p className="text-sm text-gothic-on-surface-variant mt-0.5">
            {g.members.length === 0
              ? "Sin miembros todavía"
              : `${totalParticipants} participante${totalParticipants !== 1 ? "s" : ""} · ${g.members.length} personaje${g.members.length !== 1 ? "s" : ""}`}
          </p>
          {g.description && (
            <p className="text-xs text-gothic-on-surface-variant mt-0.5 truncate">{g.description}</p>
          )}
        </a>

        {/* Edit link */}
        <a
          href={`/campaigns/${campaignId}/groups/${g.id}`}
          className="w-9 h-9 flex items-center justify-center rounded-gothic-sm text-gothic-on-surface-variant hover:text-gothic-primary hover:bg-gothic-surface-high transition-colors flex-shrink-0"
          aria-label={`Editar ${g.name}`}
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
          aria-label={`Eliminar ${g.name}`}
          className="w-9 h-9 flex items-center justify-center rounded-gothic-sm text-gothic-on-surface-variant hover:text-gothic-danger-bright hover:bg-gothic-danger/20 transition-colors flex-shrink-0 disabled:opacity-40"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Member chips */}
      {g.members.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {g.members.map((m) => (
            <span
              key={m.id}
              className={`text-xs font-medium px-2 py-0.5 rounded-gothic-sm ${TYPE_COLORS[m.template.type] ?? "bg-gothic-surface-high text-gothic-on-surface-variant"}`}
            >
              {m.template.name}{m.quantity > 1 ? ` ×${m.quantity}` : ""}
            </span>
          ))}
        </div>
      )}

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
