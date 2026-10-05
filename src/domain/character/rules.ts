// Cálculo puro de la ficha de personaje (docs/rework/p2-reglas-personaje.md, secciones 1 y 2).
// Sin React, sin Prisma, sin dependencias: mismo criterio que domain/combat/rules.ts.

export type Ability = "str" | "dex" | "con" | "int" | "wis" | "cha";

// Las 18 habilidades y su característica (libro 2024, sección 2.4).
export const SKILLS = [
  { name: "Atletismo",         ability: "str" },
  { name: "Acrobacias",        ability: "dex" },
  { name: "Juego de manos",    ability: "dex" },
  { name: "Sigilo",            ability: "dex" },
  { name: "Arcanos",           ability: "int" },
  { name: "Historia",          ability: "int" },
  { name: "Investigación",     ability: "int" },
  { name: "Naturaleza",        ability: "int" },
  { name: "Religión",          ability: "int" },
  { name: "Trato con animales", ability: "wis" },
  { name: "Perspicacia",       ability: "wis" },
  { name: "Medicina",          ability: "wis" },
  { name: "Percepción",        ability: "wis" },
  { name: "Supervivencia",     ability: "wis" },
  { name: "Engaño",            ability: "cha" },
  { name: "Intimidación",      ability: "cha" },
  { name: "Interpretación",    ability: "cha" },
  { name: "Persuasión",        ability: "cha" },
] as const;

export type SkillName = (typeof SKILLS)[number]["name"];

function assertInt(value: number, min: number, max: number, label: string) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${label} debe ser un entero entre ${min} y ${max} (recibido ${value})`);
  }
}

// ─── Modificadores y competencia ─────────────────────────────────────────────

/** modificador = floor((puntuación − 10) / 2). Puntuación 1–30. */
export function abilityModifier(score: number): number {
  assertInt(score, 1, 30, "Puntuación de característica");
  return Math.floor((score - 10) / 2);
}

/** Bono de competencia por nivel (1–20): +2 en 1–4, +3 en 5–8, … +6 en 17–20. */
export function proficiencyBonus(level: number): number {
  assertInt(level, 1, 20, "Nivel");
  return 2 + Math.floor((level - 1) / 4);
}

// ─── Salvaciones y habilidades ───────────────────────────────────────────────

export function savingThrowBonus(input: {
  score: number;
  level: number;
  proficient: boolean;
}): number {
  const pb = proficiencyBonus(input.level);
  return abilityModifier(input.score) + (input.proficient ? pb : 0);
}

/** Pericia suma el bono de competencia por segunda vez; requiere competencia. */
export function skillBonus(input: {
  score: number;
  level: number;
  proficient: boolean;
  expertise?: boolean;
}): number {
  if (input.expertise && !input.proficient) {
    throw new RangeError("Pericia requiere competencia en la habilidad");
  }
  const pb = proficiencyBonus(input.level);
  return (
    abilityModifier(input.score) +
    (input.proficient ? pb : 0) +
    (input.expertise ? pb : 0)
  );
}

/** Puntuación pasiva = 10 + bono de habilidad (Percepción, Perspicacia, Investigación). */
export function passiveScore(bonus: number): number {
  return 10 + bonus;
}

// ─── Conjuros ────────────────────────────────────────────────────────────────

/** CD de conjuro = 8 + competencia + modificador de la característica de lanzamiento. */
export function spellSaveDc(input: { score: number; level: number }): number {
  return 8 + proficiencyBonus(input.level) + abilityModifier(input.score);
}

/** Bono de ataque de conjuro = competencia + modificador de la característica de lanzamiento. */
export function spellAttackBonus(input: { score: number; level: number }): number {
  return proficiencyBonus(input.level) + abilityModifier(input.score);
}

// ─── Agotamiento (verificado por Gonzalo, docs/rework/p2-reglas-personaje.md §2.7) ─

export type ExhaustionEffects = {
  /** Penalización a TODA prueba de d20 (característica, ataque, salvación). */
  d20Penalty: number;
  /** Pies menos de velocidad. */
  speedPenaltyFt: number;
  /** Nivel 6 = muerte. */
  dead: boolean;
};

export function exhaustionEffects(level: number): ExhaustionEffects {
  assertInt(level, 0, 6, "Nivel de agotamiento");
  return {
    d20Penalty: 2 * level,
    speedPenaltyFt: 5 * level,
    dead: level === 6,
  };
}

// ─── Ficha calculada (P2, docs/rework/p2-reglas-personaje.md §5) ─────────────

export const ABILITY_KEYS: readonly Ability[] = ["str", "dex", "con", "int", "wis", "cha"];

export type SheetInput = {
  level: number;
  scores: Record<Ability, number>;
  saveProficiencies: readonly Ability[];
  skillProficiencies: readonly SkillName[];
  skillExpertise: readonly SkillName[];
  spellcastingAbility: Ability | null;
  exhaustionLevel: number;
};

export type Sheet = {
  proficiencyBonus: number;
  abilities: { key: Ability; score: number; modifier: number }[];
  saves: { key: Ability; bonus: number; proficient: boolean }[];
  skills: { name: SkillName; ability: Ability; bonus: number; proficient: boolean; expertise: boolean }[];
  passivePerception: number;
  spell: { saveDc: number; attackBonus: number } | null;
  exhaustion: ExhaustionEffects;
};

export function buildSheet(input: SheetInput): Sheet {
  const pb = proficiencyBonus(input.level);

  const abilities = ABILITY_KEYS.map((key) => ({
    key,
    score: input.scores[key],
    modifier: abilityModifier(input.scores[key]),
  }));

  const saves = ABILITY_KEYS.map((key) => {
    const proficient = input.saveProficiencies.includes(key);
    return {
      key,
      proficient,
      bonus: savingThrowBonus({ score: input.scores[key], level: input.level, proficient }),
    };
  });

  const skills = SKILLS.map((skill) => {
    const proficient = input.skillProficiencies.includes(skill.name);
    const expertise = input.skillExpertise.includes(skill.name);
    return {
      name: skill.name,
      ability: skill.ability,
      proficient,
      expertise,
      bonus: skillBonus({
        score: input.scores[skill.ability],
        level: input.level,
        proficient,
        expertise,
      }),
    };
  });

  const perception = skills.find((s) => s.name === "Percepción");
  if (!perception) throw new Error("Falta la habilidad Percepción en SKILLS");

  const spell =
    input.spellcastingAbility === null
      ? null
      : {
          saveDc: spellSaveDc({ score: input.scores[input.spellcastingAbility], level: input.level }),
          attackBonus: spellAttackBonus({ score: input.scores[input.spellcastingAbility], level: input.level }),
        };

  return {
    proficiencyBonus: pb,
    abilities,
    saves,
    skills,
    passivePerception: passiveScore(perception.bonus),
    spell,
    exhaustion: exhaustionEffects(input.exhaustionLevel),
  };
}
