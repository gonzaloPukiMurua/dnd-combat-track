import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SpectateView } from "@/components/combat/SpectateView";

async function getCombat(id: string) {
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

export default async function SpectatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Read player identity from cookie
  const cookieStore = await cookies();
  const playerParticipantId = cookieStore.get("player_participant_id")?.value;
  const playerCombatId      = cookieStore.get("player_combat_id")?.value;

  // If no cookie or wrong combat — redirect to join
  if (!playerParticipantId || playerCombatId !== id) {
    redirect(`/join`);
  }

  const combat = await getCombat(id);
  if (!combat) notFound();

  // Verify the participant actually belongs to this combat
  const playerParticipant = combat.participants.find(
    (p) => p.id === playerParticipantId
  );

  if (!playerParticipant) {
    redirect(`/join`);
  }

  const isFinished = combat.status === "FINISHED";
  const conscious  = combat.participants.filter((p) => p.isConscious);
  const current    = conscious[combat.currentTurnIndex] ?? null;

  return (
    <SpectateView
      combat={{
        id:               combat.id,
        name:             combat.name,
        status:           combat.status as "SETUP" | "ACTIVE" | "FINISHED",
        round:            combat.round,
        currentTurnIndex: combat.currentTurnIndex,
        participants: combat.participants.map((p) => ({
          id:                 p.id,
          combatId:           p.combatId,
          templateId:         p.templateId,
          displayName:        p.displayName,
          initiative:         p.initiative,
          turnOrder:          p.turnOrder,
          maxHp:              p.maxHp,
          currentHp:          p.currentHp,
          tempHp:             p.tempHp,
          baseAc:             p.baseAc,
          acModifiers:        p.acModifiers as never,
          conditions:         p.conditions  as never,
          isConscious:        p.isConscious,
          isStabilized:       p.isStabilized,
          deathSaveSuccesses: p.deathSaveSuccesses,
          deathSaveFailures:  p.deathSaveFailures,
          actionUsed:         p.actionUsed,
          bonusUsed:          p.bonusUsed,
          reactionUsed:       p.reactionUsed,
          template: {
            id:              p.template.id,
            name:            p.template.name,
            type:            p.template.type,
            maxHp:           p.template.maxHp,
            baseAc:          p.template.baseAc,
            initiativeBonus: p.template.initiativeBonus,
          },
        })),
        logs: combat.logs.map((l) => ({
          id:        l.id,
          combatId:  l.combatId,
          round:     l.round,
          type:      l.type as "DAMAGE" | "HEAL" | "CONDITION_ADDED" | "CONDITION_REMOVED" | "NOTE",
          actorId:   l.actorId,
          targetId:  l.targetId,
          amount:    l.amount,
          note:      l.note,
          createdAt: l.createdAt,
          actor:     l.actor  ? { displayName: l.actor.displayName  } : null,
          target:    l.target ? { displayName: l.target.displayName } : null,
        })),
      }}
      playerParticipantId={playerParticipantId}
      isFinished={isFinished}
      currentActorId={current?.id ?? null}
    />
  );
}