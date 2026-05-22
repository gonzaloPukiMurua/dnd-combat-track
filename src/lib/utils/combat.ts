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

export function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}