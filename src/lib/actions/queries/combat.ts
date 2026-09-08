import { prisma } from "@/lib/prisma";

// Shared include shape — used everywhere a full combat (participants +
// their templates + logs) needs to be read from the DB, so the shape only
// has to be declared once.
export const COMBAT_DETAIL_INCLUDE = {
  participants: {
    orderBy: { turnOrder: "asc" as const },
    // monsterTemplate rides along so the mapper can surface a synthetic
    // view-model `template` (type MONSTER) for global-roster participants —
    // their real `template` relation is null (etapa-3-monstruos.md §5).
    include: { template: true, monsterTemplate: true },
  },
  logs: {
    orderBy: { createdAt: "asc" as const },
    include: { actor: true, target: true },
  },
};

export function getCombatDetail(id: string) {
  return prisma.combat.findUnique({
    where:   { id },
    include: COMBAT_DETAIL_INCLUDE,
  });
}

export function getActiveCombatDetail() {
  return prisma.combat.findFirst({
    where:   { status: { in: ["SETUP", "ACTIVE"] } },
    include: COMBAT_DETAIL_INCLUDE,
  });
}

export function getActiveCombatForCampaign(campaignId: string) {
  return prisma.combat.findFirst({
    where:   { campaignId, status: { in: ["SETUP", "ACTIVE"] } },
    include: COMBAT_DETAIL_INCLUDE,
  });
}

export function getPreviousCombatsForCampaign(campaignId: string) {
  return prisma.combat.findMany({
    where:   { campaignId, status: "FINISHED" },
    orderBy: { createdAt: "desc" },
    select:  { id: true, name: true, status: true, round: true, createdAt: true },
  });
}

export function getCombatByJoinCodeDetail(code: string) {
  return prisma.combat.findUnique({
    where:   { joinCode: code.toUpperCase().trim() },
    include: {
      participants: COMBAT_DETAIL_INCLUDE.participants,
    },
  });
}

// Setup screen needs participants in add-order (not turn order — initiative
// hasn't been rolled yet) and no logs.
export function getCombatSetupDetail(id: string) {
  return prisma.combat.findUnique({
    where: { id },
    include: {
      participants: {
        orderBy: { createdAt: "asc" as const },
        include: { template: true, monsterTemplate: true },
      },
    },
  });
}

// Global monster roster — deliberately NOT campaign-scoped (the roster has no
// campaignId; spec-tecnico-etapa-3-monstruos.md §2/§3). Ordered so the picker
// groups cleanly by category.
export function getMonsterTemplates() {
  return prisma.monsterTemplate.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}
