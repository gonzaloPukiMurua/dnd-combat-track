import { requireCampaignDm } from "@/lib/auth/guards";

// D16 — guards /templates and /templates/[templateId]/edit in one place
// instead of duplicating the check in both pages.
export default async function TemplatesLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id: campaignId } = await params;
  await requireCampaignDm(campaignId);
  return children;
}
