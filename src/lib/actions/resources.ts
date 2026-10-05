"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  requireCampaignDmAction,
  requireTemplateOwner,
  UnauthorizedError,
} from "@/lib/auth/action-guards";
import { setUsed } from "@/domain/character/resources";

// P2 — recursos consumibles del personaje (tabla CharacterResource).
// Permisos: el DE USO (marcar gastados/recuperados) es del dueño del personaje;
// crear, editar el máximo y borrar son del DM de la campaña, igual que los stats.
// Contrato { ok, error }: no tira hacia el cliente.

type ResourceResult = { ok: true } | { ok: false; error: string };

const RECHARGES = ["SHORT", "LONG"] as const;

async function guard<T>(check: () => Promise<T>): Promise<{ ok: true; ctx: T } | { ok: false; error: string }> {
  try {
    return { ok: true, ctx: await check() };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { ok: false, error: err.message };
    throw err;
  }
}

async function resourceWithTemplate(resourceId: string) {
  return prisma.characterResource.findUnique({
    where:  { id: resourceId },
    select: { id: true, templateId: true, name: true, max: true, used: true, recharge: true, template: { select: { campaignId: true } } },
  });
}

/** Gasta o recupera usos. Lo puede hacer el dueño del personaje. */
export async function setResourceUsed(resourceId: string, used: number): Promise<ResourceResult> {
  const res = await resourceWithTemplate(resourceId);
  if (!res) return { ok: false, error: "No autorizado" };

  const g = await guard(() => requireTemplateOwner(res.templateId));
  if (!g.ok) return g;

  let value: number;
  try {
    value = setUsed(res, used);
  } catch (err) {
    return { ok: false, error: err instanceof RangeError ? err.message : "Valor inválido" };
  }

  await prisma.characterResource.update({ where: { id: res.id }, data: { used: value } });
  revalidatePath(`/campaigns/${res.template.campaignId}/character`);
  return { ok: true };
}

/** Crea un recurso en la plantilla. DM de la campaña. */
export async function createResource(
  templateId: string,
  input: { name: string; max: number; recharge: string; level?: number | null }
): Promise<ResourceResult> {
  const template = await prisma.characterTemplate.findUnique({
    where:  { id: templateId },
    select: { campaignId: true },
  });
  if (!template) return { ok: false, error: "No autorizado" };

  const g = await guard(() => requireCampaignDmAction(template.campaignId));
  if (!g.ok) return g;

  const name = input.name?.trim() ?? "";
  if (name.length < 1 || name.length > 40) return { ok: false, error: "El nombre debe tener entre 1 y 40 caracteres" };
  if (!Number.isInteger(input.max) || input.max < 1 || input.max > 20) return { ok: false, error: "El máximo debe ser un entero entre 1 y 20" };
  if (!RECHARGES.includes(input.recharge as (typeof RECHARGES)[number])) return { ok: false, error: "Recarga inválida" };
  const level = input.level ?? null;
  if (level !== null && (!Number.isInteger(level) || level < 1 || level > 9)) return { ok: false, error: "El nivel del espacio debe estar entre 1 y 9" };

  try {
    await prisma.characterResource.create({
      data: { templateId, name, max: input.max, used: 0, recharge: input.recharge as (typeof RECHARGES)[number], level },
    });
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && (err as { code: string }).code === "P2002") {
      return { ok: false, error: "Ya existe un recurso con ese nombre" };
    }
    throw err;
  }
  revalidatePath(`/campaigns/${template.campaignId}/templates`);
  return { ok: true };
}

/** Cambia el máximo. Si baja por debajo de lo usado, falla (no recorta en silencio). DM. */
export async function updateResourceMax(resourceId: string, max: number): Promise<ResourceResult> {
  const res = await resourceWithTemplate(resourceId);
  if (!res) return { ok: false, error: "No autorizado" };

  const g = await guard(() => requireCampaignDmAction(res.template.campaignId));
  if (!g.ok) return g;

  if (!Number.isInteger(max) || max < 1 || max > 20) return { ok: false, error: "El máximo debe ser un entero entre 1 y 20" };
  if (max < res.used) return { ok: false, error: `Hay ${res.used} usados; el máximo no puede bajar de eso` };

  await prisma.characterResource.update({ where: { id: res.id }, data: { max } });
  revalidatePath(`/campaigns/${res.template.campaignId}/templates`);
  return { ok: true };
}

/** Borra un recurso. DM. */
export async function deleteResource(resourceId: string): Promise<ResourceResult> {
  const res = await resourceWithTemplate(resourceId);
  if (!res) return { ok: false, error: "No autorizado" };

  const g = await guard(() => requireCampaignDmAction(res.template.campaignId));
  if (!g.ok) return g;

  await prisma.characterResource.delete({ where: { id: res.id } });
  revalidatePath(`/campaigns/${res.template.campaignId}/templates`);
  return { ok: true };
}
