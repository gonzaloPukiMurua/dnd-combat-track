import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { endCombat, saveHpToTemplates } from "@/lib/actions/combat";
import { getCombatDetail } from "@/lib/actions/queries/combat";
import { mapCombatDetail } from "@/lib/actions/mappers/combat";
import { CombatStoreInitializer } from "@/components/combat/CombatStoreInitializer";
import { ErrorToast } from "@/components/ErrorToast";
import { CombatView } from "@/components/combat/CombatView";
import Link from "next/link";

export default async function CombatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [combatRow, templates] = await Promise.all([
    getCombatDetail(id),
    prisma.characterTemplate.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select:  { id: true, name: true, type: true, maxHp: true, baseAc: true },
    }),
  ]);

  if (!combatRow) notFound();

  const combat = mapCombatDetail(combatRow);
  const isFinished = combat.status === "FINISHED";

  return (
    <>
      {/* Hydrate store once — after this the server is write-only */}
      <CombatStoreInitializer combat={combat} />

      {/* Error toast — appears on any mutation failure */}
      <ErrorToast />
      {/* Join code — shown when combat is active */}
      {!isFinished && combatRow.joinCode && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Player join code
            </p>

            <p className="text-2xl font-bold font-mono tracking-widest text-white mt-0.5">
              {combatRow.joinCode}
            </p>
          </div>

          <div className="text-right space-y-1">
            <p className="text-xs text-slate-500">
              Players go to <strong className="text-slate-300">/join</strong>
            </p>

            <Link
              href={`/combat/${combat.id}/spectate`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 underline transition-colors"
            >
              Preview player view →
            </Link>
          </div>
        </div>
      )}
      {/* CombatView reads entirely from Zustand store */}
      <CombatView 
        combatId={combat.id} 
        isFinished={isFinished} 
        templates={templates}
        />

      {/* End combat buttons — positioned above the sticky panel */}
      {!isFinished && (
        <div className="space-y-2 mb-52 sm:mb-40">
          <form action={async () => { "use server"; await saveHpToTemplates(combat.id); await endCombat(combat.id); }}>
            <button type="submit" className="w-full border-2 border-green-200 text-green-700 rounded-2xl py-3 text-sm font-medium hover:bg-green-50 transition-colors">
              End combat + save HP to templates
            </button>
          </form>
          <form action={async () => { "use server"; await endCombat(combat.id); }}>
            <button type="submit" className="w-full border-2 border-slate-200 rounded-2xl py-3 text-sm text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors">
              End combat (reset HP to full next time)
            </button>
          </form>
        </div>
      )}
    </>
  );
}
