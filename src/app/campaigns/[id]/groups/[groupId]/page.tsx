import { notFound } from "next/navigation";
import { getGroupById } from "@/lib/actions/groups";
import { getTemplatesForCampaign } from "@/lib/actions/templates";
import { addGroupMember, removeGroupMember } from "@/lib/actions/groups";
import { requireCampaignDm } from "@/lib/auth/guards";
import Link from "next/link";

// D16 — was /groups/[id] (flat); moved under /campaigns/[id]. groupId is
// validated against campaignId below (same reasoning as the template edit
// page), and the "available templates to add" list now comes from
// getTemplatesForCampaign instead of the unscoped getTemplates() — closes
// the same cross-campaign leak this whole ticket is about.
export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string; groupId: string }>;
}) {
  const { id: campaignId, groupId } = await params;
  // Guarded again here despite ../layout.tsx — see templates/page.tsx for
  // why the layout alone isn't enough to stop the query's data from
  // reaching the RSC payload.
  await requireCampaignDm(campaignId);
  const [group, templates] = await Promise.all([
    getGroupById(groupId),
    getTemplatesForCampaign(campaignId),
  ]);

  if (!group || group.campaignId !== campaignId) notFound();

  const memberTemplateIds = group.members.map((m) => m.templateId);
  const availableTemplates = templates.filter(
    (t) => !memberTemplateIds.includes(t.id)
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href={`/campaigns/${campaignId}/groups`} className="text-sm text-gothic-on-surface-variant hover:text-gothic-primary transition-colors">
          ← Volver a grupos
        </Link>
        <h1 className="font-gothic-headline text-gothic-headline-sm text-gothic-primary mt-1">{group.name}</h1>
        {group.description && (
          <p className="text-sm text-gothic-on-surface-variant mt-0.5">{group.description}</p>
        )}
      </div>

      {/* Current members */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gothic-on-surface-variant">
          Miembros ({group.members.length})
        </h2>

        {group.members.length === 0 && (
          <p className="text-sm text-gothic-on-surface-variant py-4 text-center">
            Sin miembros todavía. Agregá personajes abajo.
          </p>
        )}

        {group.members.map((m) => (
          <div key={m.id}
            className="flex items-center gap-3 rounded-gothic-md bg-gothic-surface-low ring-1 ring-gothic-outline-variant px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gothic-on-surface truncate">{m.template.name}</p>
              <p className="text-xs font-mono text-gothic-on-surface-variant">
                PV {m.template.maxHp} · CA {m.template.baseAc}
                {m.quantity > 1 && ` · ×${m.quantity}`}
              </p>
            </div>
            <form action={async () => {
              "use server";
              await removeGroupMember(m.id, group.id);
            }}>
              <button type="submit"
                aria-label={`Quitar a ${m.template.name}`}
                className="w-9 h-9 flex items-center justify-center rounded-gothic-sm text-gothic-on-surface-variant hover:text-gothic-danger-bright hover:bg-gothic-danger/20 transition-colors">
                ✕
              </button>
            </form>
          </div>
        ))}
      </section>

      {/* Add member */}
      {availableTemplates.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gothic-on-surface-variant">
            Agregar personaje
          </h2>
          <form action={async (fd) => {
            "use server";
            await addGroupMember(fd);
            }}
            className="rounded-gothic-md border border-dashed border-gothic-outline-variant bg-gothic-surface-low p-4 space-y-3">
            <input type="hidden" name="groupId" value={group.id} />
            <div className="flex gap-2">
              <select name="templateId"
                className="flex-1 rounded-gothic-sm bg-gothic-surface px-3 h-11 text-sm text-gothic-on-surface outline-none ring-1 ring-gothic-outline-variant focus:ring-gothic-primary transition-all">
                {availableTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — PV {t.maxHp} CA {t.baseAc}
                  </option>
                ))}
              </select>
              <input name="quantity" type="number" min={1} max={20} defaultValue={1}
                className="w-16 rounded-gothic-sm bg-gothic-surface px-2 h-11 text-center text-base font-mono text-gothic-on-surface outline-none ring-1 ring-gothic-outline-variant focus:ring-gothic-primary transition-all" />
              <button type="submit"
                className="rounded-gothic-sm bg-gothic-primary text-gothic-on-primary px-4 h-11 text-sm font-semibold shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] hover:bg-gothic-brass-bright transition-all">
                Agregar
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Start combat with this group — E5: crea el combate scopeado a la
          campaña del grupo, copia sus participantes y redirige al setup.
          Ver src/app/campaigns/[id]/groups/[groupId]/start-combat/route.ts. */}
      {group.members.length > 0 && (
        <Link
          href={`/campaigns/${campaignId}/groups/${group.id}/start-combat`}
          className="w-full h-12 rounded-gothic-md bg-gothic-primary text-gothic-on-primary font-semibold text-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] hover:bg-gothic-brass-bright transition-all flex items-center justify-center"
        >
          Iniciar combate con este grupo →
        </Link>
      )}
    </div>
  );
}
