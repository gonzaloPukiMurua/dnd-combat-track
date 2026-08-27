import { getTemplatesForCampaign } from "@/lib/actions/templates";
import { requireCampaignDm } from "@/lib/auth/guards";
import { CreateTemplateForm } from "@/components/templates/CreateTemplateForm";
import { RestPanel } from "@/components/templates/RestPanel";
import { TemplateListFilter } from "@/components/templates/TemplatesListFilter";

// D16 — was the flat /templates route; moved under /campaigns/[id] so
// campaignId comes from the URL instead of being missing. Guarded again
// here (../layout.tsx already guards the segment) because Next can render
// a layout and its page's data fetch in parallel — a layout-only notFound()
// still lets the page's query execute and stream in the RSC payload even
// though the visible tree shows not-found. Awaiting the guard before the
// query, in the same function, closes that leak.
export default async function TemplatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = await params;
  await requireCampaignDm(campaignId);
  const templates = await getTemplatesForCampaign(campaignId);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-gothic-headline text-gothic-headline-sm uppercase tracking-[0.1em] text-gothic-primary">
        Personajes
      </h1>

      {/* Create form */}
      <CreateTemplateForm campaignId={campaignId} />

      {/* Empty state */}
      {templates.length === 0 && (
        <p className="rounded-gothic-md bg-gothic-surface-low p-8 text-center text-sm text-gothic-on-surface-variant ring-1 ring-gothic-outline-variant">
          Todavía no hay personajes. Creá el primero arriba.
        </p>
      )}

      {/* Filterable list */}
      <TemplateListFilter templates={templates} campaignId={campaignId} />

      <RestPanel templates={templates} />
    </div>
  );
}
