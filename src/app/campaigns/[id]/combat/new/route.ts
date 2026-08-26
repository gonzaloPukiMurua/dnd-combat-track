import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createCombat } from "@/lib/actions/combat";

// D14a — entry point for "Nuevo combate" from the campaign hub (D14b).
// "Combate" is an action inside a campaign, not a top-level route (spec
// §4 decisión 8), so creation is scoped here rather than through the old
// global /combat form. Reuses createCombat (Épica C) — which already
// enforces one SETUP/ACTIVE combat per campaign and redirects to
// /combat/[id]/setup — instead of duplicating that logic.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const { id: campaignId } = await params;

  const membership = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
  });
  if (!membership || membership.role !== "DM") {
    return NextResponse.json({ error: "NOT_DM" }, { status: 403 });
  }

  const formData = new FormData();
  formData.set("campaignId", campaignId);
  await createCombat(formData);
}
