import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { endCombat, saveHpToTemplates } from "@/lib/actions/combat";
import { getCombatDetail } from "@/lib/actions/queries/combat";
import { mapCombatDetail } from "@/lib/actions/mappers/combat";
import { getTemplatesForCampaign } from "@/lib/actions/templates";
import { CombatStoreInitializer } from "@/components/combat/CombatStoreInitializer";
import { ErrorToast } from "@/components/ErrorToast";
import { CombatView } from "@/components/combat/CombatView";

// D11 — re-scoped panel DM. Session + membership are enforced here (this
// route isn't under proxy.ts's protected prefixes) — a non-member gets a
// masked 404 (same pattern as the campaign hub), a player-member is bounced
// to /combat/[id]/spectate rather than the management panel.
export default async function CombatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const combatRow = await getCombatDetail(id);
  if (!combatRow) notFound();

  const membership = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId, campaignId: combatRow.campaignId } },
  });
  if (!membership) notFound();
  if (membership.role !== "DM") redirect(`/combat/${id}/spectate`);

  const templates = await getTemplatesForCampaign(combatRow.campaignId);

  const combat = mapCombatDetail(combatRow);
  const isFinished = combat.status === "FINISHED";
  const campaignId = combatRow.campaignId;

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      {/* Hydrate store once — after this the server is write-only */}
      <CombatStoreInitializer combat={combat} />

      {/* Error toast — appears on any mutation failure */}
      <ErrorToast />

      <Link
        href={`/campaigns/${campaignId}`}
        className="text-sm text-gothic-on-surface-variant hover:text-gothic-on-surface transition-colors"
      >
        ← Campaña
      </Link>

      {/* Player preview link — shown while the encounter is live */}
      {!isFinished && (
        <div className="flex justify-end mt-2 mb-2">
          <Link
            href={`/combat/${combat.id}/spectate`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gothic-brass-bright hover:text-gothic-primary underline transition-colors"
          >
            Vista previa de jugador →
          </Link>
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
          <form action={async () => { "use server"; await saveHpToTemplates(combat.id); await endCombat(combat.id, campaignId); }}>
            <button type="submit" className="w-full rounded-gothic-sm ring-1 ring-gothic-success-text text-gothic-success-text py-3 text-sm font-medium hover:bg-gothic-success-bg/40 transition-colors">
              Terminar combate + guardar PV en personajes
            </button>
          </form>
          <form action={async () => { "use server"; await endCombat(combat.id, campaignId); }}>
            <button type="submit" className="w-full rounded-gothic-sm ring-1 ring-gothic-outline-variant py-3 text-sm text-gothic-on-surface-variant hover:text-gothic-danger-bright hover:ring-gothic-danger-bright transition-colors">
              Terminar combate (los PV vuelven al máximo la próxima vez)
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
