"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type AcModifier = { source: string; value: number };
type Condition        = { name: string };

export async function dealDamage(formData: FormData) {
  const combatId  = formData.get("combatId")?.toString();
  const targetId  = formData.get("targetId")?.toString();
  const actorId   = formData.get("actorId")?.toString() || null;
  const rawAmount = Number(formData.get("amount"));

  if (!combatId || !targetId) throw new Error("Missing combatId or targetId");
  if (isNaN(rawAmount) || rawAmount < 1) throw new Error("Damage amount must be at least 1");

  const [target, combat] = await Promise.all([
    prisma.combatParticipant.findUnique({ where: { id: targetId } }),
    prisma.combat.findUnique({ where: { id: combatId } }),
  ]);
  if (!target || !combat) throw new Error("Invalid data");

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
        combatId, round: combat.round, type: "DAMAGE",
        actorId, targetId, amount: rawAmount,
        note: !isConscious ? `${target.displayName} fell unconscious` : null,
      },
    }),
  ]);

  revalidatePath(`/combat/${combatId}`);
}

export async function healParticipant(formData: FormData) {
  const combatId  = formData.get("combatId")?.toString();
  const targetId  = formData.get("targetId")?.toString();
  const actorId   = formData.get("actorId")?.toString() || null;
  const rawAmount = Number(formData.get("amount"));

  if (!combatId || !targetId) throw new Error("Missing combatId or targetId");
  if (isNaN(rawAmount) || rawAmount < 1) throw new Error("Heal amount must be at least 1");

  const [target, combat] = await Promise.all([
    prisma.combatParticipant.findUnique({ where: { id: targetId } }),
    prisma.combat.findUnique({ where: { id: combatId } }),
  ]);
  if (!target || !combat) throw new Error("Invalid data");

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
        combatId, round: combat.round, type: "HEAL",
        actorId, targetId, amount: rawAmount,
        note: wasDown && newHp > 0 ? `${target.displayName} regained consciousness` : null,
      },
    }),
  ]);

  revalidatePath(`/combat/${combatId}`);
}

export async function setTempHp(formData: FormData) {
  const combatId  = formData.get("combatId")?.toString();
  const targetId  = formData.get("targetId")?.toString();
  const rawAmount = Number(formData.get("amount"));

  if (!combatId || !targetId) throw new Error("Missing combatId or targetId");
  if (isNaN(rawAmount) || rawAmount < 0) throw new Error("Temp HP must be 0 or greater");

  const target = await prisma.combatParticipant.findUnique({ where: { id: targetId } });
  if (!target) throw new Error("Target not found");

  await prisma.combatParticipant.update({
    where: { id: targetId },
    data:  { tempHp: Math.max(target.tempHp, rawAmount) },
  });

  revalidatePath(`/combat/${combatId}`);
}

export async function addCondition(formData: FormData) {
  const combatId      = formData.get("combatId")?.toString();
  const targetId      = formData.get("targetId")?.toString();
  const conditionName = formData.get("condition")?.toString().trim();

  if (!combatId || !targetId || !conditionName) throw new Error("Missing required fields");

  const [target, combat] = await Promise.all([
    prisma.combatParticipant.findUnique({ where: { id: targetId } }),
    prisma.combat.findUnique({ where: { id: combatId } }),
  ]);
  if (!target || !combat) throw new Error("Invalid data");

  const current = target.conditions as Condition[];
  if (current.some((c) => c.name.toLowerCase() === conditionName.toLowerCase())) return;

  await prisma.$transaction([
    prisma.combatParticipant.update({
      where: { id: targetId },
      data:  { conditions: [...current, { name: conditionName }] },
    }),
    prisma.combatLog.create({
      data: {
        combatId, round: combat.round, type: "CONDITION_ADDED", targetId,
        note: `${target.displayName} gained condition: ${conditionName}`,
      },
    }),
  ]);

  revalidatePath(`/combat/${combatId}`);
}

export async function removeCondition(formData: FormData) {
  const combatId      = formData.get("combatId")?.toString();
  const targetId      = formData.get("targetId")?.toString();
  const conditionName = formData.get("condition")?.toString();

  if (!combatId || !targetId || !conditionName) throw new Error("Missing required fields");

  const [target, combat] = await Promise.all([
    prisma.combatParticipant.findUnique({ where: { id: targetId } }),
    prisma.combat.findUnique({ where: { id: combatId } }),
  ]);
  if (!target || !combat) throw new Error("Invalid data");

  const updated = (target.conditions as Condition[]).filter(
    (c) => c.name.toLowerCase() !== conditionName.toLowerCase()
  );

  await prisma.$transaction([
    prisma.combatParticipant.update({ where: { id: targetId }, data: { conditions: updated } }),
    prisma.combatLog.create({
      data: {
        combatId, round: combat.round, type: "CONDITION_REMOVED", targetId,
        note: `${target.displayName} lost condition: ${conditionName}`,
      },
    }),
  ]);

  revalidatePath(`/combat/${combatId}`);
}

