// Validación de los datos descriptivos de la ficha (fase A, tramo A2, H3).
// Pura: sin Prisma ni React. Las acciones de servidor la usan antes de escribir.
// D-17: el jugador edita datos físicos, historia breve y dinero; el DM edita
// clase, subclase, armadura y rasgos. Cada grupo tiene su validador.

export const MAX_SHORT_TEXT = 40; // datos físicos, subclase, nombre de armadura
export const MAX_BACKSTORY = 300; // H3
export const MAX_TRAIT_NAME = 60;
export const MAX_TRAIT_DESCRIPTION = 300;
export const MAX_SILVER = 10_000_000;

export const PHYSICAL_FIELDS = [
  { key: "eyeColor", label: "Ojos" },
  { key: "hairColor", label: "Cabello" },
  { key: "skinColor", label: "Piel" },
  { key: "height", label: "Altura" },
  { key: "build", label: "Contextura y peso" },
] as const;

export type PhysicalKey = (typeof PHYSICAL_FIELDS)[number]["key"];

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

/** Texto opcional: recorta espacios, vacío → null, falla si supera `max`. */
function optionalText(value: unknown, max: number, label: string): Result<string | null> {
  if (value == null) return { ok: true, data: null };
  if (typeof value !== "string") return { ok: false, error: `${label}: valor inválido` };
  const text = value.trim();
  if (text === "") return { ok: true, data: null };
  if (text.length > max) return { ok: false, error: `${label}: máximo ${max} caracteres` };
  return { ok: true, data: text };
}

// ─── Jugador ─────────────────────────────────────────────────────────────────

export type PlayerDetails = Record<PhysicalKey, string | null> & {
  backstory: string | null;
  silver: number;
};

export function validatePlayerDetails(input: Record<string, unknown>): Result<PlayerDetails> {
  const out = {} as PlayerDetails;
  for (const { key, label } of PHYSICAL_FIELDS) {
    const r = optionalText(input[key], MAX_SHORT_TEXT, label);
    if (!r.ok) return r;
    out[key] = r.data;
  }
  const backstory = optionalText(input.backstory, MAX_BACKSTORY, "Historia breve");
  if (!backstory.ok) return backstory;
  out.backstory = backstory.data;

  const silver = Number(input.silver ?? 0);
  if (!Number.isInteger(silver) || silver < 0 || silver > MAX_SILVER) {
    return { ok: false, error: "La plata debe ser un número entero mayor o igual a 0" };
  }
  out.silver = silver;
  return { ok: true, data: out };
}

// ─── DM ──────────────────────────────────────────────────────────────────────

export type DmDetails = { subclass: string | null; armorName: string | null };

/** Subclase y armadura. La clase se valida aparte con isCharacterClass (progression.ts). */
export function validateDmDetails(input: Record<string, unknown>): Result<DmDetails> {
  const subclass = optionalText(input.subclass, MAX_SHORT_TEXT, "Subclase");
  if (!subclass.ok) return subclass;
  const armorName = optionalText(input.armorName, MAX_SHORT_TEXT, "Armadura");
  if (!armorName.ok) return armorName;
  return { ok: true, data: { subclass: subclass.data, armorName: armorName.data } };
}

export type TraitInput = { name: string; description: string | null };

export function validateTrait(input: Record<string, unknown>): Result<TraitInput> {
  const name = optionalText(input.name, MAX_TRAIT_NAME, "Nombre");
  if (!name.ok) return name;
  if (name.data === null) return { ok: false, error: "El nombre es obligatorio" };
  const description = optionalText(input.description, MAX_TRAIT_DESCRIPTION, "Descripción");
  if (!description.ok) return description;
  return { ok: true, data: { name: name.data, description: description.data } };
}
