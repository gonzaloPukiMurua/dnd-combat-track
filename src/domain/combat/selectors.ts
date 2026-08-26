import { AcModifier } from "./types";

export const TYPE_ACCENT: Record<string, string> = {
  PLAYER:  "border-l-gothic-primary",
  NPC:     "border-l-gothic-outline",
  MONSTER: "border-l-gothic-danger-bright",
};

// sistema-visual-etapa-1.md §3 — "Color condicional: brass-bright por encima
// del 25%, danger-bright + pulso por debajo" (verified against the HP bar in
// vista_combate_dm_flat_gothic/code.html, which uses the same two-tier split).
export function hpBarColor(pct: number, conscious: boolean) {
  if (!conscious) return "bg-gothic-outline-variant";
  if (pct > 25)   return "bg-gothic-success-bg";
  return "bg-gothic-danger";
}

export function computeAcTotal(
  baseAc: number,
  acModifiers: unknown
): number {
  const mods = (acModifiers as AcModifier[]) ?? [];
  return baseAc + mods.reduce((sum, m) => sum + m.value, 0);
}

export function computeHpPct(currentHp: number, maxHp: number): number {
  return maxHp > 0 ? Math.max(0, Math.round((currentHp / maxHp) * 100)) : 0;
}

// D12 — spectate view hides other combatants' exact HP (spec-tecnico-etapa-1
// §3, sistema-visual §4 fila 12: "oculta HP exacto de otros combatientes,
// estado cualitativo tipo 'Herido'"). Thresholds chosen to bracket the two
// concrete examples in vista_combate_jugador_flat_gothic/code.html (HERIDO,
// MALHERIDO).
export function qualitativeHpLabel(pct: number, isConscious: boolean): string | null {
  if (!isConscious) return null; // CombatStatusBadges already covers unconscious/dead/stable
  if (pct >= 75) return null;    // healthy — no badge needed
  if (pct >= 50) return "Herido";
  if (pct >= 25) return "Malherido";
  return "Crítico";
}
