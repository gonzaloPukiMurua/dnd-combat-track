"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateJoinCode } from "@/lib/utils/combat";
import {
  computeAdvanceTurn,
  computeCurrentActor,
  computeTurnOrder,
  relocateCurrentActor,
} from "@/domain/combat/rules";
import {
  requireCampaignDmAction,
  requireCombatDm,
  UnauthorizedError,
} from "@/lib/auth/action-guards";
import {
  getActiveCombatDetail,
  getCombatDetail,
  getCombatByJoinCodeDetail,
} from "@/lib/actions/queries/combat";

// ─── Queries ─────────────────────────────────────────────────────────────────
// Thin async wrappers — "use server" files may only export async functions,
// so these can't be plain const re-exports. Shared include shape lives in
// lib/actions/queries/combat.ts.

// Returns the single SETUP or ACTIVE combat, or null.
// We enforce one combat at a time at the query level.
export async function getActiveCombat() {
  return getActiveCombatDetail();
}

export async function getCombatById(id: string) {
  return getCombatDetail(id);
}

// ─── Create combat ───────────────────────────────────────────────────────────

// Shared by createCombat (form action) and startCombatFromGroup (E5) — keeps
// the one-SETUP/ACTIVE-combat-per-campaign rule in a single place.
async function createCombatRecord(campaignId: string, name?: string) {
  const existing = await prisma.combat.findFirst({
    where: { campaignId, status: { in: ["SETUP", "ACTIVE"] } },
  });
  if (existing) {
    throw new Error("A combat is already in progress in this campaign. End it before starting a new one.");
  }

  return prisma.combat.create({
    data: { name: name?.trim() || "New Combat", campaignId, status: "SETUP", round: 0, currentTurnIndex: 0 },
  });
}

export async function createCombat(formData: FormData) {
  const campaignId = formData.get("campaignId")?.toString();
  if (!campaignId) throw new Error("Missing campaignId");

  await requireCampaignDmAction(campaignId);

  const combat = await createCombatRecord(campaignId, formData.get("name")?.toString());
  redirect(`/combat/${combat.id}/setup`);
}

// ─── E5 — "Start combat with this group" ─────────────────────────────────────
// Creates a Combat scoped to the group's own campaign (reusing
// createCombatRecord — same rule as D14a's createCombat, not duplicated),
// copies the group's members in as participants via addParticipantsFromGroup
// (already copies real stats, not defaults — D15), then redirects to setup.
// DM-only is enforced by the caller (src/app/groups/[id]/start-combat/route.ts),
// same pattern as D14a's route.

export async function startCombatFromGroup(groupId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new Error("Group not found");

  await requireCampaignDmAction(group.campaignId);

  const combat = await createCombatRecord(group.campaignId);

  const formData = new FormData();
  formData.set("combatId", combat.id);
  formData.set("groupId", groupId);
  await addParticipantsFromGroup(formData);

  redirect(`/combat/${combat.id}/setup`);
}

// ─── Add participant ────────────────────────────────────────────────────────
// Used both from /setup (pre-combat — initiative 0 is fine, startCombat rolls
// it) and from AddParticipantMidCombat while ACTIVE. New rows are created at
// initiative 0 and turnOrder = end-of-list (never 0 — a turnOrder collision
// with the participant going first would corrupt the current-actor lookup
// before setParticipantInitiative even runs). On /setup that turnOrder is
// cosmetic (startCombat recomputes); mid-combat the caller follows up with
// setParticipantInitiative (S2-9) to slot the newcomer in properly. Returns
// the created participant ids for that follow-up call.

