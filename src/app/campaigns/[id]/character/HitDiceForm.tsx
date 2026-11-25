"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { spendHitDice } from "@/lib/actions/character";

// A3 / H16 — en un descanso corto el jugador gasta dados de golpe: tira los dados
// físicos y escribe el total, ya con su mod. de CON (D-14). La app suma los PG
// sin pasar el máximo y descuenta los dados.

const inputClass =
  "w-full rounded-gothic-sm bg-gothic-surface-low px-3 py-2 font-mono text-sm text-gothic-on-surface outline-none ring-1 ring-gothic-outline-variant shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] transition-all focus:bg-gothic-surface focus:ring-gothic-primary";
const labelClass = "text-[10px] uppercase tracking-widest text-gothic-on-surface-variant";

export function HitDiceForm({
  templateId,
  die,
  left,
  conModifier,
}: {
  templateId: string;
  die: number;
  left: number;
  conModifier: number;
}) {
  const router = useRouter();
  const [count, setCount] = useState("1");
  const [total, setTotal] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const n = Number(count);
  const mod = conModifier >= 0 ? `+${conModifier}` : `${conModifier}`;

  function submit() {
    setMsg(null);
    startTransition(async () => {
      const res = await spendHitDice(templateId, n, Number(total));
      if (res.error) {
        setMsg({ ok: false, text: res.error });
      } else {
        setTotal("");
        setCount("1");
        setMsg({ ok: true, text: `Listo: quedaste con ${res.currentHp} PV` });
        router.refresh();
      }
    });
  }

  if (left === 0) {
    return <p className="text-sm text-gothic-on-surface-variant">No te quedan dados de golpe. Se recuperan con un descanso largo.</p>;
  }

  return (
    <div className="flex flex-col gap-3 rounded-gothic-sm bg-gothic-surface p-4 ring-1 ring-gothic-outline-variant">
      <p className="text-xs text-gothic-on-surface-variant">
        Tirá {Number.isInteger(n) && n > 0 ? n : "los"}d{die}, sumá {mod} por cada dado (tu mod. de CON) y escribí el total.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Dados a gastar (quedan {left})</span>
          <input className={inputClass} type="number" min={1} max={left} value={count} onChange={(e) => setCount(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Total de la tirada</span>
          <input className={inputClass} type="number" min={0} value={total} onChange={(e) => setTotal(e.target.value)} />
        </label>
      </div>
      <div className="flex items-center justify-end gap-3">
        {msg && <span className={`text-xs ${msg.ok ? "text-gothic-success-text" : "text-gothic-danger-bright"}`}>{msg.text}</span>}
        <button
          type="button"
          onClick={submit}
          disabled={isPending || total === "" || !Number.isInteger(n) || n < 1 || n > left}
          className="h-11 shrink-0 rounded-gothic-sm bg-gothic-primary px-5 font-gothic-body text-sm font-semibold text-gothic-on-primary hover:bg-gothic-brass-bright disabled:opacity-50"
        >
          {isPending ? "Gastando…" : "Gastar dados"}
        </button>
      </div>
    </div>
  );
}
