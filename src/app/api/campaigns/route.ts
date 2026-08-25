import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateUniqueInviteCode } from "@/lib/utils/campaign";

const MAX_CREATE_ATTEMPTS = 3;

// ─── C1 — Create campaign ───────────────────────────────────────────────────
// Creates the Campaign and the creator's CampaignMember (role = DM) in one
// transaction. Retries with a fresh invite code if a concurrent insert wins
// the race on the unique constraint.
export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";

  if (!name) return NextResponse.json({ error: "NAME_REQUIRED" }, { status: 400 });

  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
    const inviteCode = await generateUniqueInviteCode();

    try {
      const campaign = await prisma.$transaction(async (tx) => {
        const created = await tx.campaign.create({
          data: { name, description: description || null, inviteCode, ownerId: userId },
        });
        await tx.campaignMember.create({
          data: { userId, campaignId: created.id, role: "DM" },
        });
        return created;
      });

      return NextResponse.json({ campaign }, { status: 201 });
    } catch (error) {
      const isInviteCodeCollision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        (error.meta?.target as string[] | undefined)?.includes("inviteCode");

      if (isInviteCodeCollision && attempt < MAX_CREATE_ATTEMPTS - 1) continue;
      throw error;
    }
  }

  throw new Error("Could not create campaign after multiple invite code collisions");
}

// ─── C4 — List the current user's campaigns ─────────────────────────────────
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const memberships = await prisma.campaignMember.findMany({
    where: { userId },
    include: { campaign: true },
    orderBy: { joinedAt: "desc" },
  });

  const campaignIds = memberships.map((m) => m.campaignId);
  const activeCombats = await prisma.combat.findMany({
    where: { campaignId: { in: campaignIds }, status: { in: ["SETUP", "ACTIVE"] } },
    select: { campaignId: true },
  });
  const campaignsWithActiveCombat = new Set(activeCombats.map((c) => c.campaignId));

  const campaigns = memberships.map((m) => ({
    id: m.campaign.id,
    name: m.campaign.name,
    description: m.campaign.description,
    inviteCode: m.campaign.inviteCode,
    role: m.role,
    hasActiveCombat: campaignsWithActiveCombat.has(m.campaignId),
    createdAt: m.campaign.createdAt,
  }));

  return NextResponse.json({ campaigns });
}
