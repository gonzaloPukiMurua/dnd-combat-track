import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveCombatForCampaign, getPreviousCombatsForCampaign } from "@/lib/actions/queries/combat";

// ─── C5 — Campaign hub ──────────────────────────────────────────────────────
// Active combat + combat history for the campaign. Membership is required
// (403 otherwise), and management data (invite code, member roster) is only
// included for DM members — enforced here, not left for the frontend to hide.
//
// D8/D9 extension: the hub's status block (spec §4 decisión 6 — "agregado
// del grupo para el DM, personaje propio para el jugador") needed data this
// endpoint didn't return yet, so it's added here rather than a new route:
//   - DM: partyStatus — average HP% across claimed PLAYER templates in the
//     campaign, and how many players have joined. Deliberately NOT the
//     `Group` model — Groups are DM-authored encounter presets (NPCs/
//     monsters), not "the party".
//   - Player: ownCharacter — their own CharacterTemplate in this campaign.
// No "estamina"/"condición" fields — neither exists on CharacterTemplate
// outside of live combat, so nothing was added for them (see spec §8
// bitácora for the reasoning).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const { id: campaignId } = await params;

  const membership = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "NOT_A_MEMBER" }, { status: 403 });

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return NextResponse.json({ error: "CAMPAIGN_NOT_FOUND" }, { status: 404 });

  const isDM = membership.role === "DM";

  const [activeCombat, previousCombats, members, partyTemplates, ownCharacter] = await Promise.all([
    getActiveCombatForCampaign(campaignId),
    getPreviousCombatsForCampaign(campaignId),
    isDM
      ? prisma.campaignMember.findMany({
          where:   { campaignId },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { joinedAt: "asc" },
        })
      : Promise.resolve(undefined),
    isDM
      ? prisma.characterTemplate.findMany({
          where:  { campaignId, type: "PLAYER", ownerId: { not: null } },
          select: { maxHp: true, currentHp: true },
        })
      : Promise.resolve(undefined),
    isDM
      ? Promise.resolve(undefined)
      : prisma.characterTemplate.findFirst({
          where:  { campaignId, ownerId: userId },
          select: { id: true, name: true, level: true, maxHp: true, currentHp: true, baseAc: true },
        }),
  ]);

  const partyStatus = partyTemplates && {
    playerCount: partyTemplates.length,
    averageHpPercent:
      partyTemplates.length === 0
        ? null
        : Math.round(
            (partyTemplates.reduce((sum, t) => sum + (t.currentHp ?? t.maxHp) / t.maxHp, 0) / partyTemplates.length) *
              100
          ),
  };

  return NextResponse.json({
    campaign: {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      createdAt: campaign.createdAt,
      ...(isDM ? { inviteCode: campaign.inviteCode } : {}),
    },
    role: membership.role,
    activeCombat,
    previousCombats,
    ...(members ? { members } : {}),
    ...(partyStatus ? { partyStatus } : {}),
    ...(isDM ? {} : { ownCharacter }),
  });
}

// ─── S2-3 — Edit campaign (DM-only) ─────────────────────────────────────────
// Same inline guard shape as the GET above, plus a role check: a non-DM
// member gets 403 NOT_DM (consistent with NOT_A_MEMBER). Only name and
// description are editable.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const { id: campaignId } = await params;

  const membership = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "NOT_A_MEMBER" }, { status: 403 });
  if (membership.role !== "DM") return NextResponse.json({ error: "NOT_DM" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";

  if (!name) return NextResponse.json({ error: "NAME_REQUIRED" }, { status: 400 });

  const campaign = await prisma.campaign.update({
    where: { id: campaignId },
    data: { name, description: description || null },
  });

  return NextResponse.json({
    campaign: {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      createdAt: campaign.createdAt,
      inviteCode: campaign.inviteCode,
    },
  });
}