export async function addAcModifier(formData: FormData) {
  const combatId = formData.get("combatId")?.toString();
  const targetId = formData.get("targetId")?.toString();
  const source   = formData.get("source")?.toString().trim();
  const value    = Number(formData.get("value"));

  if (!combatId || !targetId || !source) throw new Error("Missing required fields");
  if (isNaN(value) || value === 0) throw new Error("AC modifier value must be non-zero");

  const target = await prisma.combatParticipant.findUnique({ where: { id: targetId } });
  if (!target) throw new Error("Target not found");

  await prisma.combatParticipant.update({
    where: { id: targetId },
    data:  { acModifiers: [...(target.acModifiers as AcModifier[]), { source, value }] },
  });

  revalidatePath(`/combat/${combatId}`);
}

export async function removeAcModifier(formData: FormData) {
  const combatId = formData.get("combatId")?.toString();
  const targetId = formData.get("targetId")?.toString();
  const source   = formData.get("source")?.toString();

  if (!combatId || !targetId || !source) throw new Error("Missing required fields");

  const target = await prisma.combatParticipant.findUnique({ where: { id: targetId } });
  if (!target) throw new Error("Target not found");

  const current = target.acModifiers as AcModifier[];
  const idx     = current.findIndex((m) => m.source === source);
  if (idx === -1) return;

  await prisma.combatParticipant.update({
    where: { id: targetId },
    data:  { acModifiers: [...current.slice(0, idx), ...current.slice(idx + 1)] },
  });

  revalidatePath(`/combat/${combatId}`);
}

export async function toggleActionState(formData: FormData) {
  const combatId = formData.get("combatId")?.toString();
  const targetId = formData.get("targetId")?.toString();
  const field    = formData.get("field")?.toString();

  if (!combatId || !targetId || !field) throw new Error("Missing required fields");
  if (!["actionUsed", "bonusUsed", "reactionUsed"].includes(field)) throw new Error("Invalid field");

  const target = await prisma.combatParticipant.findUnique({ where: { id: targetId } });
  if (!target) throw new Error("Target not found");

  await prisma.combatParticipant.update({
    where: { id: targetId },
    data:  { [field]: !target[field as keyof typeof target] },
  });

  revalidatePath(`/combat/${combatId}`);
}

export async function recordDeathSave(formData: FormData) {
  const combatId = formData.get("combatId")?.toString();
  const targetId = formData.get("targetId")?.toString();
  const result   = formData.get("result")?.toString(); // "success" | "failure"

  if (!combatId || !targetId || !result) throw new Error("Missing required fields");
  if (result !== "success" && result !== "failure") throw new Error("Invalid result");

  const [target, combat] = await Promise.all([
    prisma.combatParticipant.findUnique({ where: { id: targetId } }),
    prisma.combat.findUnique({ where: { id: combatId } }),
  ]);

  if (!target || !combat) throw new Error("Invalid data");

  // Can't roll death saves if conscious or already stabilized
  if (target.isConscious || target.isStabilized) return;

  let deathSaveSuccesses = target.deathSaveSuccesses;
  let deathSaveFailures  = target.deathSaveFailures;
  let isStabilized       = target.isStabilized as boolean;
  let note = "";

  if (result === "success") {
    deathSaveSuccesses = Math.min(3, deathSaveSuccesses + 1);

    if (deathSaveSuccesses >= 3) {
      // 3 successes → stabilized
      isStabilized = true;
      note = `${target.displayName} is stabilized`;
    } else {
      note = `${target.displayName} death save success (${deathSaveSuccesses}/3)`;
    }
  } else {
    deathSaveFailures = Math.min(3, deathSaveFailures + 1);

    if (deathSaveFailures >= 3) {
      // 3 failures → dead (we mark with a note, DM confirms)
      note = `${target.displayName} has died (3 failed death saves)`;
    } else {
      note = `${target.displayName} death save failure (${deathSaveFailures}/3)`;
    }
  }

  await prisma.$transaction([
    prisma.combatParticipant.update({
      where: { id: targetId },
      data:  { deathSaveSuccesses, deathSaveFailures, isStabilized },
    }),
    prisma.combatLog.create({
      data: {
        combatId,
        round:    combat.round,
        type:     "NOTE",
        targetId,
        note,
      },
    }),
  ]);

  revalidatePath(`/combat/${combatId}`);
}

export async function resetDeathSaves(formData: FormData) {
  const combatId = formData.get("combatId")?.toString();
  const targetId = formData.get("targetId")?.toString();

  if (!combatId || !targetId) throw new Error("Missing required fields");

  await prisma.combatParticipant.update({
    where: { id: targetId },
    data:  {
      deathSaveSuccesses: 0,
      deathSaveFailures:  0,
      isStabilized:       false,
    },
  });

  revalidatePath(`/combat/${combatId}`);
}