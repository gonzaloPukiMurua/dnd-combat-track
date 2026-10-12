import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createCombatRecord } from "@/lib/actions/combat";

// D14a — entry point for "Nuevo combate" from the campaign hub (D14b).
// "Combate" is an action inside a campaign, not a top-level route (spec
// §4 decisión 8), so creation is scoped here rather than through the old
// global /combat form.
//
// Calls createCombatRecord directly and returns an explicit
// NextResponse.redirect — Route Handlers use the Web Request/Response API;
// next/navigation's redirect() is for Server/Client Components and Server
// Actions, and this route previously imported the "use server" action
// createCombat (Épica C) and invoked it like a plain function just to reach
// its redirect(). That indirection is gone.
//
// Found 2026-10-11 investigating a bare 500 in production: createCombatRecord
// enforces one SETUP/ACTIVE combat per campaign by throwing, and nothing here
// caught it — every click of "Nuevo combate" on a campaign that already had
// one open (including the one just created by the click that 500'd) failed
// the same way. Now that case redirects to the existing combat instead.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  let combatId: string;
  try {
    combatId = (await createCombatRecord(campaignId)).id;
  } catch {
    const existing = await prisma.combat.findFirst({
      where:   { campaignId, status: { in: ["SETUP", "ACTIVE"] } },
      orderBy: { createdAt: "desc" },
    });
    // createCombatRecord only throws for the "already in progress" case, so an
    // existing combat should always be there; if not, something else broke —
    // surface it instead of swallowing it as a redirect.
    if (!existing) throw new Error("Failed to create or find a combat for this campaign");
    combatId = existing.id;
  }

  return NextResponse.redirect(new URL(`/combat/${combatId}/setup`, request.url));
}
