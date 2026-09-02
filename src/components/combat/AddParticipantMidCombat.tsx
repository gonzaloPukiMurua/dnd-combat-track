"use client";

import { useState, useTransition } from "react";
import { addParticipant, setParticipantInitiative } from "@/lib/actions/combat";

type Template = {
  id:    string;
  name:  string;
  type:  string;
  maxHp: number;
  baseAc: number;
};

export function AddParticipantMidCombat({
  combatId,
  templates,
  isActive,
}: {
  combatId:  string;
  templates: Template[];
  // S2-9 — true once the combat is ACTIVE. New participants are created at
  // initiative 0, so while ACTIVE the DM must also give them an initiative
  // here; startCombat handles the SETUP case on its own.
  isActive:  boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (templates.length === 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full ring-1 ring-dashed ring-gothic-outline-variant text-gothic-on-surface-variant rounded-gothic-md py-3 text-sm hover:ring-gothic-outline hover:text-gothic-on-surface transition-colors"
      >
        + Agregar participante al combate
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const rawInitiative = fd.get("initiative")?.toString().trim();
        startTransition(async () => {
          const newIds = await addParticipant(fd);
          // While ACTIVE, slot every new participant into the turn order by
          // the initiative the DM typed — the server recomputes turnOrder for
          // the whole combat each call.
          if (isActive && rawInitiative) {
            const initiative = Number(rawInitiative);
            if (Number.isInteger(initiative)) {
              for (const id of newIds) {
                await setParticipantInitiative(id, initiative);
              }
            }
          }
          setOpen(false);
          // Full reload, not router.refresh(): the Zustand store hydrates once
          // per combat id and won't pick up a new participant or the reshuffled
          // turnOrder otherwise.
          window.location.reload();
        });
      }}
      className="ring-1 ring-gothic-outline-variant rounded-gothic-md p-3 space-y-2 bg-gothic-surface-low"
    >
      <input type="hidden" name="combatId" value={combatId} />
      <div className="flex gap-2">
        <select
          name="templateId"
          className="flex-1 rounded-gothic-sm px-2 h-10 text-sm bg-gothic-surface-high text-gothic-on-surface ring-1 ring-gothic-outline-variant focus:outline-none focus:ring-gothic-primary"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} · HP {t.maxHp} · CA {t.baseAc}
            </option>
          ))}
        </select>
        <input
          name="quantity"
          type="number"
          min={1}
          max={10}
          defaultValue={1}
          className="w-14 rounded-gothic-sm px-2 h-10 text-center bg-gothic-surface-high text-gothic-on-surface ring-1 ring-gothic-outline-variant focus:outline-none focus:ring-gothic-primary"
        />
      </div>

      {isActive && (
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-xs text-gothic-on-surface-variant">
            Iniciativa
            <input
              name="initiative"
              type="number"
              step={1}
              required
              placeholder="—"
              aria-label="Iniciativa"
              className="w-16 rounded-gothic-sm px-2 h-9 text-center bg-gothic-surface-high text-gothic-on-surface ring-1 ring-gothic-outline-variant focus:outline-none focus:ring-gothic-primary"
            />
          </label>
          <p className="text-[11px] leading-tight text-gothic-on-surface-variant">
            El combate ya empezó: esta iniciativa lo ubica en el orden de turnos (se
            recalcula el orden de todos).
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 h-9 ring-1 ring-gothic-outline-variant text-gothic-on-surface-variant rounded-gothic-sm text-sm hover:bg-gothic-surface-high transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 h-9 bg-gothic-primary text-gothic-on-primary rounded-gothic-sm text-sm font-semibold hover:bg-gothic-brass-bright disabled:opacity-40 transition-colors"
        >
          {isPending ? "Agregando…" : "Agregar →"}
        </button>
      </div>
    </form>
  );
}
