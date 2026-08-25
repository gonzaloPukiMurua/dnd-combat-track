import { NextRequest, NextResponse } from "next/server";
import { CharacterType } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

class TemplateNotFoundError extends Error {}
class TemplateUnavailableError extends Error {}

function numberOr<T extends number>(value: unknown, fallback: T): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// ─── D7 — List joinable characters ──────────────────────────────────────────
// Not in the original C3 ticket (that one only defines the POST) — added
// here rather than as a separate route since it's the same resource: GET
// lists what you can join with, POST claims/creates one. Same guard set as
// POST, so the roster itself isn't visible before those preconditions hold.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const { id: campaignId } = await params;

  const [campaign, user, existingMembership] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: campaignId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } }),
    prisma.campaignMember.findUnique({ where: { userId_campaignId: { userId, campaignId } } }),
  ]);

  if (!campaign) return NextResponse.json({ error: "CAMPAIGN_NOT_FOUND" }, { status: 404 });
  if (!user?.emailVerified) return NextResponse.json({ error: "EMAIL_NOT_VERIFIED" }, { status: 403 });
  if (existingMembership) return NextResponse.json({ error: "ALREADY_MEMBER" }, { status: 409 });

  const characters = await prisma.characterTemplate.findMany({
    where: { campaignId, ownerId: null, type: "PLAYER" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, level: true, maxHp: true, currentHp: true, baseAc: true },
  });

  return NextResponse.json({ campaignName: campaign.name, characters });
}

// ─── C3 — Confirm campaign membership with a character ─────────────────────
// Either claims an existing ownerless CharacterTemplate from this campaign,
// or creates a new one owned by the current user. Either way, this is the
// step that actually creates the CampaignMember (role = PLAYER) — C2 only
// validated the invite code.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const { id: campaignId } = await params;

  const [campaign, user, existingMembership] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: campaignId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } }),
    prisma.campaignMember.findUnique({ where: { userId_campaignId: { userId, campaignId } } }),
  ]);

  if (!campaign) return NextResponse.json({ error: "CAMPAIGN_NOT_FOUND" }, { status: 404 });
  if (!user?.emailVerified) return NextResponse.json({ error: "EMAIL_NOT_VERIFIED" }, { status: 403 });
  if (existingMembership) return NextResponse.json({ error: "ALREADY_MEMBER" }, { status: 409 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  try {
    if (typeof body.characterTemplateId === "string" && body.characterTemplateId) {
      const templateId = body.characterTemplateId;

      const result = await prisma.$transaction(async (tx) => {
        const template = await tx.characterTemplate.findUnique({ where: { id: templateId } });
        if (!template || template.campaignId !== campaignId) {
          throw new TemplateNotFoundError();
        }

        // Atomic claim — only succeeds if ownerId is still null. If someone
        // else took it in the meantime this updates zero rows instead of
        // overwriting their claim.
        const claim = await tx.characterTemplate.updateMany({
          where: { id: templateId, campaignId, ownerId: null },
          data: { ownerId: userId },
        });
        if (claim.count === 0) throw new TemplateUnavailableError();

        const [member, updatedTemplate] = await Promise.all([
          tx.campaignMember.create({ data: { userId, campaignId, role: "PLAYER" } }),
          tx.characterTemplate.findUniqueOrThrow({ where: { id: templateId } }),
        ]);

        return { member, template: updatedTemplate };
      });

      return NextResponse.json(result, { status: 201 });
    }

    // New character
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const maxHp = Number(body.maxHp);
    const baseAc = Number(body.baseAc);

    if (!name) return NextResponse.json({ error: "NAME_REQUIRED" }, { status: 400 });
    if (!Number.isFinite(maxHp) || maxHp < 1) return NextResponse.json({ error: "INVALID_MAX_HP" }, { status: 400 });
    if (!Number.isFinite(baseAc) || baseAc < 1) return NextResponse.json({ error: "INVALID_BASE_AC" }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const template = await tx.characterTemplate.create({
        data: {
          campaignId,
          ownerId: userId,
          name,
          type: CharacterType.PLAYER,
          maxHp,
          baseAc,
          initiativeBonus: numberOr(body.initiativeBonus, 0),
          level: numberOr(body.level, 1),
          proficiencyBonus: numberOr(body.proficiencyBonus, 2),
          str: numberOr(body.str, 10),
          dex: numberOr(body.dex, 10),
          con: numberOr(body.con, 10),
          int: numberOr(body.int, 10),
          wis: numberOr(body.wis, 10),
          cha: numberOr(body.cha, 10),
        },
      });
      const member = await tx.campaignMember.create({ data: { userId, campaignId, role: "PLAYER" } });
      return { member, template };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof TemplateNotFoundError) {
      return NextResponse.json({ error: "TEMPLATE_NOT_FOUND" }, { status: 404 });
    }
    if (error instanceof TemplateUnavailableError) {
      return NextResponse.json({ error: "TEMPLATE_ALREADY_TAKEN" }, { status: 409 });
    }
    throw error;
  }
}
