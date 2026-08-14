import { AcModifier } from "./types";

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

export function computeHpPct(currentHp: number, maxHp: number): number {
  return maxHp > 0 ? Math.max(0, Math.round((currentHp / maxHp) * 100)) : 0;
}
