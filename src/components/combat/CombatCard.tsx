"use client";

// This needs to be a client component so we can handle
// the delete confirmation and error feedback inline.
// Data fetching moves to a separate server component below.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCombat } from "@/lib/actions/templates";

type Combat = {
  id:           string;
  name:         string;
  status:       "SETUP" | "ACTIVE" | "FINISHED";
  round:        number;
  participants: { id: string }[];
};

export function CombatCard({ combat: c }: { combat: Combat }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirm(`Delete "${c.name}"? This will remove all participants and logs.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCombat(c.id);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  const href = c.status === "SETUP"
    ? `/combat/${c.id}/setup`
    : `/combat/${c.id}`;

  const badge = {
    ACTIVE:   { label: "Active",   cls: "bg-green-100 text-green-700 border-green-200" },
    SETUP:    { label: "Setup",    cls: "bg-amber-100 text-amber-700 border-amber-200" },
    FINISHED: { label: "Finished", cls: "bg-slate-100 text-slate-500 border-slate-200" },
  }[c.status];

  return (
    <div className={`border-2 border-slate-100 rounded-2xl bg-white transition-opacity ${isPending ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-3 px-4 py-3">

        {/* Link to combat */}
        <a href={href} className="flex-1 min-w-0 group">
          <p className="font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
            {c.name}
          </p>
          <p className="text-sm text-slate-400">
            {c.participants.length} participant{c.participants.length !== 1 ? "s" : ""}
            {c.status === "ACTIVE" && ` · Round ${c.round}`}
          </p>
        </a>

        {/* Status badge */}
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${badge.cls}`}>
          {badge.label}
        </span>

        {/* Delete — only on SETUP and FINISHED */}
        {c.status !== "ACTIVE" && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            aria-label={`Delete ${c.name}`}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 disabled:opacity-40"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

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
