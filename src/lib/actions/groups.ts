"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCampaignDmAction, UnauthorizedError } from "@/lib/auth/action-guards";

export type GroupFormState = {
  error?:   string;
  success?: boolean;
};

// S2-0 — group management is DM-only, on the group's own campaign. The
// action-guards throw; this file answers with form-state { error }, so the
// throw is adapted here. A non-auth error still propagates.
async function requireDm(campaignId: string): Promise<GroupFormState | null> {
  try {
    await requireCampaignDmAction(campaignId);
    return null;
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: err.message };
    throw err;
  }
}

// ── Queries ──────────────────────────────────────────────────────────────────

// Groups aren't portable between campaigns, so every caller must go through
// the scoped query below. There is deliberately no unscoped getGroups();
// that was D16's bug (mixed every campaign's groups together on /groups).
export async function getGroupsForCampaign(campaignId: string) {
  return prisma.group.findMany({
    where:   { campaignId },
    orderBy: { createdAt: "desc" },
    include: {
      members: {
        include: { template: true },
      },
    },
  });
}

export async function getGroupById(id: string) {
  return prisma.group.findUnique({
    where: { id },
    include: {
      members: {
        include: { template: true },
      },
    },
  });
}

// ── Create group ─────────────────────────────────────────────────────────────

export async function createGroup(
  _prevState: GroupFormState,
  formData: FormData
): Promise<GroupFormState> {
  const name        = formData.get("name")?.toString().trim();
  const description = formData.get("description")?.toString().trim();
  const campaignId  = formData.get("campaignId")?.toString();

  if (!campaignId) return { error: "Missing campaignId" };

  const denied = await requireDm(campaignId);
  if (denied) return denied;

  if (!name) return { error: "Name is required" };

  await prisma.group.create({
    data: { name, description, campaignId },
  });

  revalidatePath(`/campaigns/${campaignId}/groups`);
  return { success: true };
}

// ── Add member to group ───────────────────────────────────────────────────────

export async function addGroupMember(formData: FormData): Promise<GroupFormState> {
  const groupId    = formData.get("groupId")?.toString();
  const templateId = formData.get("templateId")?.toString();
  const quantity   = Number(formData.get("quantity") ?? 1);

  if (!groupId || !templateId) return { error: "Missing required fields" };
  if (quantity < 1 || quantity > 20) return { error: "Quantity must be between 1 and 20" };

  const [group, template] = await Promise.all([
    prisma.group.findUnique({ where: { id: groupId } }),
    prisma.characterTemplate.findUnique({ where: { id: templateId } }),
  ]);
  if (!group) return { error: "Group not found" };

  const denied = await requireDm(group.campaignId);
  if (denied) return denied;

  if (!template) return { error: "Template not found" };
  // Same cross-campaign check as addParticipant (lib/actions/combat.ts) —
  // templates aren't portable between campaigns.
  if (template.campaignId !== group.campaignId) return { error: "Template belongs to a different campaign" };

  // Upsert — if member already exists, update quantity
  await prisma.groupMember.upsert({
    where:  { groupId_templateId: { groupId, templateId } },
    update: { quantity },
    create: { groupId, templateId, quantity, campaignId: group.campaignId },
  });

  revalidatePath(`/campaigns/${group.campaignId}/groups/${groupId}`);
  return { success: true };
}

// ── Remove member from group ──────────────────────────────────────────────────

export async function removeGroupMember(memberId: string, groupId: string): Promise<GroupFormState> {
  const group = await prisma.group.findUnique({
    where:  { id: groupId },
    select: { campaignId: true },
  });
  if (!group) return { error: "Group not found" };

  const denied = await requireDm(group.campaignId);
  if (denied) return denied;

  // memberId arrives from the client next to groupId — confirm it's actually
  // a member of this (authorized) group before deleting (S2-0).
  const member = await prisma.groupMember.findUnique({
    where:  { id: memberId },
    select: { groupId: true },
  });
  if (!member || member.groupId !== groupId) {
    return { error: "Member not found in this group" };
  }

  await prisma.groupMember.delete({ where: { id: memberId } });
  revalidatePath(`/campaigns/${group.campaignId}/groups/${groupId}`);
  return { success: true };
}

// ── Delete group ──────────────────────────────────────────────────────────────

export async function deleteGroup(id: string): Promise<GroupFormState> {
  const group = await prisma.group.findUnique({
    where:  { id },
    select: { campaignId: true },
  });
  if (!group) return { error: "Group not found" };

  const denied = await requireDm(group.campaignId);
  if (denied) return denied;

  const deleted = await prisma.group.delete({ where: { id } });
  revalidatePath(`/campaigns/${deleted.campaignId}/groups`);
  return { success: true };
}