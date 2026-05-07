"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { LogType } from "@prisma/client";

// ─── Internal types (not exported to client) ──────────────────────────────────

export type AcModifier = {
  source: string; // "Shield", "Shield of Faith", "Cover"
  value:  number;
};

type Condition = {
  name: string;   // "Prone", "Poisoned", "Stunned", etc.
};

// ─── HP: Deal damage ─────────────────────────────────────────────────────────
//
// Damage hits tempHp first. Once tempHp is 0, it comes off currentHp.
// If currentHp reaches 0, isConscious flips to false.
// We never let currentHp go below 0.

export async function dealDamage(formData: FormData) {
  const combatId     = formData.get("combatId")?.toString();
  const targetId     = formData.get("targetId")?.toString();
  const actorId      = formData.get("actorId")?.toString();
  const rawAmount    = Number(formData.get("amount"));

  if (!combatId || !targetId || !actorId)   throw new Error("Missing combatId or targetId");
  if (isNaN(rawAmount) || rawAmount < 1) throw new Error("Damage amount must be at least 1");

  const [target, actor, combat] = await Promise.all([
    prisma.combatParticipant.findUnique({ where: { id: targetId } }),
    prisma.combatParticipant.findUnique({ where: { id: actorId } }),
    prisma.combat.findUnique({ where: { id: combatId } }),
  ]);

  if (!target|| !actor || !combat) {
    throw new Error("Invalid data");
  }

  let amount    = rawAmount;
  let newTempHp = target.tempHp;
  let newHp     = target.currentHp;

  // 1. Absorb into tempHp first
  if (newTempHp > 0) {
    const absorbed = Math.min(newTempHp, amount);
    newTempHp -= absorbed;
    amount    -= absorbed;
  }

  // 2. Remaining damage comes off real HP
  if (amount > 0) {
    newHp = Math.max(0, newHp - amount);
  }

  const isConscious = newHp > 0;

  await prisma.$transaction([
    prisma.combatParticipant.update({
      where: { id: targetId },
      data:  { currentHp: newHp, tempHp: newTempHp, isConscious },
    }),
    prisma.combatLog.create({
      data: {
        combatId,
        round:    combat?.round ?? 0,
        type:     "DAMAGE",
        actorId:  actorId,
        targetId,
        amount:   rawAmount, // log the original amount, not the absorbed remainder
        note:     !isConscious ? `${target.displayName} fell unconscious` : null,
      },
    }),
  ]);

  revalidatePath(`/combat/${combatId}`);
}

// ─── HP: Heal ────────────────────────────────────────────────────────────────
//
// Healing never exceeds maxHp. Healing a 0-HP character restores consciousness.

export async function healParticipant(formData: FormData) {
  const combatId  = formData.get("combatId")?.toString();
  const targetId  = formData.get("targetId")?.toString();
  const actorId   = formData.get("actorId")?.toString() || null;
  const rawAmount = Number(formData.get("amount"));

  if (!combatId || !targetId)    throw new Error("Missing combatId or targetId");
  if (isNaN(rawAmount) || rawAmount < 1) throw new Error("Heal amount must be at least 1");

  const target = await prisma.combatParticipant.findUnique({
    where: { id: targetId },
  });
  if (!target) throw new Error("Target not found");

  const newHp       = Math.min(target.maxHp, target.currentHp + rawAmount);
  const isConscious = newHp > 0;

  const combat = await prisma.combat.findUnique({ where: { id: combatId } });

  await prisma.$transaction([
    prisma.combatParticipant.update({
      where: { id: targetId },
      data:  { currentHp: newHp, isConscious },
    }),
    prisma.combatLog.create({
      data: {
        combatId,
        round:    combat?.round ?? 0,
        type:     "HEAL",
        actorId:  actorId ?? null,
        targetId,
        amount:   rawAmount,
        note:     target.currentHp === 0 && newHp > 0
                    ? `${target.displayName} regained consciousness`
                    : null,
      },
    }),
  ]);

  revalidatePath(`/combat/${combatId}`);
}

// ─── HP: Set temporary HP ────────────────────────────────────────────────────
//
// Temp HP doesn't stack — you take the higher value, not both.
// Per D&D 2024 rules, this replaces rather than adds.

export async function setTempHp(formData: FormData) {
  const combatId  = formData.get("combatId")?.toString();
  const targetId  = formData.get("targetId")?.toString();
  const rawAmount = Number(formData.get("amount"));

  if (!combatId || !targetId) throw new Error("Missing combatId or targetId");
  if (isNaN(rawAmount) || rawAmount < 0) throw new Error("Temp HP must be 0 or greater");

  const target = await prisma.combatParticipant.findUnique({
    where: { id: targetId },
  });
  if (!target) throw new Error("Target not found");

  // Only update if new value is higher (per rules)
  const newTempHp = Math.max(target.tempHp, rawAmount);

  await prisma.combatParticipant.update({
    where: { id: targetId },
    data:  { tempHp: newTempHp },
  });

  revalidatePath(`/combat/${combatId}`);
}

