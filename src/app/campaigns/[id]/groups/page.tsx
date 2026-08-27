import { getGroupsForCampaign } from "@/lib/actions/groups";
import { requireCampaignDm } from "@/lib/auth/guards";
import Link from "next/link";
import { GroupListFilter } from "@/components/templates/GroupListFilter";

// D16 — was the flat /groups route; moved under /campaigns/[id] so
// campaignId comes from the URL instead of being missing. Guarded again
// here despite ../layout.tsx — see templates/page.tsx for why the layout
// alone isn't enough to stop the query's data from reaching the RSC
// payload (Next can render a layout and its page's fetch in parallel).
export default async function GroupsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = await params;
  await requireCampaignDm(campaignId);
  const groups = await getGroupsForCampaign(campaignId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-gothic-headline text-gothic-headline-sm uppercase tracking-[0.1em] text-gothic-primary">
          Grupos
        </h1>
        <Link
          href={`/campaigns/${campaignId}/groups/new`}
          className="rounded-gothic-sm bg-gothic-primary px-4 h-10 flex items-center text-sm font-semibold text-gothic-on-primary shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] hover:bg-gothic-brass-bright transition-all"
        >
          + Nuevo grupo
        </Link>
      </div>

      {groups.length === 0 && (
        <div className="text-center py-12 text-gothic-on-surface-variant space-y-2">
          <p className="font-medium">Todavía no hay grupos</p>
          <p className="text-sm">Guardá tu grupo o un encuentro común para preparar combates más rápido.</p>
        </div>
      )}
      <GroupListFilter groups={groups} campaignId={campaignId} />
    </div>
  );
}
