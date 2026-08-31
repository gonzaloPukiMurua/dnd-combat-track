import { NextResponse } from "next/server";
import { auth } from "@/auth";

// B3 — session-based routing:
//   "/"                  → /campaigns if logged in, /login otherwise
//   "/campaigns/*", "/join/*", "/profile" → require a session, redirect to
//   /login otherwise
//
// S2-7 added "/profile": it's a session-only gate (no campaign/role check),
// the same category as /campaigns and /join, so it belongs here rather than
// a per-page auth() check (that pattern is for /combat/* which needs
// membership + role beyond the session).
//
// Renamed from `middleware.ts` to `proxy.ts` — Next.js 16 deprecated the
// `middleware` file convention in favor of `proxy` (same behavior, Node.js
// runtime only). See node_modules/next/dist/docs/.../proxy.md.
const PROTECTED_PREFIXES = ["/campaigns", "/join", "/profile"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  if (pathname === "/") {
    return NextResponse.redirect(new URL(isLoggedIn ? "/campaigns" : "/login", req.nextUrl));
  }

  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/", "/campaigns", "/campaigns/:path*", "/join", "/join/:path*", "/profile", "/profile/:path*"],
};
