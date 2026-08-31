import Link from "next/link";
import { auth } from "@/auth";
import { UserMenu } from "@/components/nav/UserMenu";

// S2-1 — persistent global wayfinding header. Replaces the Navbar.tsx that
// was deleted in Sprint 1 (D16). This is deliberately NOT a global tab bar
// (spec técnico, decisión 10 sigue vigente): it only answers "where am I"
// and "how do I get back to my campaign list", plus the user menu (S2-2).
//
// Mounted at the two authenticated subtree roots — campaigns/layout.tsx and
// combat/layout.tsx — never over /login, /register or /join. It adds no auth
// guard of its own: proxy.ts protects /campaigns and /join, and every
// /combat/[id]/* page runs its own session + membership check per the D16
// rule (guards live in page.tsx, not in a plain layout).
export async function AppHeader() {
  const user = (await auth())?.user ?? null;

  return (
    <header
      data-testid="app-header"
      className="border-b border-gothic-outline-variant bg-gothic-surface-low"
    >
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-6">
        <Link
          href="/campaigns"
          data-testid="app-header-wordmark"
          className="font-gothic-headline text-lg uppercase tracking-[0.2em] text-gothic-primary transition-colors hover:text-gothic-brass-bright"
        >
          GRIMOIRE
        </Link>

        {user && <UserMenu name={user.name ?? null} email={user.email ?? null} />}
      </div>
    </header>
  );
}
