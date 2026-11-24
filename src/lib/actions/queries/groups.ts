import { prisma } from "@/lib/prisma";

// T17 — consultas de grupos, sin "use server": solo las importan páginas del
// servidor que ya verificaron el acceso a la campaña.

// Groups aren't portable between campaigns, so every caller must go through
// the scoped query below. There is deliberately no unscoped getGroups();
// that was D16's bug (mixed every campaign's groups together on /groups).
export async function getGroupsForCampaign(campaignId: string) {
  return prisma.group.findMany({
    where:   { campaignId },
    orderBy: { createdAt: "desc" },
    include: {
      members: {
        include: { template: true },
      },
    },
  });
}

export async function getGroupById(id: string) {
  return prisma.group.findUnique({
    where: { id },
    include: {
      members: {
        include: { template: true },
      },
    },
  });
}
