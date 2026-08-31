"use client";

import { useActionState } from "react";
import { updateProfile, type UpdateProfileState } from "@/lib/actions/profile";

const INITIAL: UpdateProfileState = {};

// Same shared look as campaigns/new and the campaign edit form.
const inputClass =
  "w-full rounded-gothic-sm bg-gothic-surface-low px-4 py-3 font-gothic-body text-sm text-gothic-on-surface outline-none ring-1 ring-gothic-outline-variant shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] transition-all placeholder:text-gothic-outline focus:bg-gothic-surface focus:ring-gothic-primary";

export function EditNameForm({ currentName }: { currentName: string }) {
  const [state, action, isPending] = useActionState(updateProfile, INITIAL);

  return (
    <form action={action} className="flex flex-col gap-2">
      {state.error && (
        <p className="rounded-gothic-sm bg-gothic-danger px-4 py-2 text-center text-sm text-gothic-danger-bright">
          {state.error}
        </p>
      )}

      <label htmlFor="name" className="pl-1 text-xs font-medium uppercase tracking-widest text-gothic-on-surface-variant">
        Nombre
      </label>

      <div className="flex gap-2">
        <input
          id="name"
          name="name"
          required
          defaultValue={currentName}
          placeholder="Tu nombre"
          className={`${inputClass} flex-1`}
        />
        <button
          type="submit"
          disabled={isPending}
          className="h-12 shrink-0 rounded-gothic-sm bg-gothic-primary px-5 font-gothic-body text-sm font-semibold text-gothic-on-primary shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] transition-all hover:bg-gothic-brass-bright active:scale-[0.98] disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}
