import { headers } from "next/headers";

// Server-side fetch (unlike browser fetch) needs an absolute URL — this
// derives the app's own origin from the incoming request so server code can
// call its own API routes.
export async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${protocol}://${host}`;
}
