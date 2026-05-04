import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createCombat } from "@/lib/actions/combat";

async function getCombats() {
  return prisma.combat.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      participants: true,
    },
  });
}

export default async function CombatPage() {
  const combats = await getCombats();

  const active   = combats.filter((c) => c.status === "SETUP" || c.status === "ACTIVE");
  const finished = combats.filter((c) => c.status === "FINISHED");

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
      <h1 className="text-2xl font-bold">Combat</h1>

      {/* Active or setup combat */}
      {active.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            In progress
          </h2>
          {active.map((c) => (
            <Link
              key={c.id}
              href={c.status === "SETUP" ? `/combat/${c.id}/setup` : `/combat/${c.id}`}
              className="flex items-center justify-between border rounded p-3 bg-white hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-gray-500">
                  {c.participants.length} participant{c.participants.length !== 1 ? "s" : ""}
                  {c.status === "ACTIVE" && ` · Round ${c.round}`}
                </p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                c.status === "ACTIVE"
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}>
                {c.status === "ACTIVE" ? "Active" : "Setup"}
              </span>
            </Link>
          ))}
        </section>
      ) : (
        /* No active combat — show the create form */
        <section className="border rounded p-4 bg-white space-y-3">
          <h2 className="font-semibold">Start a new combat</h2>
          <form action={createCombat} className="flex gap-2">
            <input
              name="name"
              placeholder="Combat name (optional)"
              className="border rounded px-3 py-2 text-sm flex-1"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700"
            >
              Start
            </button>
          </form>
        </section>
      )}

      {/* Finished combats */}
      {finished.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Finished
          </h2>
          {finished.map((c) => (
            <Link
              key={c.id}
              href={`/combat/${c.id}`}
              className="flex items-center justify-between border rounded p-3 bg-white hover:bg-gray-50 transition-colors opacity-60"
            >
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-gray-500">
                  {c.participants.length} participants · {c.round} rounds
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                Finished
              </span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
