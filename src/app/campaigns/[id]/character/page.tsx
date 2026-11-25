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
import { rechargeLabel } from "@/domain/character/resources";
import { CLASS_LABELS, HIT_DIE } from "@/domain/character/progression";
import { PHYSICAL_FIELDS } from "@/domain/character/details";
import { CharacterDetailsForm } from "./CharacterDetailsForm";

const ECONOMY_LABEL: Record<string, string> = { ACTION: "Acción", BONUS_ACTION: "Acción bonus", REACTION: "Reacción" };

// Formato de texto para bonos (+3 / −1). Solo presentación: el cálculo está en el dominio.
function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

// S2-6 — la ficha del jugador fuera de combate. Los números se calculan en el
// dominio (buildSheet); esta página solo los muestra. A2 / D-17: el jugador edita
// sus datos físicos, historia breve, plata, notas y el uso de sus recursos; lo
// mecánico (clase, armadura, rasgos, competencias, stats) lo administra el DM.

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
    include: {
      resources: { orderBy: [{ fullRecoveryOnShortRest: "desc" }, { shortRestRecoveryAmount: "desc" }, { name: "asc" }] },
      traits:    { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
      actions:   { orderBy: { order: "asc" } },
    },
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
  const classLine = [
    character.characterClass ? CLASS_LABELS[character.characterClass] : null,
    character.subclass,
  ].filter(Boolean).join(" · ");
  // Dados de golpe: total = nivel, del tipo de la clase (fase-a-plan.md §3).
  const hitDiceLeft = Math.max(0, character.level - character.hitDiceUsed);

  return (
    <div className="flex flex-col gap-6">
      {backLink}

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-gothic-on-surface-variant">Mi personaje</span>
          <h1 className="font-gothic-headline text-gothic-headline-sm text-gothic-primary">{character.name}</h1>
          {classLine && <span className="text-sm text-gothic-on-surface-variant">{classLine}</span>}
        </div>
        <span className="mt-1 shrink-0 rounded-gothic-sm bg-gothic-surface-container px-2 py-0.5 font-gothic-data text-xs text-gothic-primary ring-1 ring-gothic-outline-variant">
          NV {character.level}
        </span>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatBox label="PV" value={hp} />
        <StatBox label="PV temporales" value={String(character.tempHp)} />
        <StatBox label="CA" value={String(character.baseAc)} sub={character.armorName ?? undefined} />
        <StatBox label="Iniciativa" value={signed(character.initiativeBonus)} />
        <StatBox label="Competencia" value={signed(sheet.proficiencyBonus)} />
        {character.characterClass ? (
          <StatBox
            label="Dados de golpe"
            value={`${hitDiceLeft}/${character.level}`}
            sub={`d${HIT_DIE[character.characterClass]}`}
          />
        ) : (
          <StatBox label="Dados de golpe" value="—" sub="sin clase cargada" />
        )}
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
        <h2 className="text-xs uppercase tracking-widest text-gothic-on-surface-variant">Rasgos y dotes</h2>
        {character.traits.length === 0 ? (
          <p className="text-sm text-gothic-on-surface-variant">Sin rasgos cargados. Los carga el DM.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {character.traits.map((t) => (
              <li key={t.id} className="flex flex-col gap-0.5 rounded-gothic-sm bg-gothic-surface px-3 py-2 ring-1 ring-gothic-outline-variant">
                <span className="text-sm text-gothic-on-surface">{t.name}</span>
                {t.description && <span className="text-xs text-gothic-on-surface-variant">{t.description}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs uppercase tracking-widest text-gothic-on-surface-variant">Armas y acciones</h2>
        {character.actions.length === 0 ? (
          <p className="text-sm text-gothic-on-surface-variant">Sin acciones guardadas. Las carga el DM.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {character.actions.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-gothic-sm bg-gothic-surface px-3 py-2 text-sm ring-1 ring-gothic-outline-variant">
                <span className="flex flex-col">
                  <span className="text-gothic-on-surface">
                    {a.name}
                    {a.uses > 1 && <span className="ml-1.5 text-xs text-gothic-on-surface-variant">×{a.uses}</span>}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-gothic-on-surface-variant">
                    {ECONOMY_LABEL[a.economyType]} · {a.kind === "ATTACK" ? "ataque" : "curación"}
                  </span>
                </span>
                <span className="text-right font-gothic-data text-gothic-on-surface">
                  {a.kind === "ATTACK" && a.attackBonus !== null && <>{signed(a.attackBonus)} · </>}
                  {a.formula}
                  {a.damageType && <span className="ml-1 text-xs text-gothic-on-surface-variant">{a.damageType}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
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
                rechargeText={rechargeLabel(r)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs uppercase tracking-widest text-gothic-on-surface-variant">Datos del personaje</h2>
        <CharacterDetailsForm
          templateId={character.id}
          initial={{
            ...(Object.fromEntries(PHYSICAL_FIELDS.map(({ key }) => [key, character[key] ?? ""])) as Record<(typeof PHYSICAL_FIELDS)[number]["key"], string>),
            backstory: character.backstory ?? "",
            silver: String(character.silver),
          }}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs uppercase tracking-widest text-gothic-on-surface-variant">Notas</h2>
        <CharacterNotesForm templateId={character.id} initialNotes={character.notes ?? ""} />
      </section>

      <p className="text-xs text-gothic-on-surface-variant/80">
        Clase, armadura, rasgos, stats y competencias los administra el DM. Tus datos, tu plata, tus notas y el uso de tus recursos son tuyos para editar.
      </p>
    </div>
  );
}
