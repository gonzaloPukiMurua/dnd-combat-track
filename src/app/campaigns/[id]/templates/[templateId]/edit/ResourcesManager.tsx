"use client";

import { useState, useTransition } from "react";
import { createResource, deleteResource, updateResourceMax } from "@/lib/actions/resources";

// P2 — el DM crea, ajusta el máximo y borra los recursos consumibles del personaje.
// El uso (gastar/recuperar) lo hace el dueño desde su ficha.

type Row = {
  id: string;
  name: string;
  level: number | null;
  max: number;
  used: number;
  recharge: "SHORT" | "LONG";
};

const labelClass = "text-xs font-medium uppercase tracking-widest text-gothic-on-surface-variant";
const inputClass =
  "w-full rounded-gothic-sm bg-gothic-surface-low px-3 py-2 text-sm text-gothic-on-surface ring-1 ring-gothic-outline-variant outline-none focus:ring-gothic-primary";

function ResourceRow({ row }: { row: Row }) {
  const [max, setMax] = useState(String(row.max));
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function saveMax() {
    setMsg(null);
    startTransition(async () => {
      const r = await updateResourceMax(row.id, Number(max));
      if (!r.ok) setMsg(r.error);
    });
  }

  function remove() {
    setMsg(null);
    startTransition(async () => {
      const r = await deleteResource(row.id);
      if (!r.ok) setMsg(r.error);
    });
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-gothic-sm bg-gothic-surface p-3 ring-1 ring-gothic-outline-variant">
      <div className="flex items-center justify-between gap-2 text-sm text-gothic-on-surface">
        <span>
          {row.name}
          <span className="ml-2 text-xs text-gothic-on-surface-variant">
            {row.level !== null ? `nivel ${row.level}` : "clase"} · recarga {row.recharge === "SHORT" ? "corta" : "larga"}
          </span>
        </span>
        <span className="text-xs text-gothic-on-surface-variant">usados {row.used}</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gothic-on-surface-variant">Máximo</label>
        <input
          type="number"
          min={1}
          max={20}
          value={max}
          onChange={(e) => setMax(e.target.value)}
          className={`${inputClass} h-9 w-20 font-mono`}
        />
        <button type="button" onClick={saveMax} disabled={isPending} className="h-9 px-3 rounded-gothic-sm ring-1 ring-gothic-outline-variant text-xs text-gothic-on-surface-variant hover:bg-gothic-surface-high disabled:opacity-40">
          Guardar máximo
        </button>
        <button type="button" onClick={remove} disabled={isPending} className="h-9 px-3 rounded-gothic-sm ring-1 ring-gothic-outline-variant text-xs text-gothic-on-surface-variant hover:text-gothic-danger-bright disabled:opacity-40">
          Borrar
        </button>
      </div>
      {msg && <p className="text-xs text-gothic-danger-bright">{msg}</p>}
    </div>
  );
}

export function ResourcesManager({ templateId, resources }: { templateId: string; resources: Row[] }) {
  const [name, setName] = useState("");
  const [max, setMax] = useState("1");
  const [recharge, setRecharge] = useState<"SHORT" | "LONG">("LONG");
  const [level, setLevel] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function add() {
    setMsg(null);
    startTransition(async () => {
      const r = await createResource(templateId, {
        name,
        max: Number(max),
        recharge,
        level: level === "" ? null : Number(level),
      });
      if (r.ok) {
        setName(""); setMax("1"); setLevel("");
        setMsg({ ok: true, text: "Recurso agregado" });
      } else {
        setMsg({ ok: false, text: r.error });
      }
    });
  }

  return (
    <section className="rounded-gothic-md bg-gothic-surface-low ring-1 ring-gothic-outline-variant p-5 space-y-4">
      <div className="space-y-1">
        <h2 className="font-gothic-headline text-lg text-gothic-primary">Recursos</h2>
        <p className="text-xs text-gothic-on-surface-variant">Espacios de conjuro y recursos de clase. El dueño los gasta desde su ficha.</p>
      </div>

      {resources.length === 0 ? (
        <p className="text-sm text-gothic-on-surface-variant">Todavía no hay recursos cargados.</p>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => <ResourceRow key={r.id} row={r} />)}
        </div>
      )}

      <div className="space-y-3 border-t border-gothic-outline-variant pt-4">
        <p className={labelClass}>Agregar recurso</p>
        <div className="grid grid-cols-2 gap-2">
          <input className={inputClass} placeholder="Nombre (ej. Furia)" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={`${inputClass} font-mono`} type="number" min={1} max={20} placeholder="Máximo" value={max} onChange={(e) => setMax(e.target.value)} />
          <select className={inputClass} value={recharge} onChange={(e) => setRecharge(e.target.value as "SHORT" | "LONG")}>
            <option value="LONG">Recarga larga</option>
            <option value="SHORT">Recarga corta</option>
          </select>
          <input className={`${inputClass} font-mono`} type="number" min={1} max={9} placeholder="Nivel (solo conjuros)" value={level} onChange={(e) => setLevel(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={add} disabled={isPending || name.trim() === ""} className="h-11 px-5 rounded-gothic-sm bg-gothic-primary font-gothic-body text-sm font-semibold text-gothic-on-primary hover:bg-gothic-brass-bright disabled:opacity-40">
            {isPending ? "Agregando…" : "Agregar recurso"}
          </button>
          {msg && <span className={`text-xs ${msg.ok ? "text-gothic-success-text" : "text-gothic-danger-bright"}`}>{msg.text}</span>}
        </div>
      </div>
    </section>
  );
}
