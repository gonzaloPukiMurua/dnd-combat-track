"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { signOut } from "next-auth/react";

// S2-2 — user menu dropdown. Radix primitive (unstyled) dressed with the
// Etapa 1 tokens: flat colour, 2–4px radii, ring borders, Hanken Grotesk
// (font-gothic-body) for every string — no textures, no JetBrains Mono
// (this is UI text, not a game figure).
//
// The logout item calls next-auth's client signOut(). It works without a
// <SessionProvider>: signOut() only fetches the CSRF token, POSTs to
// /api/auth/signout and then sets window.location — it never touches the
// React session context.
type Props = { name: string | null; email: string | null };

export function UserMenu({ name, email }: Props) {
  const initial = (name?.trim()[0] ?? email?.trim()[0] ?? "?").toUpperCase();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Menú de usuario"
        data-testid="user-menu-trigger"
        className="flex h-9 w-9 items-center justify-center rounded-gothic-sm bg-gothic-surface-high font-gothic-body text-sm font-semibold text-gothic-on-surface ring-1 ring-gothic-outline-variant transition-colors hover:bg-gothic-surface hover:ring-gothic-outline focus:outline-none focus-visible:ring-2 focus-visible:ring-gothic-brass-bright data-[state=open]:ring-gothic-brass-bright"
      >
        {initial}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-52 rounded-gothic-md bg-gothic-surface-low p-1 font-gothic-body ring-1 ring-gothic-outline-variant shadow-[0_4px_12px_rgba(0,0,0,0.45)]"
        >
          {(name || email) && (
            <>
              <DropdownMenu.Label className="px-3 py-2">
                {name && (
                  <span className="block truncate text-sm font-medium text-gothic-on-surface">
                    {name}
                  </span>
                )}
                {email && (
                  <span className="block truncate text-xs text-gothic-on-surface-variant">
                    {email}
                  </span>
                )}
              </DropdownMenu.Label>
              <DropdownMenu.Separator className="my-1 h-px bg-gothic-outline-variant" />
            </>
          )}

          <DropdownMenu.Item asChild>
            <Link
              href="/profile"
              data-testid="user-menu-profile"
              className="block cursor-pointer select-none rounded-gothic-sm px-3 py-2 text-sm text-gothic-on-surface outline-none transition-colors data-[highlighted]:bg-gothic-surface-high"
            >
              Mi perfil
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-gothic-outline-variant" />

          <DropdownMenu.Item
            data-testid="user-menu-logout"
            onSelect={() => signOut({ redirectTo: "/login" })}
            className="cursor-pointer select-none rounded-gothic-sm px-3 py-2 text-sm text-gothic-on-surface outline-none transition-colors data-[highlighted]:bg-gothic-surface-high"
          >
            Cerrar sesión
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
