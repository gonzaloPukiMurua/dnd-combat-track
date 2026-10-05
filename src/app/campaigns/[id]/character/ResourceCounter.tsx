"use client";

import { useState, useTransition } from "react";
import { setResourceUsed } from "@/lib/actions/resources";

// Contador de un recurso consumible (P2). El dueño gasta o recupera; la actualización
// es optimista y se revierte si el servidor la rechaza.
export function ResourceCounter({
  resourceId,
  name,
  level,
  used,
  max,
  recharge,
}: {
  resourceId: string;
  name: string;
  level: number | null;
  used: number;
  max: number;
  recharge: "SHORT" | "LONG";
}) {
  const [value, setValue] = useState(used);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function change(next: number) {
    const previous = value;
    setValue(next);
    setError(null);
    startTransition(async () => {
      const result = await setResourceUsed(resourceId, next);
      if (!result.ok) {
        setValue(previous);
        setError(result.error);
      }
    });
  }

  const available = max - value;

  return (
    <div className="flex flex-col gap-2 rounded-gothic-sm bg-gothic-surface-high p-3 ring-1 ring-gothic-outline-variant">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-sm text-gothic-on-surface">{name}</span>
          <span className="text-[10px] uppercase tracking-widest text-gothic-on-surface-variant">
            {level !== null ? `Espacio de nivel ${level}` : "Recurso de clase"} · recarga {recharge === "SHORT" ? "corta" : "larga"}
          </span>
        </div>
        <span className="font-gothic-data text-sm text-gothic-on-surface">
          {available}/{max}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => change(value - 1)}
          disabled={value <= 0 || isPending}
          className="h-9 flex-1 rounded-gothic-sm ring-1 ring-gothic-outline-variant text-sm text-gothic-on-surface-variant hover:bg-gothic-surface disabled:opacity-40"
        >
          Recuperar
        </button>
        <button
          type="button"
          onClick={() => change(value + 1)}
          disabled={value >= max || isPending}
          className="h-9 flex-1 rounded-gothic-sm bg-gothic-wine text-sm text-gothic-on-surface hover:bg-gothic-danger disabled:opacity-40"
        >
          Gastar
        </button>
      </div>
      {error && <p className="text-xs text-gothic-danger-bright">{error}</p>}
    </div>
  );
}
