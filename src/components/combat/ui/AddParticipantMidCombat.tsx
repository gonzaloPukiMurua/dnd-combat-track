"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addParticipant } from "@/lib/actions/combat";

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
}: {
  combatId:  string;
  templates: Template[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (templates.length === 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full border-2 border-dashed border-slate-600 text-slate-500 rounded-2xl py-3 text-sm hover:border-slate-400 hover:text-slate-300 transition-colors"
      >
        + Add participant to combat
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          await addParticipant(fd);
          setOpen(false);
          router.refresh();
        });
      }}
      className="border-2 border-slate-600 rounded-2xl p-3 space-y-2 bg-slate-800"
    >
      <input type="hidden" name="combatId" value={combatId} />
      <div className="flex gap-2">
        <select
          name="templateId"
          className="flex-1 border-2 border-slate-600 rounded-xl px-2 h-10 text-sm bg-slate-700 text-white focus:outline-none focus:border-blue-500"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} · HP {t.maxHp} · AC {t.baseAc}
            </option>
          ))}
        </select>
        <input
          name="quantity"
          type="number"
          min={1}
          max={10}
          defaultValue={1}
          className="w-14 border-2 border-slate-600 rounded-xl px-2 h-10 text-center bg-slate-700 text-white focus:outline-none focus:border-blue-500"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 h-9 border-2 border-slate-600 text-slate-400 rounded-xl text-sm hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 h-9 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-500 disabled:opacity-40 transition-colors"
        >
          {isPending ? "Adding…" : "Add →"}
        </button>
      </div>
    </form>
  );
}