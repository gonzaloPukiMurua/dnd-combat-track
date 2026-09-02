"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CharacterType } from "@prisma/client";
import { requireCampaignDmAction, UnauthorizedError } from "@/lib/auth/action-guards";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TemplateFormState = {
  error?:   string;
  success?: boolean;
};

// S2-0 — every mutation here is DM-only, on the campaign that owns the
// template(s) being touched. The action-guards throw; this file answers with
// form-state { error }, so the throw is adapted to that shape. A non-auth
// error still propagates.
async function requireDm(campaignId: string): Promise<TemplateFormState | null> {
  try {
    await requireCampaignDmAction(campaignId);
    return null;
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: err.message };
    throw err;
  }
}

// ─── Stat fields (S2-8) ───────────────────────────────────────────────────────

// The character forms (CreateTemplateForm / the edit page) have always shown
// inputs for these 8 fields, but createTemplate/updateTemplate used to drop
// them silently — nothing else edits them, so the form was lying. Parse +
// validate here, same shape as the maxHp/baseAc checks below: one specific
// message per field, never a generic "invalid input".
type StatFields = {
  level:            number;
  proficiencyBonus: number;
  str:              number;
  dex:              number;
  con:              number;
  int:              number;
  wis:              number;
  cha:              number;
  exhaustionLevel:  number;
};

const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"] as const;

function parseStatFields(formData: FormData): StatFields | { error: string } {
  const level            = Number(formData.get("level"));
  const proficiencyBonus = Number(formData.get("proficiencyBonus"));
  const exhaustionLevel  = Number(formData.get("exhaustionLevel"));

  if (!Number.isInteger(level) || level < 1)
    return { error: "Level must be a whole number of at least 1" };

  // Homebrew rules can drive proficiency negative (a curse, an anti-magic
  // field), so there's no minimum here — only the whole-number requirement.
  if (!Number.isInteger(proficiencyBonus))
    return { error: "Proficiency bonus must be a whole number" };

  const abilities = {} as Record<(typeof ABILITY_KEYS)[number], number>;
  for (const key of ABILITY_KEYS) {
    const value = Number(formData.get(key));
    if (!Number.isInteger(value) || value < 1 || value > 30)
      return { error: `${key.toUpperCase()} must be a whole number between 1 and 30` };
    abilities[key] = value;
  }

  if (!Number.isInteger(exhaustionLevel) || exhaustionLevel < 0 || exhaustionLevel > 6)
    return { error: "Exhaustion level must be a whole number between 0 and 6" };

  return { level, proficiencyBonus, exhaustionLevel, ...abilities };
}

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

  const denied = await requireDm(campaignId);
  if (denied) return denied;

  if (!name)                 return { error: "Name is required" };
  if (!Object.values(CharacterType).includes(type))
                             return { error: "Invalid character type" };
  if (!maxHp || maxHp < 1)  return { error: "HP must be at least 1" };
  if (!baseAc || baseAc < 1) return { error: "AC must be at least 1" };

  const stats = parseStatFields(formData);
  if ("error" in stats) return stats;

  await prisma.characterTemplate.create({
    data: { name, type, maxHp, baseAc, initiativeBonus, campaignId, ...stats },
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

  const denied = await requireDm(existing.campaignId);
  if (denied) return denied;

  const stats = parseStatFields(formData);
  if ("error" in stats) return stats;

  await prisma.characterTemplate.update({
    where: { id },
    data:  { name, maxHp, baseAc, initiativeBonus, ...stats },
    // Note: type is intentionally not updatable — changing a PC to a Monster
    // mid-campaign causes confusion. Create a new template instead.
  });

  revalidatePath(`/campaigns/${existing.campaignId}/templates`);
  revalidatePath(`/campaigns/${existing.campaignId}/templates/${id}/edit`);
  return { success: true };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteTemplate(id: string): Promise<TemplateFormState> {
  const template = await prisma.characterTemplate.findUnique({
    where:  { id },
    select: { campaignId: true },
  });
  if (!template) return { error: "Template not found" };

  const denied = await requireDm(template.campaignId);
  if (denied) return denied;

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
    // RestPanel sends a raw id list from a single campaign's roster, but the
    // action can't trust that — every id must exist and resolve to one same
    // campaign before we touch anything (S2-0).
    const templates = await prisma.characterTemplate.findMany({
      where:  { id: { in: templateIds } },
      select: { id: true, campaignId: true },
    });
    const campaignIds = new Set(templates.map((t) => t.campaignId));
    if (templates.length !== templateIds.length || campaignIds.size !== 1) {
      return { error: "Invalid template selection" };
    }
    const [campaignId] = [...campaignIds];

    const denied = await requireDm(campaignId);
    if (denied) return denied;

    await prisma.$transaction(
      templateIds.map((id) =>
        prisma.characterTemplate.update({
          where: { id },
          data:  { currentHp: null }, // null = full HP on next combat start
        })
      )
    );
    revalidatePath(`/campaigns/${campaignId}/templates`);
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
    const ids = updates.map((u) => u.id);
    const templates = await prisma.characterTemplate.findMany({
      where: { id: { in: ids } },
    });
    const campaignIds = new Set(templates.map((t) => t.campaignId));
    if (templates.length !== ids.length || campaignIds.size !== 1) {
      return { error: "Invalid template selection" };
    }
    const [campaignId] = [...campaignIds];

    const denied = await requireDm(campaignId);
    if (denied) return denied;

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
    revalidatePath(`/campaigns/${campaignId}/templates`);
    return { success: true };
  } catch {
    return { error: "Failed to apply short rest" };
  }
}