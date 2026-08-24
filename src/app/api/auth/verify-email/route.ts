import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyEmailVerificationToken } from "@/lib/auth/tokens";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?verify=invalid", request.url));
  }

  const payload = verifyEmailVerificationToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL("/login?verify=invalid", request.url));
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    return NextResponse.redirect(new URL("/login?verify=invalid", request.url));
  }

  if (!user.emailVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });
  }

  return NextResponse.redirect(new URL("/login?verify=success", request.url));
}
