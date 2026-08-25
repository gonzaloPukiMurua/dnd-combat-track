import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { JoinCodeForm } from "./JoinCodeForm";

// Session is already enforced by src/proxy.ts (matcher covers "/join" and
// "/join/:path*") — no auth redirect needed here, session.user is guaranteed.
//
// emailVerified is read straight from the DB rather than off the JWT: the
// token snapshot is only refreshed at sign-in, so a user who verifies their
// email without re-logging in would keep seeing the blocking banner. This
// is the one screen that needs a live answer, so it gets its own query
// instead of a session claim that can go stale.
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  const codeParam = params.code;
  const initialCode = typeof codeParam === "string" ? codeParam.toUpperCase().slice(0, 6) : "";

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { emailVerified: true, email: true },
  });

  return (
    <JoinCodeForm
      initialCode={initialCode}
      emailVerified={!!user?.emailVerified}
      email={user?.email ?? ""}
    />
  );
}
