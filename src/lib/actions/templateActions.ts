"use server";

import { revalidatePath } from "next/cache";
import { Prisma, ActionKind, ActionEconomy } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCampaignDmAction, UnauthorizedError } from "@/lib/auth/action-guards";
import { rollFormula } from "@/domain/dice/roll";

// E — CRUD for TemplateAction rows owned by a CharacterTemplate
// (spec-tecnico-etapa-3-acciones-tiradas.md §6). MonsterTemplate actions are
// seed-only and deliberately have no UI / no action here.
//
// DM-only, same pattern as templates.ts: resolve the campaign that owns the
// character (directly for create, via the existing action for update/delete)
// and run it through requireCampaignDmAction. The guard throws; every export
// here answers with { ok, error } instead, so the throw is adapted.

export type TemplateActionInput = {
  name: string;
  kind: string; // narrowed to ActionKind by validate()
  attackBonus?: number | null;
  formula: string;
  damageType?: string | null;
  uses?: number | null;
  economyType?: string; // narrowed to ActionEconomy by validate()
};

export type TemplateActionResult = { ok: boolean; error?: string };

type ValidatedAction = {
  name: string;
  kind: ActionKind;
  attackBonus: number | null;
  formula: string;
  damageType: string | null;
  uses: number;
  economyType: ActionEconomy;
};

function validate(input: TemplateActionInput): { data: ValidatedAction } | { error: string } {
  const name = input.name?.trim();
  if (!name) return { error: "El nombre es obligatorio" };

  if (input.kind !== "ATTACK" && input.kind !== "HEAL") {
    return { error: "El tipo de acción debe ser ATTACK o HEAL" };
  }
  const kind = input.kind as ActionKind;

  // economyType: same criterion as kind — must be one of the enum's own
  // values (§4b). Defaults to ACTION when omitted, same default as the
  // migration gave already-seeded rows.
  const economyTypeRaw = input.economyType ?? "ACTION";
  if (
    economyTypeRaw !== "ACTION" &&
    economyTypeRaw !== "BONUS_ACTION" &&
    economyTypeRaw !== "REACTION"
  ) {
    return { error: "La economía de acción debe ser ACTION, BONUS_ACTION o REACTION" };
  }
  const economyType = economyTypeRaw as ActionEconomy;

  // attackBonus: required for ATTACK, forced null for HEAL (§2).
  let attackBonus: number | null = null;
  if (kind === "ATTACK") {
    if (input.attackBonus == null || !Number.isInteger(input.attackBonus)) {
      return { error: "El bonificador de ataque es obligatorio y debe ser un entero" };
    }
    attackBonus = input.attackBonus;
  }

  // uses: whole number >= 1, default 1 (§7b — multiattack).
  const uses = input.uses == null ? 1 : input.uses;
  if (!Number.isInteger(uses) || uses < 1) {
    return { error: "«Usos» debe ser un entero mayor o igual a 1" };
  }

  const formula = input.formula?.trim();
  if (!formula) return { error: "La fórmula es obligatoria" };
  try {
    // We don't need the roll — just that the notation parses (domain/dice §3).
    rollFormula(formula);
  } catch {
    return {
      error: 'Notación de dados inválida. Formato esperado: NdM o NdM±K (ej. "1d8", "2d6+3", "1d4-1").',
    };
  }

  const damageType = input.damageType?.trim() || null;

  return { data: { name, kind, attackBonus, formula, damageType, uses, economyType } };
}

function isDuplicateName(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  );
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createTemplateAction(
  characterTemplateId: string,
  input: TemplateActionInput
): Promise<TemplateActionResult> {
  try {
    const template = await prisma.characterTemplate.findUnique({
      where: { id: characterTemplateId },
      select: { campaignId: true },
    });
    if (!template) return { ok: false, error: "Personaje no encontrado" };

    await requireCampaignDmAction(template.campaignId);

    const v = validate(input);
    if ("error" in v) return { ok: false, error: v.error };

    // New rows go to the end of the list (§2 — `order` is display order).
    const count = await prisma.templateAction.count({ where: { characterTemplateId } });

    await prisma.templateAction.create({
      data: { characterTemplateId, order: count, ...v.data },
    });

    revalidatePath(`/campaigns/${template.campaignId}/templates/${characterTemplateId}/edit`);
    return { ok: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { ok: false, error: err.message };
    if (isDuplicateName(err)) {
      return { ok: false, error: "Este personaje ya tiene una acción con ese nombre" };
    }
    console.error("[createTemplateAction]", err);
    return { ok: false, error: "No se pudo crear la acción" };
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateTemplateAction(
  actionId: string,
  input: TemplateActionInput
): Promise<TemplateActionResult> {
  try {
    const existing = await prisma.templateAction.findUnique({
      where: { id: actionId },
      select: {
        characterTemplateId: true,
        characterTemplate: { select: { campaignId: true } },
      },
    });
    // No characterTemplate → either not found or a monster action (no UI path).
    if (!existing?.characterTemplateId || !existing.characterTemplate) {
      return { ok: false, error: "Acción no encontrada" };
    }

    await requireCampaignDmAction(existing.characterTemplate.campaignId);

    const v = validate(input);
    if ("error" in v) return { ok: false, error: v.error };

    await prisma.templateAction.update({
      where: { id: actionId },
      data: v.data,
    });

    revalidatePath(
      `/campaigns/${existing.characterTemplate.campaignId}/templates/${existing.characterTemplateId}/edit`
    );
    return { ok: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { ok: false, error: err.message };
    if (isDuplicateName(err)) {
      return { ok: false, error: "Este personaje ya tiene una acción con ese nombre" };
    }
    console.error("[updateTemplateAction]", err);
    return { ok: false, error: "No se pudo guardar la acción" };
  }
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteTemplateAction(actionId: string): Promise<TemplateActionResult> {
  try {
    const existing = await prisma.templateAction.findUnique({
      where: { id: actionId },
      select: {
        characterTemplateId: true,
        characterTemplate: { select: { campaignId: true } },
      },
    });
    if (!existing?.characterTemplateId || !existing.characterTemplate) {
      return { ok: false, error: "Acción no encontrada" };
    }

    await requireCampaignDmAction(existing.characterTemplate.campaignId);

    await prisma.templateAction.delete({ where: { id: actionId } });

    revalidatePath(
      `/campaigns/${existing.characterTemplate.campaignId}/templates/${existing.characterTemplateId}/edit`
    );
    return { ok: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { ok: false, error: err.message };
    console.error("[deleteTemplateAction]", err);
    return { ok: false, error: "No se pudo borrar la acción" };
  }
}
