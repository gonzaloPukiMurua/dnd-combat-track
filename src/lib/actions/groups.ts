"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type GroupFormState = {
  error?:   string;
  success?: boolean;
};

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
  const deleted = await prisma.groupMember.delete({ where: { id: memberId } });
  revalidatePath(`/campaigns/${deleted.campaignId}/groups/${groupId}`);
  return { success: true };
}

// ── Delete group ──────────────────────────────────────────────────────────────

export async function deleteGroup(id: string): Promise<GroupFormState> {
  const deleted = await prisma.group.delete({ where: { id } });
  revalidatePath(`/campaigns/${deleted.campaignId}/groups`);
  return { success: true };
}