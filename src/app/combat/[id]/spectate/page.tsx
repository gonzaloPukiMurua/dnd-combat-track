import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCombatDetail } from "@/lib/actions/queries/combat";
import { mapCombatDetail } from "@/lib/actions/mappers/combat";
import { SpectateView } from "@/components/combat/SpectateView";

// D12 — authorization no longer depends on the player_participant_id /
// player_combat_id cookies (never set by the campaigns flow — bitácora §8,
// D6). A viewer must be a CampaignMember of the campaign that owns this
// combat; their own participant is resolved the same way C5's ownCharacter
// is (the CharacterTemplate they claimed in C3), matched to a
// CombatParticipant by templateId — not stored/trusted from the client.
export default async function SpectatePage({
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
  // Not a member of the owning campaign — masked as 404, same pattern as
  // the campaign hub (don't confirm the combat even exists to a stranger).
  if (!membership) notFound();

  // DMs may land here via the "Vista previa de jugador" link on the panel —
  // that's an intentional preview, not blocked. A DM has no CharacterTemplate
  // of their own, so ownCharacter stays null and no row gets highlighted.
  const ownCharacter =
    membership.role === "PLAYER"
      ? await prisma.characterTemplate.findFirst({
          where:  { campaignId: combatRow.campaignId, ownerId: userId },
          select: { id: true },
        })
      : null;

  const playerParticipant = ownCharacter
    ? combatRow.participants.find((p) => p.templateId === ownCharacter.id) ?? null
    : null;

  const combat = mapCombatDetail(combatRow);
  const isFinished = combat.status === "FINISHED";

  // NOTE: intentionally indexes by isConscious rather than the canonical
  // domain.combat.rules turn order (pre-existing behavior, kept as-is).
  const conscious = combat.participants.filter((p) => p.isConscious);
  const current   = conscious[combat.currentTurnIndex] ?? null;

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <SpectateView
        combat={combat}
        playerParticipantId={playerParticipant?.id ?? null}
        isFinished={isFinished}
        currentActorId={current?.id ?? null}
      />
    </div>
  );
}
