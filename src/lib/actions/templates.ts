"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CharacterType } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TemplateFormState = {
  error?:   string;
  success?: boolean;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

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

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createTemplate(
  _prevState: TemplateFormState,
  formData: FormData
): Promise<TemplateFormState> {
  const name            = formData.get("name")?.toString().trim();
  const type            = formData.get("type")?.toString() as CharacterType;
  const maxHp           = Number(formData.get("maxHp"));
  const baseAc          = Number(formData.get("baseAc"));
  const initiativeBonus = Number(formData.get("initiativeBonus") ?? 0);

  if (!name)                 return { error: "Name is required" };
  if (!Object.values(CharacterType).includes(type))
                             return { error: "Invalid character type" };
  if (!maxHp || maxHp < 1)  return { error: "HP must be at least 1" };
  if (!baseAc || baseAc < 1) return { error: "AC must be at least 1" };

  await prisma.characterTemplate.create({
    data: { name, type, maxHp, baseAc, initiativeBonus },
  });

  revalidatePath("/templates");
  return { success: true };
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateTemplate(
  _prevState: TemplateFormState,
  formData: FormData
): Promise<TemplateFormState> {
  const id              = formData.get("id")?.toString();
  const name            = formData.get("name")?.toString().trim();
  const maxHp           = Number(formData.get("maxHp"));
  const baseAc          = Number(formData.get("baseAc"));
  const initiativeBonus = Number(formData.get("initiativeBonus") ?? 0);

  if (!id)                   return { error: "Missing template ID" };
  if (!name)                 return { error: "Name is required" };
  if (!maxHp || maxHp < 1)  return { error: "HP must be at least 1" };
  if (!baseAc || baseAc < 1) return { error: "AC must be at least 1" };

  const existing = await prisma.characterTemplate.findUnique({ where: { id } });
  if (!existing) return { error: "Template not found" };

  await prisma.characterTemplate.update({
    where: { id },
    data:  { name, maxHp, baseAc, initiativeBonus },
    // Note: type is intentionally not updatable — changing a PC to a Monster
    // mid-campaign causes confusion. Create a new template instead.
  });

  revalidatePath("/templates");
  revalidatePath(`/templates/${id}/edit`);
  return { success: true };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteTemplate(id: string): Promise<TemplateFormState> {
  // Block deletion if template is in any active or setup combat
  const activeParticipant = await prisma.combatParticipant.findFirst({
    where: {
      templateId: id,
      combat: { status: { in: ["SETUP", "ACTIVE"] } },
    },
  });

  if (activeParticipant) {
    return { error: "Cannot delete — this template is in an active combat." };
  }

  // Check if used in finished combats — warn but allow deletion
  // (finished combat logs still reference displayName as text, so history is preserved)
  try {
    await prisma.characterTemplate.delete({ where: { id } });
  } catch {
    return { error: "Cannot delete — this template has combat history. Archive it instead." };
  }

  revalidatePath("/templates");
  return { success: true };
}

// ─── Delete combat ────────────────────────────────────────────────────────────

export async function deleteCombat(id: string): Promise<TemplateFormState> {
  const combat = await prisma.combat.findUnique({ where: { id } });

  if (!combat) return { error: "Combat not found" };

  if (combat.status === "ACTIVE") {
    return { error: "Cannot delete an active combat. End it first." };
  }

  // Cascade deletes participants and logs (set in schema)
  await prisma.combat.delete({ where: { id } });

  revalidatePath("/combat");
  return { success: true };
}