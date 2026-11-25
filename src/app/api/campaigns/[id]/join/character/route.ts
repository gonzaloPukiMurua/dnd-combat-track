import { NextRequest, NextResponse } from "next/server";
import { CharacterType, Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { levelError } from "@/domain/character/progression";
import { joinMode, type JoinMode } from "@/domain/campaign/join";

class TemplateNotFoundError extends Error {}
class TemplateUnavailableError extends Error {}
class AlreadyHasCharacterError extends Error {}

type JoinContext = {
  campaign: { name: string };
  mode: Exclude<JoinMode, "REJECT">;
  membership: { id: string; campaignId: string } | null;
};

// A5 / H4 — preconditions shared by GET and POST. Before A5 any existing
// member got ALREADY_MEMBER; now a PLAYER member who owns no character in
// this campaign may claim or create one (joinMode, domain/campaign/join.ts).
// DMs and players who already have a character are still rejected with
// ALREADY_MEMBER, same code as before, so the page keeps its message.
async function loadJoinContext(userId: string, campaignId: string): Promise<{ error: NextResponse } | JoinContext> {
  const [campaign, user, membership, owned] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: campaignId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } }),
    prisma.campaignMember.findUnique({ where: { userId_campaignId: { userId, campaignId } } }),
    prisma.characterTemplate.count({ where: { campaignId, ownerId: userId } }),
  ]);

  if (!campaign) return { error: NextResponse.json({ error: "CAMPAIGN_NOT_FOUND" }, { status: 404 }) };
  if (!user?.emailVerified) return { error: NextResponse.json({ error: "EMAIL_NOT_VERIFIED" }, { status: 403 }) };

  const mode = joinMode({ membershipRole: membership?.role ?? null, ownsCharacter: owned > 0 });
  if (mode === "REJECT") return { error: NextResponse.json({ error: "ALREADY_MEMBER" }, { status: 409 }) };

  return { campaign, mode, membership: membership ? { id: membership.id, campaignId: membership.campaignId } : null };
}

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

  const ctx = await loadJoinContext(userId, campaignId);
  if ("error" in ctx) return ctx.error;
  const { campaign } = ctx;

  const characters = await prisma.characterTemplate.findMany({
    where: { campaignId, ownerId: null, type: "PLAYER" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, level: true, maxHp: true, currentHp: true, baseAc: true },
  });

  // isMember: la pantalla cambia el texto para quien ya es jugador de la campaña (A5).
  return NextResponse.json({ campaignName: campaign.name, characters, isMember: ctx.mode === "MEMBER_WITHOUT_CHARACTER" });
}

// ─── C3 — Confirm campaign membership with a character ─────────────────────
// Either claims an existing ownerless CharacterTemplate from this campaign,
// or creates a new one owned by the current user. For a newcomer this is the
// step that actually creates the CampaignMember (role = PLAYER) — C2 only
// validated the invite code. A5: a PLAYER member without a character also
// comes through here and keeps their existing membership.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const { id: campaignId } = await params;

  const ctx = await loadJoinContext(userId, campaignId);
  if ("error" in ctx) return ctx.error;
  const join: JoinContext = ctx;
  const ownerId: string = userId;

  // A5: a newcomer gets a PLAYER membership in the same transaction as the
  // character; a member without a character keeps theirs. For a member the
  // owned-character check is repeated inside the transaction so a double
  // submit can't leave them with two characters.
  async function membershipFor(tx: Prisma.TransactionClient) {
    if (join.mode === "NEW_MEMBER") {
      return tx.campaignMember.create({ data: { userId: ownerId, campaignId, role: "PLAYER" } });
    }
    const owned = await tx.characterTemplate.count({ where: { campaignId, ownerId } });
    if (owned > 0) throw new AlreadyHasCharacterError();
    return join.membership;
  }

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
        const member = await membershipFor(tx);

        const claim = await tx.characterTemplate.updateMany({
          where: { id: templateId, campaignId, ownerId: null },
          data: { ownerId: userId },
        });
        if (claim.count === 0) throw new TemplateUnavailableError();

        const updatedTemplate = await tx.characterTemplate.findUniqueOrThrow({ where: { id: templateId } });

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
    // D-12: el formulario no manda nivel (queda en 1), pero la ruta acepta uno: se valida igual.
    const level = numberOr(body.level, 1);
    if (levelError({ type: "PLAYER", level })) return NextResponse.json({ error: "INVALID_LEVEL" }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const member = await membershipFor(tx);
      const template = await tx.characterTemplate.create({
        data: {
          campaignId,
          ownerId: userId,
          name,
          type: CharacterType.PLAYER,
          maxHp,
          baseAc,
          initiativeBonus: numberOr(body.initiativeBonus, 0),
          level,
          // proficiencyBonus ya no se escribe: sale del nivel (D-5, T11).
          str: numberOr(body.str, 10),
          dex: numberOr(body.dex, 10),
          con: numberOr(body.con, 10),
          int: numberOr(body.int, 10),
          wis: numberOr(body.wis, 10),
          cha: numberOr(body.cha, 10),
        },
      });
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
    if (error instanceof AlreadyHasCharacterError) {
      return NextResponse.json({ error: "ALREADY_MEMBER" }, { status: 409 });
    }
    throw error;
  }
}