export async function addParticipant(formData: FormData): Promise<string[]> {
  const combatId   = formData.get("combatId")?.toString();
  const templateId = formData.get("templateId")?.toString();
  const quantity   = Number(formData.get("quantity") ?? 1);

  if (!combatId || !templateId) throw new Error("Missing combatId or templateId");

  await requireCombatDm(combatId);

  const [combat, template] = await Promise.all([
    prisma.combat.findUnique({ where: { id: combatId } }),
    prisma.characterTemplate.findUnique({ where: { id: templateId } }),
  ]);

  if (!combat)    throw new Error("Combat not found");
  if (!template)  throw new Error("Template not found");
  if (template.campaignId !== combat.campaignId) throw new Error("Template belongs to a different campaign");
  if (combat.status === "FINISHED") throw new Error("Cannot add participants after combat has started");

  // Per-template count → suffix; total count → a non-colliding turnOrder base.
  const [existing, totalExisting] = await Promise.all([
    prisma.combatParticipant.count({ where: { combatId, templateId } }),
    prisma.combatParticipant.count({ where: { combatId } }),
  ]);

  // Create one participant per quantity
  const data = Array.from({ length: quantity }, (_, i) => {
    const suffix = quantity > 1 || existing > 0
      ? ` #${existing + i + 1}`
      : "";
    return {
      combatId,
      templateId,
      displayName:      `${template.name}${suffix}`,
      maxHp:            template.maxHp,
      currentHp:        template.currentHp ?? template.maxHp,
      tempHp:           0,
      baseAc:           template.baseAc,
      level:            template.level,
      proficiencyBonus: template.proficiencyBonus,
      str:              template.str,
      dex:              template.dex,
      con:              template.con,
      int:              template.int,
      wis:              template.wis,
      cha:              template.cha,
      initiative:  0,
      turnOrder:   totalExisting + i,
      acModifiers: [],
      conditions:  [],
      isConscious: true,
    };
  });

  // create-per-row (not createMany) so we can hand the ids back to the
  // mid-combat caller — createMany doesn't return the created records.
  const created = await prisma.$transaction(
    data.map((d) => prisma.combatParticipant.create({ data: d, select: { id: true } }))
  );

  revalidatePath(`/combat/${combatId}/setup`);
  return created.map((c) => c.id);
}

// ─── Remove participant from SETUP combat ────────────────────────────────────

export async function removeParticipant(participantId: string, combatId: string) {
  await requireCombatDm(combatId);

  const combat = await prisma.combat.findUnique({ where: { id: combatId } });
  if (combat?.status === "FINISHED") throw new Error("Cannot modify a finished combat");

  // The participant id comes from the client alongside combatId — make sure
  // it actually belongs to this (already authorized) combat before deleting.
  const participant = await prisma.combatParticipant.findUnique({
    where:  { id: participantId },
    select: { combatId: true },
  });
  if (!participant || participant.combatId !== combatId) {
    throw new Error("Participant not found in this combat");
  }

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

  await requireCombatDm(combatId);

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
  const withInitiative = combat.participants.map((p) => ({
    id:              p.id,
    initiative:      Number(formData.get(`roll_${p.id}`) ?? 0) + p.template.initiativeBonus,
    initiativeBonus: p.template.initiativeBonus,
  }));

  // Turn order via the shared rule (initiative desc, ties by initiativeBonus) —
  // same function setParticipantInitiative uses for late edits.
  const orderById = new Map(
    computeTurnOrder(withInitiative).map((t) => [t.id, t.turnOrder])
  );

  // Persist initiative values and turn order in a transaction
  await prisma.$transaction([
    // Update each participant
    ...withInitiative.map((p) =>
      prisma.combatParticipant.update({
        where: { id: p.id },
        data:  { initiative: p.initiative, turnOrder: orderById.get(p.id)! },
      })
    ),
    // Flip combat to ACTIVE, start at round 1, first participant's turn
    prisma.combat.update({
      where: { id: combatId },
      data:  { 
        status: "ACTIVE", 
        round: 1, 
        currentTurnIndex: 0,
        joinCode:         generateJoinCode(), 
      },
    }),
  ]);

  redirect(`/combat/${combatId}`);
}

// ─── S2-9 — set / correct a participant's initiative during ACTIVE combat ────
//
// The d20-roll inputs only live on /setup, so anyone added (or mistyped) after
// combat started was stuck at initiative 0 with no way to fix it. This sets a
// raw initiative for one participant and then recomputes turnOrder for the
// WHOLE combat from scratch via computeTurnOrder (same criterion as
// startCombat) — never a local insert/shift. currentTurnIndex is relocated to
// keep pointing at whoever is actually acting, like reorderParticipants does.

