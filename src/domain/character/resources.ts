// Recursos consumibles del personaje (P2, tabla genérica CharacterResource).
// Pura: sin Prisma ni React. Las acciones de servidor y los descansos la usan.

export type RestKind = "SHORT" | "LONG";

// Recarga generalizada (catalogo-recursos-clase.md §2.1): el descanso largo
// siempre repone todo; lo que cambia entre recursos es el descanso corto.
export type Recharge = {
  /** Usos que vuelven con un descanso corto (Segundo Aire 2024: 1). */
  shortRestRecoveryAmount: number;
  /** true = el descanso corto repone todo (espacios de Brujo). */
  fullRecoveryOnShortRest: boolean;
};
export type ResourceState = { max: number; used: number } & Recharge;

/** Texto corto para mostrar la regla de recarga de un recurso. */
export function rechargeLabel(r: Recharge): string {
  if (r.fullRecoveryOnShortRest) return "recupera todo con descanso corto";
  if (r.shortRestRecoveryAmount > 0) {
    const n = r.shortRestRecoveryAmount;
    return `recupera ${n} ${n === 1 ? "uso" : "usos"} con descanso corto, todo con largo`;
  }
  return "recupera con descanso largo";
}

function assertCount(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} debe ser un entero mayor o igual a 0 (recibido ${value})`);
  }
}

/** Valida que `used` esté entre 0 y `max`, y lo devuelve. */
export function setUsed(resource: ResourceState, used: number): number {
  assertCount(resource.max, "Máximo");
  assertCount(used, "Usados");
  if (used > resource.max) {
    throw new RangeError(`Usados (${used}) no puede superar el máximo (${resource.max})`);
  }
  return used;
}

/** Gasta `amount` usos. Falla si no alcanzan: no deja un recurso en negativo. */
export function spendResource(resource: ResourceState, amount = 1): number {
  assertCount(amount, "Cantidad");
  const next = resource.used + amount;
  if (next > resource.max) throw new RangeError("No quedan usos disponibles");
  return next;
}

/** Recupera `amount` usos, sin bajar de cero. */
export function restoreResource(resource: ResourceState, amount = 1): number {
  assertCount(amount, "Cantidad");
  return Math.max(0, resource.used - amount);
}

/**
 * Cuántos usos quedan usados después de un descanso.
 * - Descanso largo: todo vuelve a estar disponible.
 * - Descanso corto: todo si `fullRecoveryOnShortRest`; si no, `shortRestRecoveryAmount` usos.
 */
export function usedAfterRest(resource: ResourceState, rest: RestKind): number {
  if (rest === "LONG") return 0;
  if (resource.fullRecoveryOnShortRest) return 0;
  return Math.max(0, resource.used - resource.shortRestRecoveryAmount);
}

// ─── A4 — catálogo de recursos de clase (catalogo-recursos-clase.md §4) ──────

/** Tope de usos o puntos de un recurso. 100 para que entren los pools (Imposición de manos 5 × nivel). */
export const MAX_RESOURCE = 100;

export type RechargeMode = "LONG" | "SHORT_FULL" | "SHORT_PARTIAL";

/** Las tres reglas que muestra el formulario, a partir de los dos campos guardados. */
export function rechargeMode(r: Recharge): RechargeMode {
  if (r.fullRecoveryOnShortRest) return "SHORT_FULL";
  return r.shortRestRecoveryAmount > 0 ? "SHORT_PARTIAL" : "LONG";
}

export type CatalogEntry = Recharge & {
  fromLevel: number;
  /** Umbrales nivel → máximo, ej. { "1": 2, "3": 3, "6": 4 }. */
  maxByLevel: Record<string, number> | null;
  /** Máximo = nivel × este número (Puntos de hechicería 1, Imposición de manos 5). */
  maxPerClassLevel: number | null;
};

/**
 * Máximo sugerido para un nivel, o null si depende de algo que la app no calcula
 * (un modificador de característica). Es una sugerencia: el DM lo puede cambiar (D-15).
 */
export function suggestedMax(entry: CatalogEntry, level: number): number | null {
  if (level < entry.fromLevel) return null;
  let max: number | null = null;
  if (entry.maxPerClassLevel != null) {
    max = entry.maxPerClassLevel * level;
  } else if (entry.maxByLevel) {
    // El último umbral alcanzado: con { 1: 2, 3: 3, 6: 4 } y nivel 5 → umbral 3 → 3.
    const reached = Object.keys(entry.maxByLevel).map(Number).filter((n) => n <= level);
    if (reached.length > 0) max = entry.maxByLevel[String(Math.max(...reached))];
  }
  return max === null ? null : Math.min(MAX_RESOURCE, max);
}
