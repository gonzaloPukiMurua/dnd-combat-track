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
  PLAYER:  "bg-indigo-100 text-indigo-700",
  NPC:     "bg-emerald-100 text-emerald-700",
  MONSTER: "bg-red-100 text-red-700",
};

export function GroupCard({ group: g }: { group: Group }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirm(`Delete "${g.name}"? This cannot be undone.`)) return;
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
    <div className={`border-2 border-slate-100 rounded-2xl bg-white transition-opacity ${isPending ? "opacity-50" : ""}`}>

      {/* Header row */}
      <div className="flex items-start gap-3 px-4 py-3">

        {/* Link to detail page */}
        <a href={`/groups/${g.id}`} className="flex-1 min-w-0 group">
          <p className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
            {g.name}
          </p>
          <p className="text-sm text-slate-400 mt-0.5">
            {g.members.length === 0
              ? "No members yet"
              : `${totalParticipants} participant${totalParticipants !== 1 ? "s" : ""} · ${g.members.length} template${g.members.length !== 1 ? "s" : ""}`}
          </p>
          {g.description && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{g.description}</p>
          )}
        </a>

        {/* Edit link */}
        <a
          href={`/groups/${g.id}`}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0"
          aria-label={`Edit ${g.name}`}
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
          aria-label={`Delete ${g.name}`}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 disabled:opacity-40"
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
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[m.template.type] ?? "bg-slate-100 text-slate-600"}`}
            >
              {m.template.name}{m.quantity > 1 ? ` ×${m.quantity}` : ""}
            </span>
          ))}
        </div>
      )}

      {/* Inline error */}
      {error && (
        <div className="px-4 pb-3">
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
