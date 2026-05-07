import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { endCombat } from "@/lib/actions/combat";
import { CombatantRow } from "@/components/combat/CombatRow";
import { CombatLog } from "@/components/combat/CombatLog";
import { CurrentTurnPanel } from "@/components/combat/CurrentTurnPanel";

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
  const conscious  = combat.participants.filter((p) => p.isConscious);
  const current    = conscious[combat.currentTurnIndex] ?? null;

  const participantSummaries = combat.participants.map((p) => ({
    id:          p.id,
    displayName: p.displayName,
    isConscious: p.isConscious,
    currentHp:   p.currentHp,
    maxHp:       p.maxHp,
    tempHp:      p.tempHp,
  }));

  return (
    <>
      <div className="space-y-4 pb-48 sm:pb-36">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 pt-2">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{combat.name}</h1>
            <p className="text-sm text-gray-500">
              {isFinished
                ? "Combat finished"
                : `Round ${combat.round} · ${conscious.length} active`}
            </p>
          </div>

          <form action={async () => { "use server"; await endCombat(id); }}>
            <button
              type="submit"
              className="border-2 rounded-xl px-4 py-2 text-sm text-gray-500 hover:text-red-600 hover:border-red-300 transition-colors min-h-[44px]"
            >
              {isFinished ? "← Back" : "End combat"}
            </button>
          </form>
        </div>

        {/* Initiative list */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Initiative order
          </h2>
          {combat.participants.map((p) => {
            const isCurrentTurn = !isFinished && p.id === current?.id;
            return (
              <CombatantRow
                key={p.id}
                participant={p}
                combatId={combat.id}
                isCurrentTurn={isCurrentTurn}
                isFinished={isFinished}
                round={combat.round}
                allParticipants={participantSummaries}
              />
            );
          })}
        </section>

        {/* Combat log */}
        {combat.logs.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Log
            </h2>
            <CombatLog logs={combat.logs} />
          </section>
        )}
      </div>

      {/* Sticky command panel */}
      {!isFinished && current && (
        <CurrentTurnPanel
          actor={{
            id:           current.id,
            displayName:  current.displayName,
            currentHp:    current.currentHp,
            maxHp:        current.maxHp,
            tempHp:       current.tempHp,
            actionUsed:   current.actionUsed,
            bonusUsed:    current.bonusUsed,
            reactionUsed: current.reactionUsed,
          }}
          combatId={combat.id}
          round={combat.round}
          allParticipants={participantSummaries}
        />
      )}
    </>
  );
}
