"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCampaignDmAction, UnauthorizedError } from "@/lib/auth/action-guards";
import { ABILITY_KEYS, SKILLS, type Ability, type SkillName } from "@/domain/character/rules";

// P2 / D-8 — el DM marca a mano las competencias del personaje (salvaciones,
// habilidades, pericia) y su característica de lanzamiento. Solo DM: son datos de
// configuración del personaje, igual que sus stats. Contrato { ok, error }.

type SheetResult = { ok: true } | { ok: false; error: string };

export type SheetInput = {
  saveProficiencies: string[];
  skillProficiencies: string[];
  skillExpertise: string[];
  spellcastingAbility: string | null;
};

const SKILL_NAMES: readonly string[] = SKILLS.map((s) => s.name);

function unique(values: string[]): boolean {
  return new Set(values).size === values.length;
}

export async function updateTemplateSheet(templateId: string, input: SheetInput): Promise<SheetResult> {
  const template = await prisma.characterTemplate.findUnique({
    where:  { id: templateId },
    select: { campaignId: true },
  });
  if (!template) return { ok: false, error: "No autorizado" };

  try {
    await requireCampaignDmAction(template.campaignId);
  } catch (err) {
    if (err instanceof UnauthorizedError) return { ok: false, error: err.message };
    throw err;
  }

  const saves = input.saveProficiencies ?? [];
  const skills = input.skillProficiencies ?? [];
  const expertise = input.skillExpertise ?? [];
  const spell = input.spellcastingAbility || null;

  if (!saves.every((k) => (ABILITY_KEYS as readonly string[]).includes(k)) || !unique(saves)) {
    return { ok: false, error: "Salvaciones inválidas" };
  }
  if (!skills.every((n) => SKILL_NAMES.includes(n)) || !unique(skills)) {
    return { ok: false, error: "Habilidades inválidas" };
  }
  if (!expertise.every((n) => skills.includes(n)) || !unique(expertise)) {
    return { ok: false, error: "La pericia requiere competencia en la habilidad" };
  }
  if (spell !== null && !(ABILITY_KEYS as readonly string[]).includes(spell)) {
    return { ok: false, error: "Característica de lanzamiento inválida" };
  }

  await prisma.characterTemplate.update({
    where: { id: templateId },
    data: {
      saveProficiencies:   saves as Ability[],
      skillProficiencies:  skills as SkillName[],
      skillExpertise:      expertise as SkillName[],
      spellcastingAbility: spell as Ability | null,
    },
  });
  revalidatePath(`/campaigns/${template.campaignId}/character`);
  revalidatePath(`/campaigns/${template.campaignId}/templates`);
  return { ok: true };
}
