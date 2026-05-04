"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CharacterType } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TemplateFormState = {
  error?: string;
  success?: boolean;
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getTemplates() {
  return prisma.characterTemplate.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

export async function getTemplateById(id: string) {
  return prisma.characterTemplate.findUnique({
    where: { id },
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function createTemplate(
  _prevState: TemplateFormState,
  formData: FormData
): Promise<TemplateFormState> {
  const name           = formData.get("name")?.toString().trim();
  const type           = formData.get("type")?.toString() as CharacterType;
  const maxHp          = Number(formData.get("maxHp"));
  const baseAc         = Number(formData.get("baseAc"));
  const initiativeBonus = Number(formData.get("initiativeBonus") ?? 0);

  // Validate
  if (!name)                return { error: "Name is required" };
  if (!Object.values(CharacterType).includes(type))
                            return { error: "Invalid character type" };
  if (!maxHp || maxHp < 1) return { error: "HP must be at least 1" };
  if (!baseAc || baseAc < 1) return { error: "AC must be at least 1" };

  await prisma.characterTemplate.create({
    data: { name, type, maxHp, baseAc, initiativeBonus },
  });

  revalidatePath("/templates");
  return { success: true };
}

export async function deleteTemplate(id: string): Promise<TemplateFormState> {
  // Don't allow deletion if this template is in an active combat
  const activeParticipant = await prisma.combatParticipant.findFirst({
    where: {
      templateId: id,
      combat: { status: { in: ["SETUP", "ACTIVE"] } },
    },
  });

  if (activeParticipant) {
    return { error: "Cannot delete a template that is in an active combat" };
  }

  await prisma.characterTemplate.delete({ where: { id } });

  revalidatePath("/templates");
  return { success: true };
}