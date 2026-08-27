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
  const campaignId      = formData.get("campaignId")?.toString();

  if (!campaignId)           return { error: "Missing campaignId" };
  if (!name)                 return { error: "Name is required" };
  if (!Object.values(CharacterType).includes(type))
                             return { error: "Invalid character type" };
  if (!maxHp || maxHp < 1)  return { error: "HP must be at least 1" };
  if (!baseAc || baseAc < 1) return { error: "AC must be at least 1" };

  await prisma.characterTemplate.create({
    data: { name, type, maxHp, baseAc, initiativeBonus, campaignId },
  });

  revalidatePath(`/campaigns/${campaignId}/templates`);
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

  revalidatePath(`/campaigns/${existing.campaignId}/templates`);
  revalidatePath(`/campaigns/${existing.campaignId}/templates/${id}/edit`);
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
  let deleted;
  try {
    deleted = await prisma.characterTemplate.delete({ where: { id } });
  } catch {
    return { error: "Cannot delete — this template has combat history. Archive it instead." };
  }

  revalidatePath(`/campaigns/${deleted.campaignId}/templates`);
  return { success: true };
}

// Long rest — restore all characters to maxHp
export async function longRest(templateIds: string[]): Promise<TemplateFormState> {
  try {
    // RestPanel only ever passes templates from a single campaign's list —
    // any one of them gives us the campaignId to revalidate.
    const first = await prisma.characterTemplate.findFirst({
      where:  { id: { in: templateIds } },
      select: { campaignId: true },
    });

    await prisma.$transaction(
      templateIds.map((id) =>
        prisma.characterTemplate.update({
          where: { id },
          data:  { currentHp: null }, // null = full HP on next combat start
        })
      )
    );
    if (first) revalidatePath(`/campaigns/${first.campaignId}/templates`);
    return { success: true };
  } catch {
    return { error: "Failed to apply long rest" };
  }
}

// Short rest — restore a specific amount to specific characters
export async function shortRest(
  updates: { id: string; healAmount: number }[]
): Promise<TemplateFormState> {
  try {
    const templates = await prisma.characterTemplate.findMany({
      where: { id: { in: updates.map((u) => u.id) } },
    });

    await prisma.$transaction(
      updates.map((u) => {
        const template = templates.find((t) => t.id === u.id);
        if (!template) return prisma.characterTemplate.update({ where: { id: u.id }, data: {} });
        const currentHp = template.currentHp ?? template.maxHp;
        const newHp = Math.min(template.maxHp, currentHp + u.healAmount);
        return prisma.characterTemplate.update({
          where: { id: u.id },
          data:  { currentHp: newHp },
        });
      })
    );
    if (templates[0]) revalidatePath(`/campaigns/${templates[0].campaignId}/templates`);
    return { success: true };
  } catch {
    return { error: "Failed to apply short rest" };
  }
}