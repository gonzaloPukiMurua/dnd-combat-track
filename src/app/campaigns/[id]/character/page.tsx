import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CharacterNotesForm } from "./CharacterNotesForm";

// S2-6 — the player's own character sheet outside of combat. Read-only view
// of the real stats (the numeric ones stay DM-only via
// /campaigns/[id]/templates/[templateId]/edit — D13); the only thing the
// player edits here is the free-text `notes` field.
//
// This route is a sibling of templates/ and groups/, so it doesn't inherit
// their requireCampaignDm layout — the membership guard lives here. Same
// masked-404 pattern as the hub and /spectate for non-members.

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-gothic-sm bg-gothic-surface-high p-3 ring-1 ring-gothic-outline-variant">
      <span className="text-[10px] uppercase tracking-widest text-gothic-on-surface-variant">{label}</span>
      <span className="font-gothic-headline text-lg text-gothic-on-surface">{value}</span>
      {sub && <span className="font-gothic-data text-xs text-gothic-on-surface-variant">{sub}</span>}
    </div>
  );
}

const ABILITIES = [
  ["str", "FUE"],
  ["dex", "DES"],
  ["con", "CON"],
  ["int", "INT"],
  ["wis", "SAB"],
  ["cha", "CAR"],
] as const;

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

function abilityModifier(score: number): string {
  return signed(Math.floor((score - 10) / 2));
}

export default async function CharacterSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: campaignId } = await params;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) notFound();

  const membership = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
  });
  if (!membership) notFound();

  // "My character" resolves the same way the hub's ownCharacter does:
  // the campaign's CharacterTemplate whose ownerId is the viewer. A DM
  // normally owns none → they get the friendly empty state below.
  const character = await prisma.characterTemplate.findFirst({
    where: { campaignId, ownerId: userId },
  });

  const backLink = (
    <Link
      href={`/campaigns/${campaignId}`}
      className="text-sm text-gothic-on-surface-variant transition-colors hover:text-gothic-primary"
    >
      ← Volver a la campaña
    </Link>
  );

  if (!character) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <p className="rounded-gothic-sm bg-gothic-surface-low p-4 text-sm text-gothic-on-surface-variant ring-1 ring-gothic-outline-variant">
          No tenés un personaje asignado en esta campaña.
        </p>
      </div>
    );
  }

  const hp = `${character.currentHp ?? character.maxHp}/${character.maxHp}`;

  return (
    <div className="flex flex-col gap-6">
      {backLink}

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-gothic-on-surface-variant">Mi personaje</span>
          <h1 className="font-gothic-headline text-gothic-headline-sm text-gothic-primary">{character.name}</h1>
        </div>
        <span className="mt-1 shrink-0 rounded-gothic-sm bg-gothic-surface-container px-2 py-0.5 font-gothic-data text-xs text-gothic-primary ring-1 ring-gothic-outline-variant">
          NV {character.level}
        </span>
      </div>

      {/* Core combat stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="PV" value={hp} />
        <StatBox label="CA" value={String(character.baseAc)} />
        <StatBox label="Iniciativa" value={signed(character.initiativeBonus)} />
        <StatBox label="Competencia" value={signed(character.proficiencyBonus)} />
      </section>

      {/* Ability scores */}
      <section className="flex flex-col gap-2">
        <h2 className="text-xs uppercase tracking-widest text-gothic-on-surface-variant">Características</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {ABILITIES.map(([key, label]) => (
            <StatBox
              key={key}
              label={label}
              value={String(character[key])}
              sub={abilityModifier(character[key])}
            />
          ))}
        </div>
      </section>

      {/* Exhaustion — real field, always shown */}
      <section className="flex flex-col gap-2">
        <h2 className="text-xs uppercase tracking-widest text-gothic-on-surface-variant">Agotamiento</h2>
        <div className="flex h-12 w-full items-center rounded-gothic-sm bg-gothic-surface px-4 text-sm text-gothic-on-surface ring-1 ring-gothic-outline-variant">
          Nivel {character.exhaustionLevel}
        </div>
      </section>

      {/* Notes — the only editable part of this page */}
      <section className="flex flex-col gap-2">
        <h2 className="text-xs uppercase tracking-widest text-gothic-on-surface-variant">Notas</h2>
        <CharacterNotesForm templateId={character.id} initialNotes={character.notes ?? ""} />
      </section>

      <p className="text-xs text-gothic-on-surface-variant/80">
        Los stats los administra el DM. Solo las notas son tuyas para editar.
      </p>
    </div>
  );
}
