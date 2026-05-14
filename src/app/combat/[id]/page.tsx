import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { endCombat } from "@/lib/actions/combat";
import { CombatStoreInitializer } from "@/components/combat/CombatStoreInitializer";
import { ErrorToast } from "@/components/ErrorToast";
import { CombatView } from "@/components/combat/CombatView";

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

export default async function CombatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const combat = await getCombat(id);

  if (!combat) notFound();

  const isFinished = combat.status === "FINISHED";

  return (
    <>
      {/* Hydrate store once — after this the server is write-only */}
      <CombatStoreInitializer
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
      />

      {/* Error toast — appears on any mutation failure */}
      <ErrorToast />

      {/* CombatView reads entirely from Zustand store */}
      <CombatView combatId={combat.id} isFinished={isFinished} />

      {/* End combat — kept as server action form */}
      {!isFinished && (
        <form
          action={async () => {
            "use server";
            await endCombat(combat.id);
          }}
          className="mt-4"
        >
          <button
            type="submit"
            className="w-full border-2 border-slate-200 rounded-2xl py-3 text-sm text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors"
          >
            End combat
          </button>
        </form>
      )}
    </>
  );
}
