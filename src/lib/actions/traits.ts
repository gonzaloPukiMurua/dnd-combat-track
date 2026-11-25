"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCampaignDmAction, UnauthorizedError } from "@/lib/auth/action-guards";
import { validateTrait } from "@/domain/character/details";

// A2 — rasgos de clase y dotes del personaje, en texto libre (7.3). Solo el DM
// de la campaña (D-17). Los usos, si tienen, se cargan como recurso (D-15).
// Contrato { ok, error }: no tira hacia el cliente.

type TraitResult = { ok: true } | { ok: false; error: string };

async function dmOf(campaignId: string): Promise<TraitResult | null> {
  try {
    await requireCampaignDmAction(campaignId);
    return null;
  } catch (err) {
    if (err instanceof UnauthorizedError) return { ok: false, error: err.message };
    throw err;
  }
}

function revalidate(campaignId: string, templateId: string) {
  revalidatePath(`/campaigns/${campaignId}/templates/${templateId}/edit`);
  revalidatePath(`/campaigns/${campaignId}/character`);
}

export async function createTrait(
  templateId: string,
  input: { name: string; description?: string | null }
): Promise<TraitResult> {
  const template = await prisma.characterTemplate.findUnique({
    where:  { id: templateId },
    select: { campaignId: true, _count: { select: { traits: true } } },
  });
  if (!template) return { ok: false, error: "No autorizado" };

  const denied = await dmOf(template.campaignId);
  if (denied) return denied;

  const parsed = validateTrait(input);
  if (!parsed.ok) return parsed;

  await prisma.characterTrait.create({
    data: { templateId, ...parsed.data, order: template._count.traits },
  });
  revalidate(template.campaignId, templateId);
  return { ok: true };
}

export async function deleteTrait(traitId: string): Promise<TraitResult> {
  const trait = await prisma.characterTrait.findUnique({
    where:  { id: traitId },
    select: { id: true, templateId: true, template: { select: { campaignId: true } } },
  });
  if (!trait) return { ok: false, error: "No autorizado" };

  const denied = await dmOf(trait.template.campaignId);
  if (denied) return denied;

  await prisma.characterTrait.delete({ where: { id: trait.id } });
  revalidate(trait.template.campaignId, trait.templateId);
  return { ok: true };
}
