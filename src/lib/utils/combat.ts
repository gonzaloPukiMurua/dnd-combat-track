// ─── Utility: computed AC total ──────────────────────────────────────────────
// Not a server action — just a pure helper used by UI components.
import { AcModifier } from "@/stores/combatStore";
export function computeAcTotal(
  baseAc: number,
  acModifiers: unknown
): number {
  const mods = (acModifiers as AcModifier[]) ?? [];
  return baseAc + mods.reduce((sum, m) => sum + m.value, 0);
}