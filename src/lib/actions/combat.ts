"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

// ─── Queries ─────────────────────────────────────────────────────────────────

// Returns the single SETUP or ACTIVE combat, or null.
// We enforce one combat at a time at the query level.
export async function getActiveCombat() {
  return prisma.combat.findFirst({
    where: { status: { in: ["SETUP", "ACTIVE"] } },
    include: {
      participants: {
        orderBy: { turnOrder: "asc" },
        include: { template: true },
      },
      logs: {
        orderBy: { createdAt: "asc" },
        include: {
          actor:  true,
          target: true,
        },
      },
    },
  });
}

export async function getCombatById(id: string) {
  return prisma.combat.findUnique({
    where: { id },
    include: {
      participants: {
        orderBy: { turnOrder: "asc" },
        include: { template: true },
      },
      logs: {
        orderBy: { createdAt: "asc" },
        include: { actor: true, target: true },
      },
    },
  });
}

// ─── Create combat ───────────────────────────────────────────────────────────

export async function createCombat(formData: FormData) {
  const name = formData.get("name")?.toString().trim() || "New Combat";

  // Enforce one combat at a time
  const existing = await prisma.combat.findFirst({
    where: { status: { in: ["SETUP", "ACTIVE"] } },
  });
  if (existing) {
    throw new Error("A combat is already in progress. End it before starting a new one.");
  }

  const combat = await prisma.combat.create({
    data: { name, status: "SETUP", round: 0, currentTurnIndex: 0 },
  });

  redirect(`/combat/${combat.id}/setup`);
}

// ─── Add participant to a SETUP combat ───────────────────────────────────────

export async function addParticipant(formData: FormData) {
  const combatId   = formData.get("combatId")?.toString();
  const templateId = formData.get("templateId")?.toString();
  const quantity   = Number(formData.get("quantity") ?? 1);

  if (!combatId || !templateId) throw new Error("Missing combatId or templateId");

  const [combat, template] = await Promise.all([
    prisma.combat.findUnique({ where: { id: combatId } }),
    prisma.characterTemplate.findUnique({ where: { id: templateId } }),
  ]);

  if (!combat)    throw new Error("Combat not found");
  if (!template)  throw new Error("Template not found");
  if (combat.status !== "SETUP") throw new Error("Cannot add participants after combat has started");

  // Count existing participants with this template to generate correct suffix
  const existing = await prisma.combatParticipant.count({
    where: { combatId, templateId },
  });

  // Create one participant per quantity
  const data = Array.from({ length: quantity }, (_, i) => {
    const suffix = quantity > 1 || existing > 0
      ? ` #${existing + i + 1}`
      : "";
    return {
      combatId,
      templateId,
      displayName: `${template.name}${suffix}`,
      maxHp:       template.maxHp,
      currentHp:   template.currentHp ?? template.maxHp,
      tempHp:      0,
      baseAc:      template.baseAc,
      initiative:  0,
      turnOrder:   0,
      acModifiers: [],
      conditions:  [],
      isConscious: true,
    };
  });

  await prisma.combatParticipant.createMany({ data });

  revalidatePath(`/combat/${combatId}/setup`);
}

// ─── Remove participant from SETUP combat ────────────────────────────────────

export async function removeParticipant(participantId: string, combatId: string) {
  const combat = await prisma.combat.findUnique({ where: { id: combatId } });
  if (combat?.status !== "SETUP") throw new Error("Cannot remove participants after combat has started");

  await prisma.combatParticipant.delete({ where: { id: participantId } });

  revalidatePath(`/combat/${combatId}/setup`);
}

// ─── Roll initiative and start combat ────────────────────────────────────────
//
// Accepts a map of { participantId → dieRoll } from the form.
// We add the template's initiativeBonus server-side so it can't be tampered with.
// Then we sort, assign turnOrder, and flip status to ACTIVE.

export async function startCombat(formData: FormData) {
  const combatId = formData.get("combatId")?.toString();
  if (!combatId) throw new Error("Missing combatId");

  const combat = await prisma.combat.findUnique({
    where: { id: combatId },
    include: {
      participants: { include: { template: true } },
    },
  });

  if (!combat)                    throw new Error("Combat not found");
  if (combat.status !== "SETUP")  throw new Error("Combat has already started");
  if (combat.participants.length === 0) throw new Error("Add at least one participant before starting");

  // Read each die roll from formData — field names are "roll_<participantId>"
  const withInitiative = combat.participants.map((p) => {
    const dieRoll = Number(formData.get(`roll_${p.id}`) ?? 0);
    const initiative = dieRoll + p.template.initiativeBonus;
    return { participant: p, dieRoll, initiative };
  });

  // Sort descending by initiative; ties broken by initiativeBonus (higher bonus wins)
  withInitiative.sort((a, b) => {
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    return b.participant.template.initiativeBonus - a.participant.template.initiativeBonus;
  });

  // Persist initiative values and turn order in a transaction
  await prisma.$transaction([
    // Update each participant
    ...withInitiative.map(({ participant, initiative }, index) =>
      prisma.combatParticipant.update({
        where: { id: participant.id },
        data:  { initiative, turnOrder: index },
      })
    ),
    // Flip combat to ACTIVE, start at round 1, first participant's turn
    prisma.combat.update({
      where: { id: combatId },
      data:  { status: "ACTIVE", round: 1, currentTurnIndex: 0 },
    }),
  ]);

  redirect(`/combat/${combatId}`);
}