export async function setParticipantInitiative(
  participantId: string,
  initiative: number
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!Number.isInteger(initiative)) {
      return { ok: false, error: "Initiative must be a whole number" };
    }

    const participant = await prisma.combatParticipant.findUnique({
      where:  { id: participantId },
      select: { combatId: true },
    });
    if (!participant) return { ok: false, error: "Participant not found" };

    await requireCombatDm(participant.combatId);

    const combat = await prisma.combat.findUnique({
      where:   { id: participant.combatId },
      include: {
        participants: { include: { template: { select: { initiativeBonus: true } } } },
      },
    });
    if (!combat) return { ok: false, error: "Combat not found" };
    if (combat.status !== "ACTIVE") {
      return { ok: false, error: "Initiative can only be set while the combat is active" };
    }

    // Who is acting right now — resolved before the reshuffle so the turn
    // index can follow them into the new order rather than a stale slot.
    const currentActorId = computeCurrentActor(
      combat.participants.map((p) => ({
        id:                p.id,
        turnOrder:         p.turnOrder,
        deathSaveFailures: p.deathSaveFailures,
      })),
      combat.currentTurnIndex
    )?.id ?? null;

    const order = computeTurnOrder(
      combat.participants.map((p) => ({
        id:              p.id,
        initiative:      p.id === participantId ? initiative : p.initiative,
        initiativeBonus: p.template.initiativeBonus,
      }))
    );
    const orderById = new Map(order.map((t) => [t.id, t.turnOrder]));

    const currentTurnIndex = relocateCurrentActor(
      combat.participants.map((p) => ({
        id:                p.id,
        turnOrder:         orderById.get(p.id)!,
        deathSaveFailures: p.deathSaveFailures,
      })),
      currentActorId,
      combat.currentTurnIndex
    );

    await prisma.$transaction([
      ...order.map((t) =>
        prisma.combatParticipant.update({
          where: { id: t.id },
          data:
            t.id === participantId
              ? { turnOrder: t.turnOrder, initiative }
              : { turnOrder: t.turnOrder },
        })
      ),
      prisma.combat.update({
        where: { id: participant.combatId },
        data:  { currentTurnIndex },
      }),
    ]);

    revalidatePath(`/combat/${participant.combatId}`);
    revalidatePath(`/combat/${participant.combatId}/spectate`);
    return { ok: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { ok: false, error: err.message };
    console.error("[setParticipantInitiative]", err);
    return { ok: false, error: "Failed to set initiative. Please try again." };
  }
}

// ─── Advance to next turn ────────────────────────────────────────────────────

export async function advanceTurn(combatId: string) {
  try {
    await requireCombatDm(combatId);

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

    const advance = computeAdvanceTurn(combat.participants, combat.currentTurnIndex, combat.round);

    if (!advance || !advance.nextActorId) {
      return { ok: false, error: "No active participants remaining" };
    }

    const { nextIndex, nextRound, nextActorId } = advance;

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
          id: nextActorId,
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
    if (error instanceof UnauthorizedError) {
      return { ok: false, error: error.message };
    }

    console.error("advanceTurn failed", error);

    return {
      ok: false,
      error: "Failed to advance turn",
    };
  }
}

// ─── End combat ──────────────────────────────────────────────────────────────

export async function endCombat(combatId: string, campaignId: string) {
  const { campaignId: ownerCampaignId } = await requireCombatDm(combatId);
  if (campaignId !== ownerCampaignId) throw new UnauthorizedError();

  await prisma.combat.update({
    where: { id: combatId },
    data:  { status: "FINISHED" },
  });

  // Combat is scoped to its campaign (D14/D11) — the DM lands back on that
  // campaign's hub, not the old global /combat list.
  revalidatePath(`/campaigns/${campaignId}`);

  redirect(`/campaigns/${campaignId}`);
}

export async function addParticipantsFromGroup(formData: FormData) {
  const combatId = formData.get("combatId")?.toString();
  const groupId  = formData.get("groupId")?.toString();

  if (!combatId || !groupId) throw new Error("Missing required fields");

  await requireCombatDm(combatId);

  const [combat, group] = await Promise.all([
    prisma.combat.findUnique({ where: { id: combatId } }),
    prisma.group.findUnique({
      where:   { id: groupId },
      include: { members: { include: { template: true } } },
    }),
  ]);

  if (!combat) throw new Error("Combat not found");
  if (!group)  throw new Error("Group not found");
  if (group.campaignId !== combat.campaignId) throw new Error("Group belongs to a different campaign");
  if (combat.status === "FINISHED") throw new Error("Combat has already started");

  // For each member, create quantity participants
  const data = group.members.flatMap((m) => {
    // Count existing to generate correct suffix numbers
    return Array.from({ length: m.quantity }, (_, i) => ({
      combatId,
      templateId:  m.templateId,
      displayName: m.quantity > 1
        ? `${m.template.name} #${i + 1}`
        : m.template.name,
      maxHp:            m.template.maxHp,
      currentHp:        m.template.currentHp ?? m.template.maxHp,
      tempHp:           0,
      baseAc:           m.template.baseAc,
      level:            m.template.level,
      proficiencyBonus: m.template.proficiencyBonus,
      str:              m.template.str,
      dex:              m.template.dex,
      con:              m.template.con,
      int:              m.template.int,
      wis:              m.template.wis,
      cha:              m.template.cha,
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
    await requireCombatDm(combatId);

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
    if (err instanceof UnauthorizedError) {
      return { ok: false, error: err.message };
    }
    console.error("[saveHpToTemplates]", err);
    return { ok: false, error: "Failed to save HP to templates" };
  }
}

export async function getCombatByJoinCode(code: string) {
  return getCombatByJoinCodeDetail(code);
}