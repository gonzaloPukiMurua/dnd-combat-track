"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── Return type ──────────────────────────────────────────────────────────────
// Every action returns this — never throws to the client.

type ActionResult = { ok: true } | { ok: false; error: string };

type AcModifier = { source: string; value: number };
type Condition  = { name: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fd(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

// ─── Deal damage ──────────────────────────────────────────────────────────────

export async function dealDamage(formData: FormData): Promise<ActionResult> {
  try {
    const combatId  = fd(formData, "combatId");
    const targetId  = fd(formData, "targetId");
    const actorId   = fd(formData, "actorId") || null;
    const rawAmount = Number(fd(formData, "amount"));

    if (!combatId || !targetId) return { ok: false, error: "Missing combatId or targetId" };
    if (isNaN(rawAmount) || rawAmount < 1) return { ok: false, error: "Amount must be at least 1" };

    const [target, combat] = await Promise.all([
      prisma.combatParticipant.findUnique({ where: { id: targetId } }),
      prisma.combat.findUnique({ where: { id: combatId } }),
    ]);

    if (!target) return { ok: false, error: "Target not found" };
    if (!combat) return { ok: false, error: "Combat not found" };

    let amount    = rawAmount;
    let newTempHp = target.tempHp;
    let newHp     = target.currentHp;

    if (newTempHp > 0) {
      const absorbed = Math.min(newTempHp, amount);
      newTempHp -= absorbed;
      amount    -= absorbed;
    }
    if (amount > 0) newHp = Math.max(0, newHp - amount);

    const isConscious = newHp > 0;

    await prisma.$transaction([
      prisma.combatParticipant.update({
        where: { id: targetId },
        data:  { currentHp: newHp, tempHp: newTempHp, isConscious },
      }),
      prisma.combatLog.create({
        data: {
          combatId,
          round:    combat.round,
          type:     "DAMAGE",
          actorId,
          targetId,
          amount:   rawAmount,
          note:     !isConscious ? `${target.displayName} fell unconscious` : null,
        },
      }),
    ]);

    return { ok: true };
  } catch (err) {
    console.error("[dealDamage]", err);
    return { ok: false, error: "Failed to apply damage. Please try again." };
  }
}

// ─── Heal ─────────────────────────────────────────────────────────────────────

export async function healParticipant(formData: FormData): Promise<ActionResult> {
  try {
    const combatId  = fd(formData, "combatId");
    const targetId  = fd(formData, "targetId");
    const actorId   = fd(formData, "actorId") || null;
    const rawAmount = Number(fd(formData, "amount"));

    if (!combatId || !targetId) return { ok: false, error: "Missing combatId or targetId" };
    if (isNaN(rawAmount) || rawAmount < 1) return { ok: false, error: "Amount must be at least 1" };

    const [target, combat] = await Promise.all([
      prisma.combatParticipant.findUnique({ where: { id: targetId } }),
      prisma.combat.findUnique({ where: { id: combatId } }),
    ]);

    if (!target) return { ok: false, error: "Target not found" };
    if (!combat) return { ok: false, error: "Combat not found" };

    const wasDown     = target.currentHp === 0;
    const newHp       = Math.min(target.maxHp, target.currentHp + rawAmount);
    const isConscious = newHp > 0;

    await prisma.$transaction([
      prisma.combatParticipant.update({
        where: { id: targetId },
        data:  { currentHp: newHp, isConscious },
      }),
      prisma.combatLog.create({
        data: {
          combatId,
          round:    combat.round,
          type:     "HEAL",
          actorId,
          targetId,
          amount:   rawAmount,
          note:     wasDown && newHp > 0
            ? `${target.displayName} regained consciousness`
            : null,
        },
      }),
    ]);

    return { ok: true };
  } catch (err) {
    console.error("[healParticipant]", err);
    return { ok: false, error: "Failed to apply heal. Please try again." };
  }
}

// ─── Set temp HP ──────────────────────────────────────────────────────────────

export async function setTempHp(formData: FormData): Promise<ActionResult> {
  try {
    const combatId  = fd(formData, "combatId");
    const targetId  = fd(formData, "targetId");
    const rawAmount = Number(fd(formData, "amount"));

    if (!combatId || !targetId) return { ok: false, error: "Missing required fields" };
    if (isNaN(rawAmount) || rawAmount < 0) return { ok: false, error: "Temp HP must be 0 or greater" };

    const target = await prisma.combatParticipant.findUnique({ where: { id: targetId } });
    if (!target) return { ok: false, error: "Target not found" };

    await prisma.combatParticipant.update({
      where: { id: targetId },
      data:  { tempHp: Math.max(target.tempHp, rawAmount) },
    });

    return { ok: true };
  } catch (err) {
    console.error("[setTempHp]", err);
    return { ok: false, error: "Failed to set temp HP. Please try again." };
  }
}

// ─── Add condition ────────────────────────────────────────────────────────────

export async function addCondition(formData: FormData): Promise<ActionResult> {
  try {
    const combatId      = fd(formData, "combatId");
    const targetId      = fd(formData, "targetId");
    const conditionName = fd(formData, "condition").trim();

    if (!combatId || !targetId || !conditionName) {
      return { ok: false, error: "Missing required fields" };
    }

    const [target, combat] = await Promise.all([
      prisma.combatParticipant.findUnique({ where: { id: targetId } }),
      prisma.combat.findUnique({ where: { id: combatId } }),
    ]);

    if (!target) return { ok: false, error: "Target not found" };
    if (!combat) return { ok: false, error: "Combat not found" };

    const current = target.conditions as Condition[];
    if (current.some((c) => c.name.toLowerCase() === conditionName.toLowerCase())) {
      return { ok: true }; // Already has it — not an error
    }

    await prisma.$transaction([
      prisma.combatParticipant.update({
        where: { id: targetId },
        data:  { conditions: [...current, { name: conditionName }] },
      }),
      prisma.combatLog.create({
        data: {
          combatId,
          round:    combat.round,
          type:     "CONDITION_ADDED",
          targetId,
          note:     `${target.displayName} gained condition: ${conditionName}`,
        },
      }),
    ]);

    return { ok: true };
  } catch (err) {
    console.error("[addCondition]", err);
    return { ok: false, error: "Failed to add condition. Please try again." };
  }
}

// ─── Remove condition ─────────────────────────────────────────────────────────

export async function removeCondition(formData: FormData): Promise<ActionResult> {
  try {
    const combatId      = fd(formData, "combatId");
    const targetId      = fd(formData, "targetId");
    const conditionName = fd(formData, "condition");

    if (!combatId || !targetId || !conditionName) {
      return { ok: false, error: "Missing required fields" };
    }

    const [target, combat] = await Promise.all([
      prisma.combatParticipant.findUnique({ where: { id: targetId } }),
      prisma.combat.findUnique({ where: { id: combatId } }),
    ]);

    if (!target) return { ok: false, error: "Target not found" };
    if (!combat) return { ok: false, error: "Combat not found" };

    const updated = (target.conditions as Condition[]).filter(
      (c) => c.name.toLowerCase() !== conditionName.toLowerCase()
    );

    await prisma.$transaction([
      prisma.combatParticipant.update({
        where: { id: targetId },
        data:  { conditions: updated },
      }),
      prisma.combatLog.create({
        data: {
          combatId,
          round:    combat.round,
          type:     "CONDITION_REMOVED",
          targetId,
          note:     `${target.displayName} lost condition: ${conditionName}`,
        },
      }),
    ]);

    return { ok: true };
  } catch (err) {
    console.error("[removeCondition]", err);
    return { ok: false, error: "Failed to remove condition. Please try again." };
  }
}

// ─── Add AC modifier ──────────────────────────────────────────────────────────

export async function addAcModifier(formData: FormData): Promise<ActionResult> {
  try {
    const combatId = fd(formData, "combatId");
    const targetId = fd(formData, "targetId");
    const source   = fd(formData, "source").trim();
    const value    = Number(fd(formData, "value"));

    if (!combatId || !targetId || !source) return { ok: false, error: "Missing required fields" };
    if (isNaN(value) || value === 0) return { ok: false, error: "AC modifier value must be non-zero" };

    const target = await prisma.combatParticipant.findUnique({ where: { id: targetId } });
    if (!target) return { ok: false, error: "Target not found" };

    await prisma.combatParticipant.update({
      where: { id: targetId },
      data:  {
        acModifiers: [...(target.acModifiers as AcModifier[]), { source, value }],
      },
    });

    return { ok: true };
  } catch (err) {
    console.error("[addAcModifier]", err);
    return { ok: false, error: "Failed to add AC modifier. Please try again." };
  }
}

// ─── Remove AC modifier ───────────────────────────────────────────────────────

export async function removeAcModifier(formData: FormData): Promise<ActionResult> {
  try {
    const combatId = fd(formData, "combatId");
    const targetId = fd(formData, "targetId");
    const source   = fd(formData, "source");

    if (!combatId || !targetId || !source) return { ok: false, error: "Missing required fields" };

    const target = await prisma.combatParticipant.findUnique({ where: { id: targetId } });
    if (!target) return { ok: false, error: "Target not found" };

    const current = target.acModifiers as AcModifier[];
    const idx     = current.findIndex((m) => m.source === source);
    if (idx === -1) return { ok: true };

    await prisma.combatParticipant.update({
      where: { id: targetId },
      data:  {
        acModifiers: [...current.slice(0, idx), ...current.slice(idx + 1)],
      },
    });

    return { ok: true };
  } catch (err) {
    console.error("[removeAcModifier]", err);
    return { ok: false, error: "Failed to remove AC modifier. Please try again." };
  }
}

// ─── Toggle action/bonus/reaction ─────────────────────────────────────────────

export async function toggleActionState(formData: FormData): Promise<ActionResult> {
  try {
    const combatId = fd(formData, "combatId");
    const targetId = fd(formData, "targetId");
    const field    = fd(formData, "field");

    if (!combatId || !targetId || !field) return { ok: false, error: "Missing required fields" };
    if (!["actionUsed", "bonusUsed", "reactionUsed"].includes(field)) {
      return { ok: false, error: "Invalid field" };
    }

    const target = await prisma.combatParticipant.findUnique({ where: { id: targetId } });
    if (!target) return { ok: false, error: "Target not found" };

    await prisma.combatParticipant.update({
      where: { id: targetId },
      data:  { [field]: !target[field as keyof typeof target] },
    });

    return { ok: true };
  } catch (err) {
    console.error("[toggleActionState]", err);
    return { ok: false, error: "Failed to toggle action. Please try again." };
  }
}

// ─── Record death save ────────────────────────────────────────────────────────

export async function recordDeathSave(formData: FormData): Promise<ActionResult> {
  try {
    const combatId = fd(formData, "combatId");
    const targetId = fd(formData, "targetId");
    const result   = fd(formData, "result");

    if (!combatId || !targetId || !result) return { ok: false, error: "Missing required fields" };
    if (result !== "success" && result !== "failure") return { ok: false, error: "Invalid result" };

    const [target, combat] = await Promise.all([
      prisma.combatParticipant.findUnique({ where: { id: targetId } }),
      prisma.combat.findUnique({ where: { id: combatId } }),
    ]);

    if (!target) return { ok: false, error: "Target not found" };
    if (!combat) return { ok: false, error: "Combat not found" };
    if (target.isConscious || target.isStabilized) return { ok: true };

    let { deathSaveSuccesses, deathSaveFailures } = target;
    let isStabilized = target.isStabilized as boolean;
    let note = "";

    if (result === "success") {
      deathSaveSuccesses = Math.min(3, deathSaveSuccesses + 1);
      isStabilized = deathSaveSuccesses >= 3;
      note = isStabilized
        ? `${target.displayName} is stabilized`
        : `${target.displayName} death save success (${deathSaveSuccesses}/3)`;
    } else {
      deathSaveFailures = Math.min(3, deathSaveFailures + 1);
      note = deathSaveFailures >= 3
        ? `${target.displayName} has died (3 failed death saves)`
        : `${target.displayName} death save failure (${deathSaveFailures}/3)`;
    }

    await prisma.$transaction([
      prisma.combatParticipant.update({
        where: { id: targetId },
        data:  { deathSaveSuccesses, deathSaveFailures, isStabilized },
      }),
      prisma.combatLog.create({
        data: { combatId, round: combat.round, type: "NOTE", targetId, note },
      }),
    ]);

    return { ok: true };
  } catch (err) {
    console.error("[recordDeathSave]", err);
    return { ok: false, error: "Failed to record death save. Please try again." };
  }
}

// ─── Reset death saves ────────────────────────────────────────────────────────

export async function resetDeathSaves(formData: FormData): Promise<ActionResult> {
  try {
    const targetId = fd(formData, "targetId");
    if (!targetId) return { ok: false, error: "Missing targetId" };

    await prisma.combatParticipant.update({
      where: { id: targetId },
      data:  { deathSaveSuccesses: 0, deathSaveFailures: 0, isStabilized: false },
    });

    return { ok: true };
  } catch (err) {
    console.error("[resetDeathSaves]", err);
    return { ok: false, error: "Failed to reset death saves. Please try again." };
  }
}

// ─── Advance turn ─────────────────────────────────────────────────────────────
// Note: revalidatePath IS kept here because turn advancement
// must be reflected in any full page reload or navigation.

/*export async function advanceTurn(combatId: string): Promise<ActionResult> {
  try {
    const combat = await prisma.combat.findUnique({
      where:   { id: combatId },
      include: {
        participants: {
          where:   { isConscious: true },
          orderBy: { turnOrder: "asc" },
        },
      },
    });

    if (!combat)                    return { ok: false, error: "Combat not found" };
    if (combat.status !== "ACTIVE") return { ok: false, error: "Combat is not active" };

    const conscious = combat.participants;
    if (conscious.length === 0) return { ok: true };

    let nextIndex = combat.currentTurnIndex + 1;
    let nextRound = combat.round;

    if (nextIndex >= conscious.length) {
      nextIndex = 0;
      nextRound += 1;
    }

    // Reset all action trackers for every participant on turn advance
    await prisma.$transaction([
      prisma.combat.update({
        where: { id: combatId },
        data:  { currentTurnIndex: nextIndex, round: nextRound },
      }),
      ...combat.participants.map((p) =>
        prisma.combatParticipant.update({
          where: { id: p.id },
          data:  { actionUsed: false, bonusUsed: false, reactionUsed: false },
        })
      ),
    ]);

    revalidatePath(`/combat/${combatId}`);
    return { ok: true };
  } catch (err) {
    console.error("[advanceTurn]", err);
    return { ok: false, error: "Failed to advance turn. Please try again." };
  }
}*/
