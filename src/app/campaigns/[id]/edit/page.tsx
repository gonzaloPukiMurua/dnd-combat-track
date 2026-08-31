import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCampaignDm } from "@/lib/auth/guards";
import { EditCampaignForm } from "./EditCampaignForm";

// S2-3 — edit campaign, DM-only. The DM guard runs before any data is read
// (same as the templates/groups pages: requireCampaignDm → notFound), so a
// non-DM member never sees the current campaign name.
//
// Deviation from the plan (which asked for a GET /api/campaigns/[id] fetch
// like the hub): the preload reads Prisma directly. Server-side fetches back
// to an own-origin route handler compete for the dev server's limited
// request workers, and stacking several across the hub → edit → save flow
// stalled it under the e2e run. requireCampaignDm already does the auth +
// membership lookup; this just adds the row read. See updateCampaign in
// lib/actions/campaigns.ts for the matching call on the write side.
export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: campaignId } = await params;
  await requireCampaignDm(campaignId);

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { name: true, description: true },
  });
  if (!campaign) notFound();

  return (
    <EditCampaignForm
      campaignId={campaignId}
      name={campaign.name}
      description={campaign.description ?? ""}
    />
  );
}
