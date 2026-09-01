"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCharacterNotes } from "@/lib/actions/character";
import { MAX_NOTES_LENGTH } from "@/lib/constants/character";

export function CharacterNotesForm({
  templateId,
  initialNotes,
}: {
  templateId: string;
  initialNotes: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [savedNotes, setSavedNotes] = useState(initialNotes);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const tooLong = notes.length > MAX_NOTES_LENGTH;
  const dirty = notes !== savedNotes;

  function handleSave() {
    if (tooLong || !dirty) return;
    setError(null);
    setJustSaved(false);
    startTransition(async () => {
      const res = await updateCharacterNotes(templateId, notes);
      if (res.error) {
        setError(res.error);
      } else {
        setSavedNotes(notes);
        setJustSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p className="rounded-gothic-sm bg-gothic-danger px-4 py-2 text-center text-sm text-gothic-danger-bright">
          {error}
        </p>
      )}

      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setJustSaved(false);
        }}
        rows={6}
        placeholder="Trasfondo, objetivos, recordatorios de sesión…"
        className="w-full resize-y rounded-gothic-sm bg-gothic-surface-low px-4 py-3 font-gothic-body text-sm text-gothic-on-surface outline-none ring-1 ring-gothic-outline-variant shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] transition-all placeholder:text-gothic-outline focus:bg-gothic-surface focus:ring-gothic-primary"
      />

      <div className="flex items-center justify-between gap-3">
        <span
          className={`font-gothic-data text-xs ${
            tooLong ? "text-gothic-danger-bright" : "text-gothic-on-surface-variant"
          }`}
        >
          {notes.length}/{MAX_NOTES_LENGTH}
        </span>
        <div className="flex items-center gap-3">
          {justSaved && !dirty && <span className="text-xs text-gothic-success-text">Guardado</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || tooLong || !dirty}
            className="h-11 shrink-0 rounded-gothic-sm bg-gothic-primary px-5 font-gothic-body text-sm font-semibold text-gothic-on-primary shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] transition-all hover:bg-gothic-brass-bright active:scale-[0.98] disabled:opacity-50"
          >
            {isPending ? "Guardando…" : "Guardar notas"}
          </button>
        </div>
      </div>
    </div>
  );
}
