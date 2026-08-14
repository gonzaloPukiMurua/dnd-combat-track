"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { longRest, shortRest } from "@/lib/actions/templates";
import { hpBarColor } from "@/domain/combat/selectors";

type Template = {
  id:        string;
  name:      string;
  type:      string;
  maxHp:     number;
  currentHp: number | null;
};

export function RestPanel({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [shortHeal, setShortHeal] = useState("");
  // Only show PCs and NPCs — monsters always reset
  const restCandidates = templates.filter(
    (t) => t.type === "PLAYER" || t.type === "NPC"
  );

  if (restCandidates.length === 0) return null;

  // Only show panel if any character has less than full HP
  const anyWounded = restCandidates.some(
    (t) => t.currentHp !== null && t.currentHp < t.maxHp
  );
  if (!anyWounded) return null;

  function toggleAll() {
    if (selected.length === restCandidates.length) {
      setSelected([]);
    } else {
      setSelected(restCandidates.map((t) => t.id));
    }
  }

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function handleLongRest() {
    if (selected.length === 0) return;
    startTransition(async () => {
      const result = await longRest(selected);
      if (result.error) {
        setError(result.error);
      } else {
        setSelected([]);
        router.refresh();
      }
    });
  }

  return (
    <div className="bg-white border-2 border-amber-100 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-700">Rest</h2>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-slate-400 hover:text-slate-600 underline"
        >
          {selected.length === restCandidates.length ? "Deselect all" : "Select all"}
        </button>
      </div>

      <div className="space-y-2">
        {restCandidates.map((t) => {
          const hp = t.currentHp ?? t.maxHp;
          const pct = Math.round((hp / t.maxHp) * 100);
          const isWounded = hp < t.maxHp;

          return (
            <label
              key={t.id}
              className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors ${
                selected.includes(t.id) ? "bg-amber-50" : "hover:bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.includes(t.id)}
                onChange={() => toggle(t.id)}
                className="w-4 h-4 accent-amber-500"
              />
              <span className="flex-1 font-medium text-slate-700 text-sm truncate">
                {t.name}
              </span>

              <div className="w-16 bg-slate-200 rounded-full h-1.5 hidden sm:block">
                <div
                  className={`h-1.5 rounded-full ${hpBarColor(pct, true)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {isWounded ? (
                <span className="text-xs font-mono text-red-500">
                  {hp}/{t.maxHp}
                </span>
              ) : (
                <span className="text-xs font-mono text-green-500">
                  Full
                </span>
              )}
            </label>
          );
        })}
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleLongRest}
          disabled={selected.length === 0 || isPending}
          className="flex-1 h-11 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-40 transition-colors"
        >
          {isPending ? "Resting…" : `Long rest (${selected.length})`}
        </button>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          value={shortHeal}
          onChange={(e) => setShortHeal(e.target.value)}
          placeholder="HP to restore"
          className="flex-1 border-2 border-slate-200 rounded-xl px-3 h-11 text-sm focus:outline-none focus:border-amber-400"
        />
        <button
          type="button"
          disabled={selected.length === 0 || !shortHeal || isPending}
          onClick={() => {
            const n = parseInt(shortHeal);
            if (!n || n < 1) return;
            startTransition(async () => {
              const result = await shortRest(
                selected.map((id) => ({ id, healAmount: n }))
              );
              if (result.error) setError(result.error);
              else { setShortHeal(""); router.refresh(); }
            });
          }}
          className="h-11 px-4 border-2 border-amber-300 text-amber-700 rounded-xl text-sm font-semibold hover:bg-amber-50 disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          Short rest
        </button>
      </div>
      <p className="text-xs text-slate-400 text-center">
        Long rest restores selected characters to full HP on next combat start.
      </p>
    </div>
  );
}