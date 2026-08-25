"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { joinCampaignWithCharacter, type JoinCharacterState } from "@/lib/actions/campaigns";

const INITIAL: JoinCharacterState = {};

type AvailableCharacter = {
  id: string;
  name: string;
  level: number;
  maxHp: number;
  currentHp: number | null;
  baseAc: number;
};

const inputClass =
  "w-full rounded-gothic-sm bg-gothic-surface-low px-4 py-3 font-gothic-body text-sm text-gothic-on-surface outline-none ring-1 ring-gothic-outline-variant shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] transition-all placeholder:text-gothic-outline focus:bg-gothic-surface focus:ring-gothic-primary";

export function CharacterPicker({
  campaignId,
  campaignName,
  characters,
}: {
  campaignId: string;
  campaignName: string;
  characters: AvailableCharacter[];
}) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(joinCampaignWithCharacter, INITIAL);
  const [clickedId, setClickedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (state.member) router.push(`/campaigns/${campaignId}`);
  }, [state.member, campaignId, router]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-gothic-headline text-gothic-headline-sm uppercase tracking-[0.1em] text-gothic-primary">
          Elegí tu personaje
        </h1>
        <p className="text-sm text-gothic-on-surface-variant">
          Te vas a unir a <strong className="text-gothic-on-surface">{campaignName}</strong>. Elegí con quién vas a
          jugar, o creá uno nuevo.
        </p>
      </div>

      {state.error && (
        <p className="rounded-gothic-sm bg-gothic-danger px-4 py-2 text-center text-sm text-gothic-danger-bright">
          {state.error}
        </p>
      )}

      {characters.length > 0 && (
        <div className="flex flex-col gap-3">
          {characters.map((character) => (
            <form key={character.id} action={action}>
              <input type="hidden" name="campaignId" value={campaignId} />
              <input type="hidden" name="characterTemplateId" value={character.id} />
              <button
                type="submit"
                disabled={isPending}
                onClick={() => setClickedId(character.id)}
                className="flex w-full items-center gap-4 rounded-gothic-sm bg-gothic-surface-low p-4 text-left ring-1 ring-gothic-outline-variant transition-colors hover:bg-gothic-surface-high hover:ring-gothic-outline disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-gothic-sm bg-gothic-surface-container ring-1 ring-gothic-outline-variant">
                  <span className="font-gothic-headline text-2xl text-gothic-primary">
                    {character.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-gothic-headline text-base text-gothic-on-surface">{character.name}</h2>
                    <span className="shrink-0 rounded-gothic-sm bg-gothic-surface-container px-2 py-0.5 font-gothic-data text-xs text-gothic-primary ring-1 ring-gothic-outline-variant">
                      NV {character.level}
                    </span>
                  </div>
                  <div className="flex gap-3 font-gothic-data text-xs text-gothic-on-surface-variant">
                    <span>PV {character.currentHp ?? character.maxHp}/{character.maxHp}</span>
                    <span>CA {character.baseAc}</span>
                  </div>
                </div>

                {isPending && clickedId === character.id && (
                  <span className="shrink-0 text-xs text-gothic-on-surface-variant">Uniéndote...</span>
                )}
              </button>
            </form>
          ))}
        </div>
      )}

      {characters.length > 0 && (
        <div className="relative flex items-center justify-center">
          <div className="absolute h-px w-full bg-gothic-outline-variant" />
          <span className="relative bg-gothic-background px-3 text-xs uppercase tracking-widest text-gothic-on-surface-variant">
            o
          </span>
        </div>
      )}

      {!showCreateForm && (
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-gothic-sm border-2 border-dashed border-gothic-outline-variant bg-gothic-surface p-4 text-center transition-colors hover:border-gothic-primary"
        >
          <span className="font-gothic-body text-sm font-semibold uppercase tracking-widest text-gothic-on-surface">
            Crear mi personaje
          </span>
        </button>
      )}

      {showCreateForm && (
        <form
          action={action}
          className="flex flex-col gap-4 rounded-gothic-sm bg-gothic-surface p-5 ring-1 ring-gothic-outline-variant"
        >
          <input type="hidden" name="campaignId" value={campaignId} />

          <div className="space-y-1">
            <label htmlFor="name" className="pl-1 text-xs font-medium uppercase tracking-widest text-gothic-on-surface-variant">
              Nombre
            </label>
            <input id="name" name="name" required placeholder="Ej: Thora Piedrahoz" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="maxHp" className="pl-1 text-xs font-medium uppercase tracking-widest text-gothic-on-surface-variant">
                PV máximos
              </label>
              <input id="maxHp" name="maxHp" type="number" min={1} required placeholder="10" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label htmlFor="baseAc" className="pl-1 text-xs font-medium uppercase tracking-widest text-gothic-on-surface-variant">
                Clase de armadura
              </label>
              <input id="baseAc" name="baseAc" type="number" min={1} required placeholder="12" className={inputClass} />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="h-12 flex-1 rounded-gothic-sm font-gothic-body text-sm font-semibold text-gothic-on-surface-variant ring-1 ring-gothic-outline-variant transition-colors hover:bg-gothic-surface-high"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              onClick={() => setClickedId("new")}
              className="h-12 flex-1 rounded-gothic-sm bg-gothic-primary font-gothic-body text-sm font-semibold text-gothic-on-primary shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] transition-all hover:bg-gothic-brass-bright active:scale-[0.98] disabled:opacity-50"
            >
              {isPending && clickedId === "new" ? "Creando..." : "Crear y unirme"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
