// Clase, nivel, dados de golpe y descanso largo (fase A, docs/rework/fase-a-plan.md §3).
// Pura: sin Prisma ni React. Mismo criterio que rules.ts y resources.ts.

export type CharacterKind = "PLAYER" | "NPC" | "MONSTER";

// Mismos valores que el enum CharacterClass de Prisma. Las 12 del PHB 2024 más
// el Artífice, sumado por decisión de Gonzalo (v2-historias.md §8, 2026-11-24).
export const CHARACTER_CLASSES = [
  "ARTIFICER", "BARBARIAN", "BARD", "CLERIC", "DRUID", "FIGHTER", "MONK",
  "PALADIN", "RANGER", "ROGUE", "SORCERER", "WARLOCK", "WIZARD",
] as const;

export type CharacterClass = (typeof CHARACTER_CLASSES)[number];

export const CLASS_LABELS: Record<CharacterClass, string> = {
  ARTIFICER: "Artífice",
  BARBARIAN: "Bárbaro",
  BARD: "Bardo",
  CLERIC: "Clérigo",
  DRUID: "Druida",
  FIGHTER: "Guerrero",
  MONK: "Monje",
  PALADIN: "Paladín",
  RANGER: "Explorador",
  ROGUE: "Pícaro",
  SORCERER: "Hechicero",
  WARLOCK: "Brujo",
  WIZARD: "Mago",
};

export function isCharacterClass(value: unknown): value is CharacterClass {
  return typeof value === "string" && (CHARACTER_CLASSES as readonly string[]).includes(value);
}

// ─── Dado de golpe [verificar contra el PHB 2024] ────────────────────────────

export const HIT_DIE: Record<CharacterClass, 6 | 8 | 10 | 12> = {
  BARBARIAN: 12,
  FIGHTER: 10, PALADIN: 10, RANGER: 10,
  ARTIFICER: 8, BARD: 8, CLERIC: 8, DRUID: 8, MONK: 8, ROGUE: 8, WARLOCK: 8,
  SORCERER: 6, WIZARD: 6,
};

/** Dados de golpe del personaje: tantos como su nivel, del tipo de su clase. */
export function hitDicePool(characterClass: CharacterClass, level: number) {
  return { die: HIT_DIE[characterClass], total: level };
}

/** Texto para mostrar, ej. "3d8". */
export function hitDiceLabel(characterClass: CharacterClass, level: number): string {
  const { die, total } = hitDicePool(characterClass, level);
  return `${total}d${die}`;
}

// ─── Nivel ───────────────────────────────────────────────────────────────────

/** D-12: los personajes de jugador llegan hasta nivel 7. */
export const MAX_PLAYER_LEVEL = 7;
/** NPC y monstruos: el rango del libro (la competencia está definida hasta 20). */
export const MAX_LEVEL = 20;

/**
 * Valida el nivel que se quiere guardar. Devuelve un mensaje de error o null.
 * Excepción (decisión 7.2): un PJ que ya tiene guardado un nivel mayor al tope
 * puede editarse sin cambiar el nivel, o bajarlo; nunca subirlo.
 */
export function levelError(input: {
  type: CharacterKind;
  level: number;
  storedLevel?: number | null;
}): string | null {
  const { type, level, storedLevel } = input;
  const max = type === "PLAYER" ? MAX_PLAYER_LEVEL : MAX_LEVEL;
  if (!Number.isInteger(level) || level < 1) return "El nivel debe ser un número entero mayor o igual a 1";
  if (level <= max) return null;
  if (type === "PLAYER" && storedLevel != null && level <= storedLevel && level <= MAX_LEVEL) return null;
  return type === "PLAYER"
    ? `El nivel máximo de un personaje de jugador es ${MAX_PLAYER_LEVEL}`
    : `El nivel máximo es ${MAX_LEVEL}`;
}

// ─── Dados de golpe y descanso largo ─────────────────────────────────────────

/** Gasta `count` dados de golpe; falla si no quedan (la tirada la escribe el jugador, D-14). */
export function spendHitDice(input: { level: number; hitDiceUsed: number; count: number }): number {
  const { level, hitDiceUsed, count } = input;
  if (!Number.isInteger(count) || count < 1) throw new RangeError("Cantidad de dados inválida");
  const next = hitDiceUsed + count;
  if (next > level) throw new RangeError(`Quedan ${Math.max(0, level - hitDiceUsed)} dados de golpe`);
  return next;
}

export type LongRestResult = {
  currentHp: null; // null = PG completos al empezar el próximo combate
  tempHp: 0;
  hitDiceUsed: 0;
  exhaustionLevel: number;
};

/**
 * Descanso largo 2024 [verificar]: PG completos, se recuperan todos los dados
 * de golpe, terminan los PG temporales y baja 1 nivel de agotamiento.
 */
export function longRestState(input: { exhaustionLevel: number }): LongRestResult {
  return {
    currentHp: null,
    tempHp: 0,
    hitDiceUsed: 0,
    exhaustionLevel: Math.max(0, input.exhaustionLevel - 1),
  };
}

/**
 * A3 / H16 — el jugador gasta dados de golpe en un descanso corto y escribe lo
 * que sacó, ya sumado el mod. de CON (D-14: la app no tira dados). Devuelve los
 * dados usados y los PG nuevos, o un mensaje de error.
 * Tope del total: cada dado como máximo `die + mod. CON` (si el mod. es positivo).
 * `currentHp` null = PG completos (convención de CharacterTemplate).
 */
export function hitDiceHeal(input: {
  characterClass: CharacterClass | null;
  level: number;
  hitDiceUsed: number;
  count: number;
  rolledTotal: number;
  conModifier: number;
  maxHp: number;
  currentHp: number | null;
}): { ok: true; hitDiceUsed: number; currentHp: number } | { ok: false; error: string } {
  const { characterClass, level, hitDiceUsed, count, rolledTotal, conModifier, maxHp } = input;
  if (!characterClass) return { ok: false, error: "El personaje no tiene clase cargada: el DM tiene que elegirla" };

  let used: number;
  try {
    used = spendHitDice({ level, hitDiceUsed, count });
  } catch (err) {
    return { ok: false, error: err instanceof RangeError ? err.message : "Cantidad de dados inválida" };
  }

  const maxRoll = count * (HIT_DIE[characterClass] + Math.max(0, conModifier));
  if (!Number.isInteger(rolledTotal) || rolledTotal < 0 || rolledTotal > maxRoll) {
    return { ok: false, error: `La tirada debe ser un número entero entre 0 y ${maxRoll}` };
  }

  const current = input.currentHp ?? maxHp;
  return { ok: true, hitDiceUsed: used, currentHp: Math.min(maxHp, current + rolledTotal) };
}
