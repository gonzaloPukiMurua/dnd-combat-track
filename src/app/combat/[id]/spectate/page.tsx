import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getCombatDetail } from "@/lib/actions/queries/combat";
import { mapCombatDetail } from "@/lib/actions/mappers/combat";
import { SpectateView } from "@/components/combat/SpectateView";

export default async function SpectatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Read player identity from cookie
  const cookieStore = await cookies();
  const playerParticipantId = cookieStore.get("player_participant_id")?.value;
  const playerCombatId      = cookieStore.get("player_combat_id")?.value;

  // If no cookie or wrong combat — redirect to join
  if (!playerParticipantId || playerCombatId !== id) {
    redirect(`/join`);
  }

  const combatRow = await getCombatDetail(id);
  if (!combatRow) notFound();

  // Verify the participant actually belongs to this combat
  const playerParticipant = combatRow.participants.find(
    (p) => p.id === playerParticipantId
  );

  if (!playerParticipant) {
    redirect(`/join`);
  }

  const combat = mapCombatDetail(combatRow);
  const isFinished = combat.status === "FINISHED";

  // NOTE: intentionally indexes by isConscious rather than the canonical
  // domain.combat.rules turn order (pre-existing behavior, kept as-is).
  const conscious = combat.participants.filter((p) => p.isConscious);
  const current   = conscious[combat.currentTurnIndex] ?? null;

  return (
    <SpectateView
      combat={combat}
      playerParticipantId={playerParticipantId}
      isFinished={isFinished}
      currentActorId={current?.id ?? null}
    />
  );
}