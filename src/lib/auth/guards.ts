import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Same membership+role check as /campaigns/[id]/combat/new (D14a), reused
// here for Personajes/Grupos (D16) — both are DM-only tools (spec-tecnico
// §4 decisión 6). Maps to notFound() instead of a JSON 403 since these are
// pages, not API routes — same "can't tell the campaign exists" pattern the
// hub already uses (C5) for non-members.
export async function requireCampaignDm(campaignId: string): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) notFound();

  const membership = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
  });
  if (!membership || membership.role !== "DM") notFound();
}
