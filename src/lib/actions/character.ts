"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTemplateOwner, UnauthorizedError } from "@/lib/auth/action-guards";
import { MAX_NOTES_LENGTH } from "@/lib/constants/character";
import { validatePlayerDetails } from "@/domain/character/details";
import { hitDiceHeal } from "@/domain/character/progression";
import { abilityModifier } from "@/domain/character/rules";

export type CharacterNotesState = { error?: string; success?: boolean };

// S2-6 — the one field a player can edit on their own CharacterTemplate from
// /campaigns/[id]/character. Everything else on the sheet is DM-only via
// /campaigns/[id]/templates/[templateId]/edit (D13). Direct Prisma + the
// owner guard from action-guards.ts (S2-0 family) — not the thin-action +
// REST route pattern S2-3/S2-7 use for campaign/profile edits.
export async function updateCharacterNotes(
  templateId: string,
  notes: string
): Promise<CharacterNotesState> {
  try {
    const { campaignId } = await requireTemplateOwner(templateId);

    if (notes.length > MAX_NOTES_LENGTH) {
      return { error: `Las notas no pueden superar los ${MAX_NOTES_LENGTH} caracteres.` };
    }

    await prisma.characterTemplate.update({
      where: { id: templateId },
      // Keep the player's own formatting; only collapse a blank field to null.
      data:  { notes: notes.trim() === "" ? null : notes },
    });

    revalidatePath(`/campaigns/${campaignId}/character`);
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: err.message };
    console.error("[updateCharacterNotes]", err);
    return { error: "No se pudieron guardar las notas. Probá de nuevo." };
  }
}

// ─── A2 / D-17 — datos que edita el jugador ──────────────────────────────────

export type CharacterDetailsState = { error?: string; success?: boolean };

/**
 * Datos físicos, historia breve y plata. Solo el dueño del personaje (D-17):
 * lo mecánico (clase, armadura, rasgos, stats) sigue siendo del DM.
 */
export async function updateCharacterDetails(
  templateId: string,
  input: Record<string, unknown>
): Promise<CharacterDetailsState> {
  try {
    const { campaignId } = await requireTemplateOwner(templateId);

    const parsed = validatePlayerDetails(input);
    if (!parsed.ok) return { error: parsed.error };

    await prisma.characterTemplate.update({ where: { id: templateId }, data: parsed.data });

    revalidatePath(`/campaigns/${campaignId}/character`);
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: err.message };
    console.error("[updateCharacterDetails]", err);
    return { error: "No se pudieron guardar los datos. Probá de nuevo." };
  }
}

// ─── A3 / H16 — gastar dados de golpe ────────────────────────────────────────

export type SpendHitDiceState = { error?: string; success?: boolean; currentHp?: number };

/**
 * El jugador gasta dados de golpe y escribe lo que sacó, ya con el mod. de CON
 * (D-14). Solo el dueño del personaje. No exige que haya un descanso corto
 * "abierto": la app no modela la sesión de descanso; la mesa lo controla.
 */
export async function spendHitDice(
  templateId: string,
  count: number,
  rolledTotal: number
): Promise<SpendHitDiceState> {
  try {
    const { campaignId } = await requireTemplateOwner(templateId);

    const t = await prisma.characterTemplate.findUniqueOrThrow({
      where:  { id: templateId },
      select: { characterClass: true, level: true, hitDiceUsed: true, con: true, maxHp: true, currentHp: true },
    });

    const result = hitDiceHeal({
      characterClass: t.characterClass,
      level:          t.level,
      hitDiceUsed:    t.hitDiceUsed,
      count,
      rolledTotal,
      conModifier:    abilityModifier(t.con),
      maxHp:          t.maxHp,
      currentHp:      t.currentHp,
    });
    if (!result.ok) return { error: result.error };

    // Escritura condicionada a que nadie haya gastado dados entre la lectura y
    // ahora (dos clics seguidos): si cambió, no se escribe y se pide reintentar.
    const { count: updated } = await prisma.characterTemplate.updateMany({
      where: { id: templateId, hitDiceUsed: t.hitDiceUsed },
      data:  { hitDiceUsed: result.hitDiceUsed, currentHp: result.currentHp },
    });
    if (updated === 0) return { error: "Los dados cambiaron mientras guardabas. Probá de nuevo." };

    revalidatePath(`/campaigns/${campaignId}/character`);
    return { success: true, currentHp: result.currentHp };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: err.message };
    console.error("[spendHitDice]", err);
    return { error: "No se pudieron gastar los dados. Probá de nuevo." };
  }
}
