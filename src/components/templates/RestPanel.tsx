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
    <div className="rounded-gothic-md bg-gothic-surface-low ring-1 ring-gothic-outline-variant p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-gothic-headline text-lg text-gothic-primary">Descanso</h2>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-gothic-on-surface-variant hover:text-gothic-primary underline decoration-gothic-outline-variant underline-offset-4"
        >
          {selected.length === restCandidates.length ? "Deseleccionar todos" : "Seleccionar todos"}
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
              className={`flex items-center gap-3 p-2 rounded-gothic-sm cursor-pointer transition-colors ${
                selected.includes(t.id) ? "bg-gothic-surface-high" : "hover:bg-gothic-surface-high/60"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.includes(t.id)}
                onChange={() => toggle(t.id)}
                className="w-4 h-4 accent-gothic-primary"
              />
              <span className="flex-1 font-medium text-gothic-on-surface text-sm truncate">
                {t.name}
              </span>

              <div className="w-16 bg-gothic-background rounded-full h-1.5 hidden sm:block ring-1 ring-gothic-outline-variant">
                <div
                  className={`h-1.5 rounded-full ${hpBarColor(pct, true)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {isWounded ? (
                <span className="text-xs font-mono text-gothic-danger-bright">
                  {hp}/{t.maxHp}
                </span>
              ) : (
                <span className="text-xs font-mono text-gothic-success-text">
                  Máx.
                </span>
              )}
            </label>
          );
        })}
      </div>

      {error && (
        <p className="text-xs rounded-gothic-sm bg-gothic-danger px-3 py-2 text-gothic-danger-bright">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleLongRest}
          disabled={selected.length === 0 || isPending}
          className="flex-1 h-11 rounded-gothic-sm bg-gothic-primary text-gothic-on-primary text-sm font-semibold shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] hover:bg-gothic-brass-bright disabled:opacity-40 transition-all"
        >
          {isPending ? "Descansando…" : `Descanso largo (${selected.length})`}
        </button>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          value={shortHeal}
          onChange={(e) => setShortHeal(e.target.value)}
          placeholder="PV a restaurar"
          className="flex-1 rounded-gothic-sm bg-gothic-surface px-3 h-11 text-sm font-mono text-gothic-on-surface outline-none ring-1 ring-gothic-outline-variant placeholder:text-gothic-outline placeholder:font-gothic-body transition-all focus:ring-gothic-primary"
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
          className="h-11 px-4 rounded-gothic-sm ring-1 ring-gothic-outline-variant text-gothic-on-surface-variant text-sm font-semibold hover:bg-gothic-surface-high disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          Descanso corto
        </button>
      </div>
      <p className="text-xs text-gothic-on-surface-variant text-center">
        El descanso largo restaura a los personajes seleccionados a PV máximos al iniciar el próximo combate.
      </p>
    </div>
  );
}
