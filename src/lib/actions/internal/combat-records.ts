import { prisma } from "@/lib/prisma";

// T17 — funciones de servidor que NO son Server Actions: este archivo no tiene
// "use server", así que nada de acá se puede llamar desde el navegador. Quien
// las use tiene que haber verificado el acceso antes.

// Shared by src/app/campaigns/[id]/combat/new/route.ts (D14a) and
// startCombatFromGroup (E5) — keeps the one-SETUP/ACTIVE-combat-per-campaign
// rule in a single place. requireCampaignDmAction is deliberately NOT called
// here: both callers already guard DM-ness themselves before reaching this.
export async function createCombatRecord(campaignId: string, name?: string) {
  const existing = await prisma.combat.findFirst({
    where: { campaignId, status: { in: ["SETUP", "ACTIVE"] } },
  });
  if (existing) {
    throw new Error("A combat is already in progress in this campaign. End it before starting a new one.");
  }

  return prisma.combat.create({
    data: { name: name?.trim() || "New Combat", campaignId, status: "SETUP", round: 0, currentTurnIndex: 0 },
  });
}
