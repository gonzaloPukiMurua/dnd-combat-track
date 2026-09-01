"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTemplateOwner, UnauthorizedError } from "@/lib/auth/action-guards";
import { MAX_NOTES_LENGTH } from "@/lib/constants/character";

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
