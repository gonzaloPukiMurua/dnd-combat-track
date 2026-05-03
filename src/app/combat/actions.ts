"use server";

import { prisma } from "@/lib/prisma";

export async function getTemplates() {
  return prisma.characterTemplate.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getCurrentCombat() {
  const state = await prisma.appState.findFirst();

  if (!state?.currentCombatId) return null;

  return prisma.combat.findUnique({
    where: { id: state.currentCombatId },
    include: {
      participants: {
        orderBy: { turnOrder: "asc" },
      },
    },
  });
}

export async function createCombat(formData: FormData) {
  const name = String(formData.get("name") || "Combat");

  const selectedIds = formData
    .getAll("templates")
    .map((id) => String(id));

  if (selectedIds.length === 0) {
    throw new Error("Select at least one participant");
  }

  const templates = await prisma.characterTemplate.findMany({
    where: {
      id: { in: selectedIds },
    },
  });

  // Create combat
  const combat = await prisma.combat.create({
    data: {
      name,
    },
  });

  // Create participants
  const participantsData = templates.map((t, index) => ({
    combatId: combat.id,
    templateId: t.id,
    nameOverride: t.name,

    currentHp: t.maxHp,
    tempHp: 0,

    baseAc: t.baseAc,
    acModifiers: [],

    initiative: Math.floor(Math.random() * 20) + t.initiativeBonus,
    turnOrder: index,

    conditions: [],
  }));

  await prisma.combatParticipant.createMany({
    data: participantsData,
  });

  // Save as current combat
  await prisma.appState.upsert({
    where: { id: 1 },
    update: { currentCombatId: combat.id },
    create: { id: 1, currentCombatId: combat.id },
  });

  return combat.id;
}