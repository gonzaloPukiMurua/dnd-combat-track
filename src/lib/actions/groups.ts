"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type GroupFormState = {
  error?:   string;
  success?: boolean;
};

// ── Queries ──────────────────────────────────────────────────────────────────

export async function getGroups() {
  return prisma.group.findMany({
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

  if (!name) return { error: "Name is required" };

  await prisma.group.create({
    data: { name, description },
  });

  revalidatePath("/groups");
  return { success: true };
}

// ── Add member to group ───────────────────────────────────────────────────────

export async function addGroupMember(formData: FormData): Promise<GroupFormState> {
  const groupId    = formData.get("groupId")?.toString();
  const templateId = formData.get("templateId")?.toString();
  const quantity   = Number(formData.get("quantity") ?? 1);

  if (!groupId || !templateId) return { error: "Missing required fields" };
  if (quantity < 1 || quantity > 20) return { error: "Quantity must be between 1 and 20" };

  // Upsert — if member already exists, update quantity
  await prisma.groupMember.upsert({
    where:  { groupId_templateId: { groupId, templateId } },
    update: { quantity },
    create: { groupId, templateId, quantity },
  });

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

// ── Remove member from group ──────────────────────────────────────────────────

export async function removeGroupMember(memberId: string, groupId: string): Promise<GroupFormState> {
  await prisma.groupMember.delete({ where: { id: memberId } });
  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

// ── Delete group ──────────────────────────────────────────────────────────────

export async function deleteGroup(id: string): Promise<GroupFormState> {
  await prisma.group.delete({ where: { id } });
  revalidatePath("/groups");
  return { success: true };
}