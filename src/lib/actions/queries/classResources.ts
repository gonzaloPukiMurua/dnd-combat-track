import { prisma } from "@/lib/prisma";
import type { CharacterClass } from "@prisma/client";

// A4 — catálogo global de recursos de clase (de solo lectura). Sin "use server"
// (mismo criterio que T16): solo lo importa la página de edición, que ya exige DM.
export async function getClassResourceCatalog(characterClass: CharacterClass) {
  return prisma.classResourceTemplate.findMany({
    where:   { characterClass },
    orderBy: [{ fromLevel: "asc" }, { name: "asc" }],
  });
}
