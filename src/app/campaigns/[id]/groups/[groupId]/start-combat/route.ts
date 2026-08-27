import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startCombatFromGroup } from "@/lib/actions/combat";

// E5 — entry point for "Start combat with this group" (/campaigns/[id]/groups/[groupId]).
// Moved here from /groups/[id]/start-combat under D16's nesting. Mirrors
// src/app/campaigns/[id]/combat/new/route.ts (D14a): a GET route so the
// button can stay a plain Link, DM-only guard checked here rather than
// inside the reusable action. The DM check — and startCombatFromGroup's own
// campaign scoping — trusts the Group record's own campaignId, not the
// campaignId segment in the URL, so a mismatched URL can't be used to act
// on a group under the wrong campaign.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const { groupId } = await params;

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const membership = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId, campaignId: group.campaignId } },
  });
  if (!membership || membership.role !== "DM") {
    return NextResponse.json({ error: "NOT_DM" }, { status: 403 });
  }

  await startCombatFromGroup(groupId);
}
