import { redirect } from "next/navigation";

// D14c — this used to be a global combat list + creation form, predating
// campaigns. It queried prisma.combat.findMany() with no campaignId filter,
// mixing combats across every campaign the user is (or isn't even) a member
// of — the same violation of spec §4 decisión 8 ("combate no es ruta de
// nivel superior") that /join had before D6 replaced it. Combat creation now
// lives at /campaigns/[id]/combat/new (D14a), scoped to a single campaign;
// there's no correct global replacement for this list, so it just sends
// people back to their campaigns.
export default function CombatPage() {
  redirect("/campaigns");
}
