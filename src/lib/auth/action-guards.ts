import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { CampaignMember } from "@prisma/client";

// S2-0 — write-side counterpart of src/lib/auth/guards.ts (requireCampaignDm,
// the first line of every management page.tsx since D16). Server Actions are
// a *separate* entry point: once compiled they are reachable via a direct
// POST regardless of which screen imports them (see
// node_modules/next/dist/docs/01-app/02-guides/data-security.md →
// "Built-in Server Actions Security features"), so the
// authenticated-and-CampaignMember check has to be repeated at the mutation
// itself — it isn't inherited from the page that renders the button.
//
// Difference from guards.ts: these throw instead of calling notFound(). A
// Server Action has no page to turn into a 404. The message stays generic
// ("No autorizado") so someone probing ids can't tell "doesn't exist" apart
// from "exists but not yours".

export class UnauthorizedError extends Error {
  constructor(message = "No autorizado") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

type CombatContext = { campaignId: string; membership: CampaignMember };
type ParticipantContext = {
  participantId: string;
  combatId: string;
  campaignId: string;
  membership: CampaignMember;
};
type TemplateOwnerContext = { templateId: string; campaignId: string; ownerId: string };

// ─── Primitives ──────────────────────────────────────────────────────────────

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new UnauthorizedError();
  return userId;
}

async function membershipOrThrow(campaignId: string): Promise<CampaignMember> {
  const userId = await requireUserId();
  const membership = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
  });
  if (!membership) throw new UnauthorizedError();
  return membership;
}

// ─── Campaign-scoped ─────────────────────────────────────────────────────────

export async function requireCampaignMembership(campaignId: string): Promise<CampaignMember> {
  return membershipOrThrow(campaignId);
}

export async function requireCampaignDmAction(campaignId: string): Promise<CampaignMember> {
  const membership = await membershipOrThrow(campaignId);
  if (membership.role !== "DM") throw new UnauthorizedError();
  return membership;
}

// ─── Combat-scoped (resolves the campaign that owns the combat) ───────────────

export async function requireCombatMembership(combatId: string): Promise<CombatContext> {
  const combat = await prisma.combat.findUnique({
    where: { id: combatId },
    select: { campaignId: true },
  });
  if (!combat) throw new UnauthorizedError();
  const membership = await membershipOrThrow(combat.campaignId);
  return { campaignId: combat.campaignId, membership };
}

export async function requireCombatDm(combatId: string): Promise<CombatContext> {
  const ctx = await requireCombatMembership(combatId);
  if (ctx.membership.role !== "DM") throw new UnauthorizedError();
  return ctx;
}

// ─── Participant-scoped ──────────────────────────────────────────────────────

// DM: any participant belonging to a combat of their campaign.
// Player: only the participant fielded by their own claimed CharacterTemplate
// — the same rule SpectateView applies client-side via `isMyCharacter`
// (p.id === playerParticipantId, where playerParticipantId comes from the
// CharacterTemplate whose ownerId is the viewer). Used for mutations that
// live in both CombatRow (DM) and SpectateView (player, own row): damage,
// heal, conditions, death saves.
export async function requireParticipantAccess(participantId: string): Promise<ParticipantContext> {
  const userId = await requireUserId();

  const participant = await prisma.combatParticipant.findUnique({
    where: { id: participantId },
    select: { id: true, combatId: true, templateId: true, combat: { select: { campaignId: true } } },
  });
  if (!participant) throw new UnauthorizedError();

  const campaignId = participant.combat.campaignId;
  const membership = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
  });
  if (!membership) throw new UnauthorizedError();

  if (membership.role !== "DM") {
    // Player — the participant must instantiate a template they own. A
    // monster participant (templateId null, etapa-3-monstruos.md §5) has no
    // player owner by construction, so it falls through to unauthorized here
    // without a query — the same "only the DM can act on this" outcome NPCs
    // without an ownerId already had.
    if (!participant.templateId) throw new UnauthorizedError();
    const owned = await prisma.characterTemplate.findFirst({
      where: { id: participant.templateId, ownerId: userId },
      select: { id: true },
    });
    if (!owned) throw new UnauthorizedError();
  }

  return { participantId: participant.id, combatId: participant.combatId, campaignId, membership };
}

// ─── Template-owner-scoped ───────────────────────────────────────────────────

// S2-6 — for data that belongs to the player who owns the character, not to
// the DM who manages the campaign: the free-text `notes` field. Being DM of
// the campaign is deliberately NOT enough — a player's notes are personal.
// The only pass is CharacterTemplate.ownerId === current user.
export async function requireTemplateOwner(templateId: string): Promise<TemplateOwnerContext> {
  const userId = await requireUserId();

  const template = await prisma.characterTemplate.findUnique({
    where: { id: templateId },
    select: { id: true, campaignId: true, ownerId: true },
  });
  if (!template || template.ownerId !== userId) throw new UnauthorizedError();

  return { templateId: template.id, campaignId: template.campaignId, ownerId: userId };
}

// DM-only variant, for controls that share a component with the player view
// but only render in CombatRow, never in SpectateView (temp HP, AC
// modifiers, action/bonus/reaction toggles).
export async function requireParticipantDmAccess(participantId: string): Promise<ParticipantContext> {
  const participant = await prisma.combatParticipant.findUnique({
    where: { id: participantId },
    select: { id: true, combatId: true, combat: { select: { campaignId: true } } },
  });
  if (!participant) throw new UnauthorizedError();

  const campaignId = participant.combat.campaignId;
  const membership = await membershipOrThrow(campaignId);
  if (membership.role !== "DM") throw new UnauthorizedError();

  return { participantId: participant.id, combatId: participant.combatId, campaignId, membership };
}
