"use server";

import { prisma } from "@/lib/prisma";

export async function createTemplate(formData: FormData) {
  const name = String(formData.get("name"));
  const type = String(formData.get("type")) as "PLAYER" | "NPC" | "MONSTER";
  const maxHp = Number(formData.get("maxHp"));
  const baseAc = Number(formData.get("baseAc"));
  const initiativeBonus = Number(formData.get("initiativeBonus"));

  if (!name) throw new Error("Name is required");

  await prisma.characterTemplate.create({
    data: {
      name,
      type,
      maxHp,
      baseAc,
      initiativeBonus,
      stats: {},
      abilities: {},
      source: "custom",
    },
  });
}

export async function getTemplates() {
  return prisma.characterTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });
}