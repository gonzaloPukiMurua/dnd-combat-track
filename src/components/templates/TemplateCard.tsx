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
  PLAYER:  "Player",
  NPC:     "NPC",
  MONSTER: "Monster",
};

const TYPE_COLORS: Record<CharacterType, string> = {
  PLAYER:  "bg-indigo-100 text-indigo-700",
  NPC:     "bg-emerald-100 text-emerald-700",
  MONSTER: "bg-red-100 text-red-700",
};

export function TemplateCard({ template: t }: { template: Template }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const bonus = t.initiativeBonus >= 0
    ? `+${t.initiativeBonus}`
    : `${t.initiativeBonus}`;

  function handleDelete() {
    if (!confirm(`Delete "${t.name}"? This cannot be undone.`)) return;
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
    <div className={`border-2 border-slate-100 rounded-2xl bg-white transition-opacity ${isPending ? "opacity-50" : ""}`}>

      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">

        {/* Type badge */}
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${TYPE_COLORS[t.type]}`}>
          {TYPE_LABELS[t.type]}
        </span>

        {/* Name */}
        <span className="font-semibold text-slate-800 flex-1 min-w-0 truncate">
          {t.name}
        </span>

        {/* Stats */}
        <div className="hidden sm:flex gap-3 text-sm text-slate-400 flex-shrink-0">
          <span>HP <strong className="text-slate-700 font-mono">{t.maxHp}</strong></span>
          <span>AC <strong className="text-slate-700 font-mono">{t.baseAc}</strong></span>
          <span>Init <strong className="text-slate-700 font-mono">{bonus}</strong></span>
        </div>

        {/* Compact stats on mobile */}
        <div className="flex sm:hidden gap-2 text-xs text-slate-400 flex-shrink-0">
          <span>{t.maxHp}hp</span>
          <span>{t.baseAc}ac</span>
          <span>{bonus}</span>
        </div>

        {/* Edit */}
        <a
          href={`/templates/${t.id}/edit`}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0"
          aria-label={`Edit ${t.name}`}
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
          aria-label={`Delete ${t.name}`}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 disabled:opacity-40"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
          </svg>
        </button>
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
