import { prisma } from "@/lib/prisma";

// T16 — consultas de lectura de plantillas. Viven acá, y no en templates.ts,
// porque todo lo que exporta un archivo "use server" es una Server Action
// llamable desde el navegador sin pasar por el guard de la página. Solo las
// importan páginas del servidor que ya verificaron el acceso a la campaña.

// Templates aren't portable between campaigns (spec-tecnico-etapa-1.md §2) —
// every caller must go through the scoped query below. There is
// deliberately no unscoped getTemplates(); that was D16's bug (mixed every
// campaign's roster together on /templates).
export async function getTemplatesForCampaign(campaignId: string) {
  return prisma.characterTemplate.findMany({
    where:   { campaignId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

export async function getTemplateById(id: string) {
  return prisma.characterTemplate.findUnique({
    where: { id },
    include: { actions: { orderBy: { order: "asc" } } },
  });
}
