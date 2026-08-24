import { NextResponse } from "next/server";
import { auth } from "@/auth";

// B3 — session-based routing:
//   "/"           → /campaigns if logged in, /login otherwise
//   "/campaigns/*" → requires a session, redirects to /login otherwise
//
// Renamed from `middleware.ts` to `proxy.ts` — Next.js 16 deprecated the
// `middleware` file convention in favor of `proxy` (same behavior, Node.js
// runtime only). See node_modules/next/dist/docs/.../proxy.md.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  if (pathname === "/") {
    return NextResponse.redirect(new URL(isLoggedIn ? "/campaigns" : "/login", req.nextUrl));
  }

  if (pathname.startsWith("/campaigns") && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/", "/campaigns", "/campaigns/:path*"],
};
