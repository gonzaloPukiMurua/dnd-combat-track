import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTemplates } from "@/lib/actions/templates";
import { getGroups } from "@/lib/actions/groups";
import {
  addParticipant,
  removeParticipant,
  startCombat,
  addParticipantsFromGroup,
} from "@/lib/actions/combat";
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
  if (combat.status === "ACTIVE") redirect(`/combat/${id}`);

  return (
    <div className="py-6 space-y-6">

      {/* Header */}
      <div>
        <Link href="/combat" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
          ← Back to combat
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">{combat.name}</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Add participants, enter d20 rolls, then start.
        </p>
      </div>

      {/* Quick load from group — only shown when groups exist */}
      {groups.length > 0 && (
        <section className="bg-white border-2 border-slate-100 rounded-2xl p-4 space-y-3">
          <h2 className="font-bold text-slate-700">Load a group</h2>
          <form action={addParticipantsFromGroup} className="flex gap-2">
            <input type="hidden" name="combatId" value={combat.id} />
            <select
              name="groupId"
              className="flex-1 border-2 border-slate-200 rounded-xl px-3 h-11 text-sm focus:outline-none focus:border-blue-500 bg-white"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.members.reduce((n, m) => n + m.quantity, 0)} participants)
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-slate-900 text-white rounded-xl px-4 h-11 text-sm font-semibold hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Load →
            </button>
          </form>
        </section>
      )}

      {/* Add individual participant */}
      <section className="bg-white border-2 border-slate-100 rounded-2xl p-4 space-y-3">
        <h2 className="font-bold text-slate-700">Add participant</h2>
        {templates.length === 0 ? (
          <div className="text-center py-4 space-y-2">
            <p className="text-sm text-slate-400">No templates found.</p>
            <a href="/templates" className="text-blue-600 text-sm font-medium underline">
              Create templates first →
            </a>
          </div>
        ) : (
          <form action={addParticipant} className="flex gap-2">
            <input type="hidden" name="combatId" value={combat.id} />
            <select
              name="templateId"
              className="flex-1 border-2 border-slate-200 rounded-xl px-3 h-11 text-sm focus:outline-none focus:border-blue-500 bg-white"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.type} · HP {t.maxHp} · AC {t.baseAc}
                </option>
              ))}
            </select>
            <input
              name="quantity"
              type="number"
              min={1}
              max={20}
              defaultValue={1}
              className="w-16 border-2 border-slate-200 rounded-xl px-2 h-11 text-base text-center focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="bg-slate-900 text-white rounded-xl px-4 h-11 font-semibold text-sm hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Add
            </button>
          </form>
        )}
      </section>

      {/* Participant list + initiative */}
      {combat.participants.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-bold text-slate-700">
            Participants
            <span className="ml-2 text-slate-400 font-normal">
              ({combat.participants.length})
            </span>
          </h2>

          <form action={startCombat} className="space-y-2">
            <input type="hidden" name="combatId" value={combat.id} />

            {combat.participants.map((p) => {
              const bonus = p.template.initiativeBonus >= 0
                ? `+${p.template.initiativeBonus}`
                : `${p.template.initiativeBonus}`;

              return (
                <div
                  key={p.id}
                  className="bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{p.displayName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      HP {p.maxHp} · AC {p.baseAc} · Init {bonus}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <label className="text-xs text-slate-400 hidden sm:block">d20</label>
                    <input
                      name={`roll_${p.id}`}
                      type="number"
                      min={1}
                      max={20}
                      required
                      placeholder="—"
                      className="w-14 h-11 border-2 border-slate-200 rounded-xl text-center text-base font-mono font-bold focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-xs text-slate-400 w-6 text-right">{bonus}</span>
                  </div>

                  <button
                    formAction={async () => {
                      "use server";
                      await removeParticipant(p.id, combat.id);
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                    aria-label={`Remove ${p.displayName}`}
                  >
                    ✕
                  </button>
                </div>
              );
            })}

            <button
              type="submit"
              className="w-full h-14 bg-green-600 text-white rounded-2xl font-bold text-base hover:bg-green-700 transition-colors mt-2"
            >
              Roll initiative & start combat →
            </button>
          </form>
        </section>
      )}

      {/* Empty state */}
      {combat.participants.length === 0 && (
        <div className="text-center py-12 text-slate-400 space-y-2">
          <p className="text-3xl">👥</p>
          <p className="font-medium">No participants yet</p>
          <p className="text-sm">
            {groups.length > 0
              ? "Load a group above or add templates individually."
              : "Add characters from your templates above."}
          </p>
        </div>
      )}
    </div>
  );
}
