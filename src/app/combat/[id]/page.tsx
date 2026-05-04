import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { advanceTurn, endCombat } from "@/lib/actions/combat";
import { CombatantRow } from "@/components/combat/CombatRow";
import { CombatLog } from "@/components/combat/CombatLog";

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

  if (!id) {
    throw new Error("Missing combat ID");
  }

  if (!combat) notFound();

  const isFinished = combat.status === "FINISHED";

  // The participant whose turn it currently is
  const conscious = combat.participants.filter((p) => p.isConscious);
  const current   = conscious[combat.currentTurnIndex] ?? null;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{combat.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isFinished
              ? "Combat finished"
              : `Round ${combat.round} · ${conscious.length} conscious`}
          </p>
        </div>

        {!isFinished && (
          <div className="flex gap-2">
            {/* Advance turn */}
            <form action={async () => { "use server"; await advanceTurn(id); }}>
              <button
                type="submit"
                className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700"
              >
                Next turn →
              </button>
            </form>

            {/* End combat */}
            <form action={async () => { "use server"; await endCombat(id); }}>
              <button
                type="submit"
                className="border rounded px-4 py-2 text-sm text-gray-500 hover:text-red-600 hover:border-red-300 transition-colors"
              >
                End combat
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Initiative order */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Initiative order
        </h2>

        {combat.participants.map((p, index) => {
          const isCurrentTurn = !isFinished && p.id === current?.id;
          return (
            <CombatantRow
              key={p.id}
              participant={p}
              combatId={combat.id}
              isCurrentTurn={isCurrentTurn}
              isFinished={isFinished}
              round={combat.round}
            />
          );
        })}
      </section>

      {/* Combat log */}
      {combat.logs.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Log
          </h2>
          <CombatLog logs={combat.logs} />
        </section>
      )}
    </div>
  );
}
