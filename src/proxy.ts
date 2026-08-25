import { NextResponse } from "next/server";
import { auth } from "@/auth";

// B3 — session-based routing:
//   "/"                  → /campaigns if logged in, /login otherwise
//   "/campaigns/*", "/join/*" → require a session, redirect to /login otherwise
//
// Renamed from `middleware.ts` to `proxy.ts` — Next.js 16 deprecated the
// `middleware` file convention in favor of `proxy` (same behavior, Node.js
// runtime only). See node_modules/next/dist/docs/.../proxy.md.
const PROTECTED_PREFIXES = ["/campaigns", "/join"];

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
  matcher: ["/", "/campaigns", "/campaigns/:path*", "/join", "/join/:path*"],
};
