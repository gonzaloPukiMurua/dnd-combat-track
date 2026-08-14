import { prisma } from "@/lib/prisma";

// Shared include shape — used everywhere a full combat (participants +
// their templates + logs) needs to be read from the DB, so the shape only
// has to be declared once.
export const COMBAT_DETAIL_INCLUDE = {
  participants: {
    orderBy: { turnOrder: "asc" as const },
    include: { template: true },
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
        include: { template: true },
      },
    },
  });
}
