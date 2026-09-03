import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTemplatesForCampaign } from "@/lib/actions/templates";
import { getGroupsForCampaign } from "@/lib/actions/groups";
import {
  addParticipant,
  removeParticipant,
  startCombat,
  addParticipantsFromGroup,
} from "@/lib/actions/combat";
import { getCombatSetupDetail } from "@/lib/actions/queries/combat";

export default async function CombatSetupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // S2-0 / 7.10 — same session + membership gate that /combat/[id] and
  // /combat/[id]/spectate got in D11/D12, which this screen was missing:
  // non-member → masked 404, player-member → bounced to the spectate view.
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const combat = await getCombatSetupDetail(id);

  if (!combat) notFound();

  const membership = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId, campaignId: combat.campaignId } },
  });
  if (!membership) notFound();
  if (membership.role !== "DM") redirect(`/combat/${id}/spectate`);

  if (combat.status === "ACTIVE") redirect(`/combat/${id}`);
  if (combat.status === "FINISHED") redirect(`/campaigns/${combat.campaignId}`);

  // Templates/groups aren't portable between campaigns — only offer the
  // combat's own campaign as candidates for the participant-picker.
  const [templates, groups] = await Promise.all([
    getTemplatesForCampaign(combat.campaignId),
    getGroupsForCampaign(combat.campaignId),
  ]);

  const selectClass =
    "flex-1 rounded-gothic-sm bg-gothic-surface px-3 h-11 text-sm text-gothic-on-surface outline-none ring-1 ring-gothic-outline-variant focus:ring-gothic-primary transition-all";
  const qtyClass =
    "w-16 rounded-gothic-sm bg-gothic-surface px-2 h-11 text-base font-mono text-center text-gothic-on-surface outline-none ring-1 ring-gothic-outline-variant focus:ring-gothic-primary transition-all";
  const primaryBtnClass =
    "rounded-gothic-sm bg-gothic-primary text-gothic-on-primary px-4 h-11 font-semibold text-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] hover:bg-gothic-brass-bright transition-all whitespace-nowrap";

  return (
    <div className="mx-auto max-w-lg px-6 py-10 flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-col gap-1">
        <Link href={`/campaigns/${combat.campaignId}`} className="text-sm text-gothic-on-surface-variant hover:text-gothic-primary transition-colors">
          ← Volver a la campaña
        </Link>
        <h1 className="font-gothic-headline text-gothic-headline-sm text-gothic-primary mt-1">{combat.name}</h1>
        <p className="text-sm text-gothic-on-surface-variant mt-0.5">
          Agregá participantes, tipeá las tiradas de d20 y después iniciá el combate.
        </p>
      </div>

      {/* Quick load from group — only shown when groups exist */}
      {groups.length > 0 && (
        <section className="rounded-gothic-md bg-gothic-surface-low ring-1 ring-gothic-outline-variant p-4 space-y-3">
          <h2 className="font-gothic-headline text-lg text-gothic-primary">Cargar un grupo</h2>
          <form action={addParticipantsFromGroup} className="flex gap-2">
            <input type="hidden" name="combatId" value={combat.id} />
            <select name="groupId" className={selectClass}>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.members.reduce((n, m) => n + m.quantity, 0)} participantes)
                </option>
              ))}
            </select>
            <button type="submit" className={primaryBtnClass}>
              Cargar →
            </button>
          </form>
        </section>
      )}

      {/* Add individual participant */}
      <section className="rounded-gothic-md bg-gothic-surface-low ring-1 ring-gothic-outline-variant p-4 space-y-3">
        <h2 className="font-gothic-headline text-lg text-gothic-primary">Agregar participante</h2>
        {templates.length === 0 ? (
          <div className="text-center py-4 space-y-2">
            <p className="text-sm text-gothic-on-surface-variant">No se encontraron personajes.</p>
            <Link href={`/campaigns/${combat.campaignId}/templates`} className="text-gothic-primary text-sm font-medium underline decoration-gothic-outline-variant underline-offset-4">
              Crear personajes primero →
            </Link>
          </div>
        ) : (
          <form
            action={async (fd) => {
              "use server";
              // addParticipant returns the new ids (for the mid-combat flow);
              // on /setup we don't need them — discard so the form action type
              // stays () => Promise<void>.
              await addParticipant(fd);
            }}
            className="flex gap-2"
          >
            <input type="hidden" name="combatId" value={combat.id} />
            <select name="templateId" className={selectClass}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.type} · PV {t.maxHp} · CA {t.baseAc}
                </option>
              ))}
            </select>
            <input
              name="quantity"
              type="number"
              min={1}
              max={20}
              defaultValue={1}
              className={qtyClass}
            />
            <button type="submit" className={primaryBtnClass}>
              Agregar
            </button>
          </form>
        )}
      </section>

      {/* Participant list + initiative */}
      {combat.participants.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-gothic-headline text-lg text-gothic-primary">
            Participantes
            <span className="ml-2 text-gothic-on-surface-variant font-gothic-body text-sm font-normal">
              ({combat.participants.length})
            </span>
          </h2>

          {/* Participant rows — initiative inputs tied to start-form by id */}
          <div className="space-y-2">
            {combat.participants.map((p) => {
              // etapa-3-monstruos.md: p.template is null for a monster-roster
              // participant. addParticipant doesn't create those yet, so this
              // fallback is unreachable today — just keeping the type honest.
              const templateInitiativeBonus = p.template?.initiativeBonus ?? 0;
              const bonus = templateInitiativeBonus >= 0
                ? `+${templateInitiativeBonus}`
                : `${templateInitiativeBonus}`;

              return (
                <div
                  key={p.id}
                  data-participant={p.displayName.toLowerCase()}
                  className="rounded-gothic-md bg-gothic-surface-low ring-1 ring-gothic-outline-variant px-4 py-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gothic-on-surface truncate">{p.displayName}</p>
                    <p className="text-xs font-mono text-gothic-on-surface-variant mt-0.5">
                      PV {p.maxHp} · CA {p.baseAc} · Inic. {bonus}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <label className="text-xs text-gothic-on-surface-variant hidden sm:block">d20</label>
                    {/* form="start-form" ties this input to the start form by id */}
                    <input
                      form="start-form"
                      name={`roll_${p.id}`}
                      type="number"
                      min={1}
                      max={20}
                      required
                      placeholder="—"
                      className="w-14 h-11 rounded-gothic-sm bg-gothic-surface ring-1 ring-gothic-outline-variant text-center text-base font-mono font-bold text-gothic-on-surface outline-none focus:ring-gothic-primary transition-all"
                    />
                    <span className="text-xs font-mono text-gothic-on-surface-variant w-6 text-right">{bonus}</span>
                  </div>

                  {/* Standalone remove form — no required fields, no connection to start-form */}
                  <form action={async () => {
                    "use server";
                    await removeParticipant(p.id, combat.id);
                  }}>
                    <button
                      type="submit"
                      className="w-10 h-10 flex items-center justify-center rounded-gothic-sm text-gothic-on-surface-variant hover:text-gothic-danger-bright hover:bg-gothic-danger/20 transition-colors flex-shrink-0"
                      aria-label={`Quitar a ${p.displayName}`}
                    >
                      ✕
                    </button>
                  </form>
                </div>
              );
            })}
          </div>

          {/* Start form — identified by id="start-form" */}
          <form id="start-form" action={startCombat} className="space-y-2">
            <input type="hidden" name="combatId" value={combat.id} />
            <button
              type="submit"
              className="w-full h-14 rounded-gothic-md bg-gothic-primary text-gothic-on-primary font-bold text-base shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] hover:bg-gothic-brass-bright transition-all mt-2"
            >
              Tirar iniciativa e iniciar combate →
            </button>
          </form>
        </section>
      )}

      {/* Empty state */}
      {combat.participants.length === 0 && (
        <div className="text-center py-12 text-gothic-on-surface-variant space-y-2">
          <p className="font-medium">Todavía no hay participantes</p>
          <p className="text-sm">
            {groups.length > 0
              ? "Cargá un grupo arriba o agregá personajes individualmente."
              : "Agregá personajes desde tus plantillas arriba."}
          </p>
        </div>
      )}
    </div>
  );
}
