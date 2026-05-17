import { notFound, redirect } from "next/navigation";
import { getTemplates } from "@/lib/actions/templates";
import { addParticipant, removeParticipant, startCombat } from "@/lib/actions/combat";
import { prisma } from "@/lib/prisma";

async function getCombatSetup(id: string) {
  return prisma.combat.findUnique({
    where: { id },
    include: {
      participants: {
        orderBy: { createdAt: "asc" },
        include: { template: true },
      },
    },
  });
}

export default async function CombatSetupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [combat, templates, groups] = await Promise.all([
    getCombatSetup(id),
    getTemplates(),
    getGroups(),
  ]);
  if (!combat) notFound();

  // If already started, redirect to the live view
  if (combat.status === "ACTIVE") redirect(`/combat/${id}`);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{combat.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Add participants, then roll initiative to begin.
        </p>
      </div>
      <section className="bg-white border-2 border-slate-100 rounded-2xl p-4 space-y-3">
        <h2 className="font-bold text-slate-700">Load a group</h2>
          <form action={addParticipantsFromGroup} className="flex gap-2">
            <input type="hidden" name="combatId" value={combat.id} />
              <select name="groupId"
                className="flex-1 border-2 border-slate-200 rounded-xl px-3 h-11 text-sm focus:outline-none focus:border-blue-500">
                {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.members.reduce((n, m) => n + m.quantity, 0)} participants)
                </option>
            ))}
          </select>
          <button type="submit"
            className="bg-slate-900 text-white rounded-xl px-4 h-11 text-sm font-semibold hover:bg-slate-800 transition-colors whitespace-nowrap">
            Load →
          </button>
        </form>
      </section>
      {/* Add participant form */}
      <section className="border rounded p-4 bg-white space-y-3">
        <h2 className="font-semibold">Add participant</h2>
        {templates.length === 0 ? (
          <p className="text-sm text-gray-400">
            No templates yet.{" "}
            <a href="/templates" className="text-blue-600 underline">
              Create some first.
            </a>
          </p>
        ) : (
          <form action={addParticipant} className="flex gap-2 flex-wrap">
            <input type="hidden" name="combatId" value={combat.id} />

            <select
              name="templateId"
              className="border rounded px-3 py-2 text-sm flex-1"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.type}) — HP {t.maxHp} AC {t.baseAc}
                </option>
              ))}
            </select>

            <input
              name="quantity"
              type="number"
              min={1}
              max={20}
              defaultValue={1}
              className="border rounded px-3 py-2 text-sm w-20"
              placeholder="Qty"
            />

            <button
              type="submit"
              className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700"
            >
              Add
            </button>
          </form>
        )}
      </section>

      {/* Participant list + initiative rolls */}
      {combat.participants.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">
            Participants ({combat.participants.length})
          </h2>

          <form action={startCombat} className="space-y-3">
            <input type="hidden" name="combatId" value={combat.id} />

            {combat.participants.map((p) => {
              const bonus = p.template.initiativeBonus >= 0
                ? `+${p.template.initiativeBonus}`
                : `${p.template.initiativeBonus}`;

              return (
                <div
                  key={p.id}
                  className="border rounded p-3 bg-white flex items-center gap-3"
                >
                  {/* Name + stats */}
                  <div className="flex-1">
                    <p className="font-medium">{p.displayName}</p>
                    <p className="text-xs text-gray-500">
                      HP {p.maxHp} · AC {p.baseAc} · Init {bonus}
                    </p>
                  </div>

                  {/* d20 roll input */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500 whitespace-nowrap">
                      d20 roll
                    </label>
                    <input
                      name={`roll_${p.id}`}
                      type="number"
                      min={1}
                      max={20}
                      required
                      placeholder="—"
                      className="border rounded px-2 py-1 text-sm w-16 text-center"
                    />
                    <span className="text-sm text-gray-400">{bonus}</span>
                  </div>

                  {/* Remove button */}
                  <button
                    formAction={async () => {
                      "use server";
                      await removeParticipant(p.id, combat.id);
                    }}
                  className="text-gray-300 hover:text-red-500 transition-colors text-sm"
                  aria-label={`Remove ${p.displayName}`}
                  >
                    ✕
                  </button>
                </div>
              );
            })}

            {/* Start combat button */}
            <button
              type="submit"
              className="w-full bg-green-600 text-white rounded py-2 text-sm font-semibold hover:bg-green-700 mt-2"
            >
              Roll initiative & start combat →
            </button>
          </form>
        </section>
      )}

      {/* Empty state */}
      {combat.participants.length === 0 && templates.length > 0 && (
        <p className="text-gray-400 text-sm text-center py-8">
          No participants yet. Add some above.
        </p>
      )}
    </div>
  );
}
