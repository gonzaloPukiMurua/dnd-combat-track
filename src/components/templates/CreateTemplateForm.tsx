"use client";

import { useActionState } from "react";
import { createTemplate, type TemplateFormState } from "@/lib/actions/templates";

const INITIAL_STATE: TemplateFormState = {};

export function CreateTemplateForm() {
  const [state, action, isPending] = useActionState(createTemplate, INITIAL_STATE);

  return (
    <form action={action} className="border rounded p-4 space-y-3 bg-white">
      <h2 className="font-semibold text-lg">New Template</h2>

      {/* Error message */}
      {state.error && (
        <p className="text-red-600 text-sm">{state.error}</p>
      )}

      {/* Success message */}
      {state.success && (
        <p className="text-green-600 text-sm">Template created!</p>
      )}

      {/* Name */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Name</label>
        <input
          name="name"
          placeholder="Goblin, Thora, Ancient Dragon…"
          required
          className="border rounded px-3 py-2 text-sm"
        />
      </div>

      {/* Type + HP side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Type</label>
          <select name="type" className="border rounded px-3 py-2 text-sm">
            <option value="PLAYER">Player</option>
            <option value="NPC">NPC</option>
            <option value="MONSTER">Monster</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Max HP</label>
          <input
            name="maxHp"
            type="number"
            min={1}
            placeholder="10"
            required
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* AC + Initiative side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Armor Class</label>
          <input
            name="baseAc"
            type="number"
            min={1}
            placeholder="12"
            required
            className="border rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Initiative bonus</label>
          <input
            name="initiativeBonus"
            type="number"
            placeholder="0"
            defaultValue={0}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-blue-600 text-white rounded py-2 text-sm font-medium disabled:opacity-50"
      >
        {isPending ? "Creating…" : "Create template"}
      </button>
    </form>
  );
}
