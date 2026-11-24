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
