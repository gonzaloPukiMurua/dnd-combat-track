import { AppHeader } from "@/components/nav/AppHeader";

// S2-1 — the persistent global header also wraps the combat subtree
// (/combat/[id], /combat/[id]/setup, /combat/[id]/spectate).
//
// Render-only, NO auth guard here: proxy.ts does not cover /combat, and per
// the D16 rule every combat page.tsx runs its own auth() + CampaignMember +
// role check. Each combat page keeps its own `mx-auto max-w-lg` container,
// so this layout deliberately adds no wrapper of its own.
export default function CombatLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}
