import { requireCampaignDm } from "@/lib/auth/guards";

// D16 — guards /groups, /groups/new and /groups/[groupId] in one place
// instead of duplicating the check in all three pages.
export default async function GroupsLayout({
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
