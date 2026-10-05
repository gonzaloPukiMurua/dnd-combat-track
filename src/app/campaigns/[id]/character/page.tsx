import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  buildSheet,
  type Ability,
  type SkillName,
} from "@/domain/character/rules";
import { CharacterNotesForm } from "./CharacterNotesForm";
import { ResourceCounter } from "./ResourceCounter";

// Formato de texto para bonos (+3 / −1). Solo presentación: el cálculo está en el dominio.
function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

// S2-6 — la ficha del jugador fuera de combate. Los números se calculan en el
// dominio (buildSheet); esta página solo los muestra. El jugador solo edita sus
// notas y el uso de sus recursos; competencias y stats los administra el DM.

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-gothic-sm bg-gothic-surface-high p-3 ring-1 ring-gothic-outline-variant">
      <span className="text-[10px] uppercase tracking-widest text-gothic-on-surface-variant">{label}</span>
      <span className="font-gothic-headline text-lg text-gothic-on-surface">{value}</span>
      {sub && <span className="font-gothic-data text-xs text-gothic-on-surface-variant">{sub}</span>}
    </div>
  );
}

const ABILITY_SHORT: Record<Ability, string> = {
  str: "FUE", dex: "DES", con: "CON", int: "INT", wis: "SAB", cha: "CAR",
};
const ABILITY_NAME: Record<Ability, string> = {
  str: "Fuerza", dex: "Destreza", con: "Constitución", int: "Inteligencia", wis: "Sabiduría", cha: "Carisma",
};

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

  // "Mi personaje": la plantilla de esta campaña cuyo ownerId es el viewer.
  // El DM normalmente no tiene ninguna → estado vacío.
  const character = await prisma.characterTemplate.findFirst({
    where: { campaignId, ownerId: userId },
    include: { resources: { orderBy: [{ recharge: "asc" }, { name: "asc" }] } },
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

  const sheet = buildSheet({
    level: character.level,
    scores: {
      str: character.str, dex: character.dex, con: character.con,
      int: character.int, wis: character.wis, cha: character.cha,
    },
    saveProficiencies: character.saveProficiencies as Ability[],
    skillProficiencies: character.skillProficiencies as SkillName[],
    skillExpertise: character.skillExpertise as SkillName[],
    spellcastingAbility: (character.spellcastingAbility as Ability | null) ?? null,
    exhaustionLevel: character.exhaustionLevel,
  });

  const hp = `${character.currentHp ?? character.maxHp}/${character.maxHp}`;
  const ex = sheet.exhaustion;

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

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="PV" value={hp} />
        <StatBox label="CA" value={String(character.baseAc)} />
        <StatBox label="Iniciativa" value={signed(character.initiativeBonus)} />
        <StatBox label="Competencia" value={signed(sheet.proficiencyBonus)} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs uppercase tracking-widest text-gothic-on-surface-variant">Características</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {sheet.abilities.map((a) => (
            <StatBox key={a.key} label={ABILITY_SHORT[a.key]} value={String(a.score)} sub={signed(a.modifier)} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs uppercase tracking-widest text-gothic-on-surface-variant">Salvaciones</h2>
        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {sheet.saves.map((s) => (
            <li key={s.key} className="flex items-center justify-between rounded-gothic-sm bg-gothic-surface px-3 py-2 text-sm ring-1 ring-gothic-outline-variant">
              <span className="text-gothic-on-surface">
                {s.proficient && <span className="mr-1.5 text-gothic-primary">●</span>}
                {ABILITY_NAME[s.key]}
              </span>
              <span className="font-gothic-data text-gothic-on-surface">{signed(s.bonus)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs uppercase tracking-widest text-gothic-on-surface-variant">Habilidades</h2>
        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {sheet.skills.map((s) => (
            <li key={s.name} className="flex items-center justify-between rounded-gothic-sm bg-gothic-surface px-3 py-2 text-sm ring-1 ring-gothic-outline-variant">
              <span className="text-gothic-on-surface">
                {s.expertise ? <span className="mr-1.5 text-gothic-primary">◆</span> : s.proficient ? <span className="mr-1.5 text-gothic-primary">●</span> : null}
                {s.name}
                <span className="ml-1.5 text-xs text-gothic-on-surface-variant">({ABILITY_SHORT[s.ability]})</span>
              </span>
              <span className="font-gothic-data text-gothic-on-surface">{signed(s.bonus)}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-gothic-on-surface-variant/80">● competencia · ◆ pericia</p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatBox label="Percepción pasiva" value={String(sheet.passivePerception)} />
        {sheet.spell && <StatBox label="CD de conjuro" value={String(sheet.spell.saveDc)} />}
        {sheet.spell && <StatBox label="Ataque de conjuro" value={signed(sheet.spell.attackBonus)} />}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs uppercase tracking-widest text-gothic-on-surface-variant">Agotamiento</h2>
        <div className="flex min-h-12 w-full items-center rounded-gothic-sm bg-gothic-surface px-4 py-2 text-sm text-gothic-on-surface ring-1 ring-gothic-outline-variant">
          {ex.dead
            ? "Nivel 6: muerte"
            : character.exhaustionLevel === 0
              ? "Sin agotamiento"
              : `Nivel ${character.exhaustionLevel}: −${ex.d20Penalty} a pruebas de d20 · −${ex.speedPenaltyFt} pies de velocidad`}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs uppercase tracking-widest text-gothic-on-surface-variant">Recursos</h2>
        {character.resources.length === 0 ? (
          <p className="text-sm text-gothic-on-surface-variant">Sin espacios ni recursos cargados. Los carga el DM.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {character.resources.map((r) => (
              <ResourceCounter
                key={r.id}
                resourceId={r.id}
                name={r.name}
                level={r.level}
                used={r.used}
                max={r.max}
                recharge={r.recharge}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs uppercase tracking-widest text-gothic-on-surface-variant">Notas</h2>
        <CharacterNotesForm templateId={character.id} initialNotes={character.notes ?? ""} />
      </section>

      <p className="text-xs text-gothic-on-surface-variant/80">
        Los stats y las competencias los administra el DM. Tus notas y el uso de tus recursos son tuyos para editar.
      </p>
    </div>
  );
}