// ─── Conditions ──────────────────────────────────────────────────────────────

export async function addCondition(formData: FormData) {
  const combatId     = formData.get("combatId")?.toString();
  const targetId     = formData.get("targetId")?.toString();
  const conditionName = formData.get("condition")?.toString().trim();

  if (!combatId || !targetId || !conditionName) {
    throw new Error("Missing required fields");
  }

  const target = await prisma.combatParticipant.findUnique({
    where: { id: targetId },
  });
  if (!target) throw new Error("Target not found");

  const current = target.conditions as Condition[];

  // Don't add duplicates
  if (current.some((c) => c.name.toLowerCase() === conditionName.toLowerCase())) {
    return; // already has this condition, silently skip
  }

  const updated: Condition[] = [...current, { name: conditionName }];
  const combat = await prisma.combat.findUnique({ where: { id: combatId } });

  await prisma.$transaction([
    prisma.combatParticipant.update({
      where: { id: targetId },
      data:  { conditions: updated },
    }),
    prisma.combatLog.create({
      data: {
        combatId,
        round:    combat?.round ?? 0,
        type:     "CONDITION_ADDED",
        targetId,
        note:     `${target.displayName} gained condition: ${conditionName}`,
      },
    }),
  ]);

  revalidatePath(`/combat/${combatId}`);
}

export async function removeCondition(formData: FormData) {
  const combatId      = formData.get("combatId")?.toString();
  const targetId      = formData.get("targetId")?.toString();
  const conditionName = formData.get("condition")?.toString();

  if (!combatId || !targetId || !conditionName) {
    throw new Error("Missing required fields");
  }

  const target = await prisma.combatParticipant.findUnique({
    where: { id: targetId },
  });
  if (!target) throw new Error("Target not found");

  const current  = target.conditions as Condition[];
  const updated  = current.filter(
    (c) => c.name.toLowerCase() !== conditionName.toLowerCase()
  );

  const combat = await prisma.combat.findUnique({ where: { id: combatId } });

  await prisma.$transaction([
    prisma.combatParticipant.update({
      where: { id: targetId },
      data:  { conditions: updated },
    }),
    prisma.combatLog.create({
      data: {
        combatId,
        round:    combat?.round ?? 0,
        type:     "CONDITION_REMOVED",
        targetId,
        note:     `${target.displayName} lost condition: ${conditionName}`,
      },
    }),
  ]);

  revalidatePath(`/combat/${combatId}`);
}

// ─── AC Modifiers ────────────────────────────────────────────────────────────

export async function addAcModifier(formData: FormData) {
  const combatId  = formData.get("combatId")?.toString();
  const targetId  = formData.get("targetId")?.toString();
  const source    = formData.get("source")?.toString().trim();
  const value     = Number(formData.get("value"));

  if (!combatId || !targetId || !source) throw new Error("Missing required fields");
  if (isNaN(value) || value === 0)       throw new Error("AC modifier value must be non-zero");

  const target = await prisma.combatParticipant.findUnique({
    where: { id: targetId },
  });
  if (!target) throw new Error("Target not found");

  const current = target.acModifiers as AcModifier[];
  const updated: AcModifier[] = [...current, { source, value }];

  await prisma.combatParticipant.update({
    where: { id: targetId },
    data:  { acModifiers: updated },
  });

  revalidatePath(`/combat/${combatId}`);
}

export async function removeAcModifier(formData: FormData) {
  const combatId = formData.get("combatId")?.toString();
  const targetId = formData.get("targetId")?.toString();
  const source   = formData.get("source")?.toString();

  if (!combatId || !targetId || !source) throw new Error("Missing required fields");

  const target = await prisma.combatParticipant.findUnique({
    where: { id: targetId },
  });
  if (!target) throw new Error("Target not found");

  const current = target.acModifiers as AcModifier[];
  // Remove first match with this source name
  const idx     = current.findIndex((m) => m.source === source);
  if (idx === -1) return;

  const updated = [...current.slice(0, idx), ...current.slice(idx + 1)];

  await prisma.combatParticipant.update({
    where: { id: targetId },
    data:  { acModifiers: updated },
  });

  revalidatePath(`/combat/${combatId}`);
}

export async function toggleActionState(formData: FormData) {
  const combatId = formData.get("combatId")?.toString();
  const targetId = formData.get("targetId")?.toString();
  const field    = formData.get("field")?.toString();

  if (!combatId || !targetId || !field) {
    throw new Error("Missing required fields");
  }

  if (!["actionUsed", "bonusUsed", "reactionUsed"].includes(field)) {
    throw new Error("Invalid field");
  }

  const target = await prisma.combatParticipant.findUnique({
    where: { id: targetId },
  });

  if (!target) throw new Error("Target not found");

  await prisma.combatParticipant.update({
    where: { id: targetId },
    data: {
      [field]: !target[field as keyof typeof target],
    },
  });

  revalidatePath(`/combat/${combatId}`);
}