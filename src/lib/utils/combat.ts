// ─── Utility: computed AC total ──────────────────────────────────────────────
// Not a server action — just a pure helper used by UI components.
import { AcModifier } from "@/stores/combatStore";

export const TYPE_ACCENT: Record<string, string> = {
  PLAYER:  "border-l-indigo-400",
  NPC:     "border-l-emerald-400",
  MONSTER: "border-l-red-400",
};


export function hpBarColor(pct: number, conscious: boolean) {
  if (!conscious) return "bg-slate-600";
  if (pct > 60)   return "bg-green-500";
  if (pct > 30)   return "bg-yellow-400";
  return "bg-red-500";
}

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