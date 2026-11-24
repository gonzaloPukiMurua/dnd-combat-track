"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CharacterType } from "@prisma/client";
import { requireCampaignDmAction, UnauthorizedError } from "@/lib/auth/action-guards";
import { usedAfterRest } from "@/domain/character/resources";
import { levelError, type CharacterKind } from "@/domain/character/progression";

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
// inputs for these fields, but createTemplate/updateTemplate used to drop
// them silently — nothing else edits them, so the form was lying. Parse +
// validate here, same shape as the maxHp/baseAc checks below: one specific
// message per field, never a generic "invalid input".
// Fase A: proficiencyBonus ya no se lee ni se escribe (D-5, T11) y el nivel
// tiene tope según el tipo (D-12, levelError).
type StatFields = {
  level:            number;
  str:              number;
  dex:              number;
  con:              number;
  int:              number;
  wis:              number;
  cha:              number;
  exhaustionLevel:  number;
};

const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"] as const;
const ABILITY_LABELS: Record<(typeof ABILITY_KEYS)[number], string> = {
  str: "FUE", dex: "DES", con: "CON", int: "INT", wis: "SAB", cha: "CAR",
};

function parseStatFields(
  formData: FormData,
  type: CharacterKind,
  storedLevel: number | null,
): StatFields | { error: string } {
  const level           = Number(formData.get("level"));
  const exhaustionLevel = Number(formData.get("exhaustionLevel"));

  const badLevel = levelError({ type, level, storedLevel });
  if (badLevel) return { error: badLevel };

  const abilities = {} as Record<(typeof ABILITY_KEYS)[number], number>;
  for (const key of ABILITY_KEYS) {
    const value = Number(formData.get(key));
    if (!Number.isInteger(value) || value < 1 || value > 30)
      return { error: `${ABILITY_LABELS[key]} debe ser un número entero entre 1 y 30` };
    abilities[key] = value;
  }

  if (!Number.isInteger(exhaustionLevel) || exhaustionLevel < 0 || exhaustionLevel > 6)
    return { error: "El agotamiento debe ser un número entero entre 0 y 6" };

  return { level, exhaustionLevel, ...abilities };
}

// Las consultas de lectura (getTemplatesForCampaign, getTemplateById) están en
// lib/actions/queries/templates.ts: exportadas desde acá eran Server Actions sin guard (T16).

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

  if (!campaignId)           return { error: "Falta la campaña" };

  const denied = await requireDm(campaignId);
  if (denied) return denied;

  if (!name)                 return { error: "El nombre es obligatorio" };
  if (!Object.values(CharacterType).includes(type))
                             return { error: "Tipo de personaje inválido" };
  if (!maxHp || maxHp < 1)  return { error: "Los PG deben ser al menos 1" };
  if (!baseAc || baseAc < 1) return { error: "La CA debe ser al menos 1" };

  const stats = parseStatFields(formData, type, null);
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

  if (!id)                   return { error: "Falta el personaje" };
  if (!name)                 return { error: "El nombre es obligatorio" };
  if (!maxHp || maxHp < 1)  return { error: "Los PG deben ser al menos 1" };
  if (!baseAc || baseAc < 1) return { error: "La CA debe ser al menos 1" };

  const existing = await prisma.characterTemplate.findUnique({ where: { id } });
  if (!existing) return { error: "Personaje no encontrado" };

  const denied = await requireDm(existing.campaignId);
  if (denied) return denied;

  // 7.2: un PJ guardado con nivel mayor al tope se puede editar sin subirlo.
  const stats = parseStatFields(formData, existing.type, existing.level);
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
  if (!template) return { error: "Personaje no encontrado" };

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
    return { error: "No se puede borrar: el personaje está en un combate activo." };
  }

  // Check if used in finished combats — warn but allow deletion
  // (finished combat logs still reference displayName as text, so history is preserved)
  let deleted;
  try {
    deleted = await prisma.characterTemplate.delete({ where: { id } });
  } catch {
    return { error: "No se puede borrar: el personaje tiene historial de combates." };
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
      return { error: "Selección de personajes inválida" };
    }
    const [campaignId] = [...campaignIds];

    const denied = await requireDm(campaignId);
    if (denied) return denied;

    // P2: el descanso largo recupera todos los recursos de estos personajes.
    const resources = await prisma.characterResource.findMany({ where: { templateId: { in: templateIds } } });
    const resourceOps = resources
      .filter((r) => usedAfterRest(r, "LONG") !== r.used)
      .map((r) => prisma.characterResource.update({ where: { id: r.id }, data: { used: usedAfterRest(r, "LONG") } }));

    await prisma.$transaction([
      ...templateIds.map((id) =>
        prisma.characterTemplate.update({
          where: { id },
          data:  { currentHp: null }, // null = full HP on next combat start
        })
      ),
      ...resourceOps,
    ]);
    revalidatePath(`/campaigns/${campaignId}/templates`);
    return { success: true };
  } catch {
    return { error: "No se pudo aplicar el descanso largo" };
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
      return { error: "Selección de personajes inválida" };
    }
    const [campaignId] = [...campaignIds];

    const denied = await requireDm(campaignId);
    if (denied) return denied;

    // El descanso corto recupera según la regla de cada recurso (usedAfterRest).
    const resources = await prisma.characterResource.findMany({ where: { templateId: { in: ids } } });
    const resourceOps = resources
      .filter((r) => usedAfterRest(r, "SHORT") !== r.used)
      .map((r) => prisma.characterResource.update({ where: { id: r.id }, data: { used: usedAfterRest(r, "SHORT") } }));

    await prisma.$transaction([
      ...updates.map((u) => {
        const template = templates.find((t) => t.id === u.id);
        if (!template) return prisma.characterTemplate.update({ where: { id: u.id }, data: {} });
        const currentHp = template.currentHp ?? template.maxHp;
        const newHp = Math.min(template.maxHp, currentHp + u.healAmount);
        return prisma.characterTemplate.update({
          where: { id: u.id },
          data:  { currentHp: newHp },
        });
      }),
      ...resourceOps,
    ]);
    revalidatePath(`/campaigns/${campaignId}/templates`);
    return { success: true };
  } catch {
    return { error: "No se pudo aplicar el descanso corto" };
  }
}