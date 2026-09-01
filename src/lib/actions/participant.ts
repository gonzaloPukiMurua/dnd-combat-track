"use server";

import { prisma } from "@/lib/prisma";
import type { AcModifier, Condition } from "@/domain/combat/types";
import {
  applyDamage,
  applyHeal,
  applyTempHp,
  addCondition as addConditionRule,
  removeCondition as removeConditionRule,
  applyDeathSave,
  relocateCurrentActor,
} from "@/domain/combat/rules";
import {
  requireParticipantAccess,
  requireParticipantDmAccess,
  requireCombatDm,
  UnauthorizedError,
} from "@/lib/auth/action-guards";

// ─── Return type ──────────────────────────────────────────────────────────────
// Every action returns this — never throws to the client.

type ActionResult = { ok: true } | { ok: false; error: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fd(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

// S2-0 — the action-guards throw UnauthorizedError, but this file's contract
// is to always return ActionResult and never throw. This adapts a guard call
// into that shape: on success the resolved context comes back for the action
// to use (e.g. the verified combatId for a CombatLog row), on an auth failure
// a { ok: false } result. Any other error still propagates to the caller's
// own try/catch.
type GuardOutcome<T> = { ok: true; ctx: T } | { ok: false; error: string };

async function guard<T>(check: () => Promise<T>): Promise<GuardOutcome<T>> {
  try {
    return { ok: true, ctx: await check() };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { ok: false, error: err.message };
    throw err;
  }
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

    const g = await guard(() => requireParticipantAccess(targetId));
    if (!g.ok) return g;

    const target = await getParticipantWithRound(targetId);

    if (!target) return { ok: false, error: "Target not found" };

    const { currentHp: newHp, tempHp: newTempHp, isConscious } = applyDamage(target, rawAmount);

    await prisma.$transaction([
      prisma.combatParticipant.update({
        where: { id: targetId },
        data:  { currentHp: newHp, tempHp: newTempHp, isConscious },
      }),
      prisma.combatLog.create({
        data: {
          // Derived from the verified participant, not the client's combatId
          // field — the two could be mismatched on purpose (S2-0).
          combatId: g.ctx.combatId,
          round: target.combat.round,
          type:     "DAMAGE",
          actorId,
          targetId,
          amount:   rawAmount,
          note:     !isConscious ? `${target.displayName} cayó inconsciente` : null,
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

    const g = await guard(() => requireParticipantAccess(targetId));
    if (!g.ok) return g;

    const target = await getParticipantWithRound(targetId);

    if (!target) return { ok: false, error: "Target not found" };

    const healed = applyHeal(target, rawAmount);

    await prisma.$transaction([
      prisma.combatParticipant.update({
        where: { id: targetId },
        data:  {
          currentHp:   healed.currentHp,
          isConscious: healed.isConscious,
          ...(healed.regainedConsciousness ? {
            deathSaveSuccesses: healed.deathSaveSuccesses,
            deathSaveFailures:  healed.deathSaveFailures,
            isStabilized:       healed.isStabilized,
          } : {}),
        },
      }),
      prisma.combatLog.create({
        data: {
          combatId: g.ctx.combatId,
          round: target.combat.round,
          type:     "HEAL",
          actorId,
          targetId,
          amount:   rawAmount,
          note:     healed.regainedConsciousness
            ? `${target.displayName} recuperó la consciencia`
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

    const g = await guard(() => requireParticipantDmAccess(targetId));
    if (!g.ok) return g;

    const target = await getParticipantWithRound(targetId);
    if (!target) return { ok: false, error: "Target not found" };

    await prisma.combatParticipant.update({
      where: { id: targetId },
      data:  { tempHp: applyTempHp(target, rawAmount) },
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

    const g = await guard(() => requireParticipantAccess(targetId));
    if (!g.ok) return g;

    const target = await getParticipantWithRound(targetId);

    if (!target) return { ok: false, error: "Target not found" };

    const current = target.conditions as Condition[];
    const updated = addConditionRule(current, conditionName);
    if (updated === current) {
      return { ok: true }; // Already has it — not an error
    }

    await prisma.$transaction([
      prisma.combatParticipant.update({
        where: { id: targetId },
        data:  { conditions: updated },
      }),
      prisma.combatLog.create({
        data: {
          combatId: g.ctx.combatId,
          round:    target.combat.round,
          type:     "CONDITION_ADDED",
          targetId,
          note:     `${target.displayName} recibió la condición: ${conditionName}`,
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

    const g = await guard(() => requireParticipantAccess(targetId));
    if (!g.ok) return g;

    const target = await getParticipantWithRound(targetId);

    if (!target) return { ok: false, error: "Target not found" };

    const updated = removeConditionRule(target.conditions as Condition[], conditionName);

    await prisma.$transaction([
      prisma.combatParticipant.update({
        where: { id: targetId },
        data:  { conditions: updated },
      }),
      prisma.combatLog.create({
        data: {
          combatId: g.ctx.combatId,
          round:    target.combat.round,
          type:     "CONDITION_REMOVED",
          targetId,
          note:     `${target.displayName} perdió la condición: ${conditionName}`,
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

    const g = await guard(() => requireParticipantDmAccess(targetId));
    if (!g.ok) return g;

    const target = await getParticipantWithRound(targetId);
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

    const g = await guard(() => requireParticipantDmAccess(targetId));
    if (!g.ok) return g;

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

    const g = await guard(() => requireParticipantDmAccess(targetId));
    if (!g.ok) return g;

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

    const g = await guard(() => requireParticipantAccess(targetId));
    if (!g.ok) return g;

    const target = await getParticipantWithRound(targetId);

    if (!target) return { ok: false, error: "Target not found" };
    if (target.isConscious || target.isStabilized) return { ok: true };

    const { deathSaveSuccesses, deathSaveFailures, isStabilized } = applyDeathSave(target, result);

    const note = result === "success"
      ? isStabilized
        ? `${target.displayName} se estabilizó`
        : `${target.displayName} superó una salvación de muerte (${deathSaveSuccesses}/3)`
      : deathSaveFailures >= 3
        ? `${target.displayName} murió (3 salvaciones de muerte fallidas)`
        : `${target.displayName} falló una salvación de muerte (${deathSaveFailures}/3)`;

    await prisma.$transaction([
      prisma.combatParticipant.update({
        where: { id: targetId },
        data:  { deathSaveSuccesses, deathSaveFailures, isStabilized },
      }),
      prisma.combatLog.create({
        data: { combatId: g.ctx.combatId, round: target.combat.round, type: "NOTE", targetId, note },
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

    const g = await guard(() => requireParticipantAccess(targetId));
    if (!g.ok) return g;

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

// ─── Reorder participants (manual drag, ACTIVE combat only) ──────────────────

export async function reorderParticipants(formData: FormData): Promise<ActionResult> {
  try {
    const combatId       = fd(formData, "combatId");
    const orderedIdsRaw  = fd(formData, "orderedIds");
    const currentActorId = fd(formData, "currentActorId") || null;

    if (!combatId || !orderedIdsRaw) return { ok: false, error: "Missing required fields" };

    const g = await guard(() => requireCombatDm(combatId));
    if (!g.ok) return g;

    let orderedIds: unknown;
    try {
      orderedIds = JSON.parse(orderedIdsRaw);
    } catch {
      return { ok: false, error: "Invalid order payload" };
    }
    if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "string")) {
      return { ok: false, error: "Invalid order payload" };
    }

    const combat = await prisma.combat.findUnique({
      where: { id: combatId },
      include: { participants: { select: { id: true, deathSaveFailures: true } } },
    });
    if (!combat) return { ok: false, error: "Combat not found" };
    if (combat.status !== "ACTIVE") return { ok: false, error: "Combat is not active" };

    const byId = new Map(combat.participants.map((p) => [p.id, p]));
    if (
      orderedIds.length !== byId.size ||
      !(orderedIds as string[]).every((id) => byId.has(id))
    ) {
      return { ok: false, error: "Order must include exactly the combat's current participants" };
    }

    const reordered = (orderedIds as string[]).map((id, turnOrder) => ({
      id,
      turnOrder,
      deathSaveFailures: byId.get(id)!.deathSaveFailures,
    }));

    const currentTurnIndex = relocateCurrentActor(reordered, currentActorId, combat.currentTurnIndex);

    await prisma.$transaction([
      ...reordered.map(({ id, turnOrder }) =>
        prisma.combatParticipant.update({ where: { id }, data: { turnOrder } })
      ),
      prisma.combat.update({ where: { id: combatId }, data: { currentTurnIndex } }),
    ]);

    return { ok: true };
  } catch (err) {
    console.error("[reorderParticipants]", err);
    return { ok: false, error: "Failed to reorder participants. Please try again." };
  }
}

function getParticipantWithRound(targetId: string) {
  return prisma.combatParticipant.findUnique({
    where: { id: targetId },
    include: { combat: { select: { round: true } } },
  });
}