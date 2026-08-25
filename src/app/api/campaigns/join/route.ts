import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ─── C2 — Join a campaign by invite code ────────────────────────────────────
// Only validates the code and the user's verification status — does NOT
// create the CampaignMember. That happens in C3, once a character has been
// picked or created, so a user never becomes a member without a character.
export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const inviteCode = typeof body?.inviteCode === "string" ? body.inviteCode.trim().toUpperCase() : "";
  if (!inviteCode) return NextResponse.json({ error: "INVITE_CODE_REQUIRED" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } });
  if (!user?.emailVerified) {
    return NextResponse.json({ error: "EMAIL_NOT_VERIFIED" }, { status: 403 });
  }

  const campaign = await prisma.campaign.findUnique({ where: { inviteCode } });
  if (!campaign) return NextResponse.json({ error: "INVALID_INVITE_CODE" }, { status: 404 });

  const existingMembership = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId, campaignId: campaign.id } },
  });

  return NextResponse.json({
    campaignId: campaign.id,
    campaignName: campaign.name,
    alreadyMember: !!existingMembership,
  });
}