// ─── Advance to next turn ────────────────────────────────────────────────────

export async function advanceTurn(combatId: string) {
  try {
    const combat = await prisma.combat.findUnique({
      where: { id: combatId },
      include: {
        participants: {
          // Keep unconscious participants in initiative
          where: {
            deathSaveFailures: {
              lt: 3,
            },
          },
          orderBy: {
            turnOrder: "asc",
          },
        },
      },
    });

    if (!combat) {
      return {
        ok: false,
        error: "Combat not found",
      };
    }

    if (combat.status !== "ACTIVE") {
      return {
        ok: false,
        error: "Combat is not active",
      };
    }

    const activeParticipants = combat.participants;

    if (activeParticipants.length === 0) {
      return {
        ok: false,
        error: "No active participants remaining",
      };
    }

    let nextIndex = combat.currentTurnIndex + 1;
    let nextRound = combat.round;

    // Wrap → new round
    if (nextIndex >= activeParticipants.length) {
      nextIndex = 0;
      nextRound += 1;
    }

    const nextActor = activeParticipants[nextIndex];

    // Atomic transaction
    await prisma.$transaction([
      prisma.combat.update({
        where: {
          id: combatId,
        },
        data: {
          currentTurnIndex: nextIndex,
          round: nextRound,
        },
      }),

      // Reset ONLY next actor actions
      prisma.combatParticipant.update({
        where: {
          id: nextActor.id,
        },
        data: {
          actionUsed: false,
          bonusUsed: false,
          reactionUsed: false,
        },
      }),
    ]);

    return {
      ok: true,
    };
  } catch (error) {
    console.error("advanceTurn failed", error);

    return {
      ok: false,
      error: "Failed to advance turn",
    };
  }
}

// ─── End combat ──────────────────────────────────────────────────────────────

export async function endCombat(combatId: string) {
  await prisma.combat.update({
    where: { id: combatId },
    data:  { status: "FINISHED" },
  });

  redirect("/combat");
}

export async function addParticipantsFromGroup(formData: FormData) {
  const combatId = formData.get("combatId")?.toString();
  const groupId  = formData.get("groupId")?.toString();

  if (!combatId || !groupId) throw new Error("Missing required fields");

  const [combat, group] = await Promise.all([
    prisma.combat.findUnique({ where: { id: combatId } }),
    prisma.group.findUnique({
      where:   { id: groupId },
      include: { members: { include: { template: true } } },
    }),
  ]);

  if (!combat) throw new Error("Combat not found");
  if (!group)  throw new Error("Group not found");
  if (combat.status !== "SETUP") throw new Error("Combat has already started");

  // For each member, create quantity participants
  const data = group.members.flatMap((m) => {
    // Count existing to generate correct suffix numbers
    return Array.from({ length: m.quantity }, (_, i) => ({
      combatId,
      templateId:  m.templateId,
      displayName: m.quantity > 1
        ? `${m.template.name} #${i + 1}`
        : m.template.name,
      maxHp:       m.template.currentHp ?? m.template.maxHp,
      currentHp:   m.template.currentHp ?? m.template.maxHp,
      tempHp:      0,
      baseAc:      m.template.baseAc,
      initiative:  0,
      turnOrder:   0,
      acModifiers: [],
      conditions:  [],
      isConscious: true,
    }));
  });

  await prisma.combatParticipant.createMany({ data });

  revalidatePath(`/combat/${combatId}/setup`);
}

// ── Save HP back to templates after combat ───────────────────────────────────
// Called optionally when ending a combat.
// Updates each template's currentHp with the participant's final HP.

export async function saveHpToTemplates(combatId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const participants = await prisma.combatParticipant.findMany({
      where: { combatId },
    });

    await prisma.$transaction(
      participants.map((p) =>
        prisma.characterTemplate.update({
          where: { id: p.templateId },
          data:  { currentHp: p.currentHp },
        })
      )
    );

    return { ok: true };
  } catch (err) {
    console.error("[saveHpToTemplates]", err);
    return { ok: false, error: "Failed to save HP to templates" };
  }
}