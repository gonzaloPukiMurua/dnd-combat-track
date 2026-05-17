import { prisma } from "@/lib/prisma";
import { createCombat } from "@/lib/actions/combat";
import { CombatCard } from "@/components/combat/CombatCard";

async function getCombats() {
  return prisma.combat.findMany({
    orderBy: { createdAt: "desc" },
    include: { participants: true },
  });
}

export default async function CombatPage() {
  const combats  = await getCombats();
  const active   = combats.filter((c) => c.status === "SETUP" || c.status === "ACTIVE");
  const finished = combats.filter((c) => c.status === "FINISHED");

  return (
    <div className="py-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Combat</h1>

      {/* Active or setup */}
      {active.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            In progress
          </h2>
          {active.map((c) => (
            <CombatCard
              key={c.id}
              combat={{
                id:           c.id,
                name:         c.name,
                status:       c.status as "SETUP" | "ACTIVE" | "FINISHED",
                round:        c.round,
                participants: c.participants,
              }}
            />
          ))}
        </section>
      ) : (
        <section className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="font-bold text-slate-800">Start a new combat</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Name it after the encounter or location.
            </p>
          </div>
          <form action={createCombat} className="flex gap-2">
            <input
              name="name"
              placeholder="e.g. Goblin ambush, Throne room…"
              className="flex-1 border-2 border-slate-200 rounded-xl px-4 h-12 text-base focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              type="submit"
              className="bg-slate-900 text-white rounded-xl px-5 h-12 font-semibold text-sm hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Start →
            </button>
          </form>
        </section>
      )}

      {/* Finished combats */}
      {finished.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Finished
          </h2>
          {finished.map((c) => (
            <CombatCard
              key={c.id}
              combat={{
                id:           c.id,
                name:         c.name,
                status:       c.status as "SETUP" | "ACTIVE" | "FINISHED",
                round:        c.round,
                participants: c.participants,
              }}
            />
          ))}
        </section>
      )}

      {/* Empty state */}
      {combats.length === 0 && (
        <div className="text-center py-12 text-slate-400 space-y-2">
          <p className="text-4xl">🛡</p>
          <p className="font-medium">No combats yet</p>
          <p className="text-sm">Start one above to begin tracking.</p>
        </div>
      )}
    </div>
  );
}
