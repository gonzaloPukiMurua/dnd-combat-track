"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";
import { createEmailVerificationToken } from "@/lib/auth/tokens";
import { canResendVerificationEmail } from "@/lib/auth/rate-limit";
import { sendVerificationEmail } from "@/lib/email/resend";

async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${protocol}://${host}`;
}

async function dispatchVerificationEmail(userId: string, email: string) {
  const baseUrl = await getBaseUrl();
  const token = createEmailVerificationToken(userId);
  const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;
  await sendVerificationEmail(email, verificationUrl);
}

// ─── Register with email/password ──────────────────────────────────────────

export async function registerWithPassword(formData: FormData) {
  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();

  if (!name || !email || !password) {
    redirect("/register?error=missing");
  }
  if (password.length < 8) {
    redirect("/register?error=weak_password");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect("/register?error=email_taken");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, emailVerified: null },
  });

  try {
    await dispatchVerificationEmail(user.id, user.email);
  } catch (error) {
    console.error("Failed to send verification email:", error);
    redirect("/login?registered=email_failed");
  }

  redirect("/login?registered=1");
}

// ─── Resend verification email (rate-limited) ──────────────────────────────

export async function resendVerificationEmail(formData: FormData) {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  if (!email) redirect("/login?verify=invalid");

  const user = await prisma.user.findUnique({ where: { email } });

  // Don't reveal whether the account exists, and skip already-verified users.
  if (!user || user.emailVerified) {
    redirect("/login?resent=1");
  }

  if (!canResendVerificationEmail(user.id)) {
    redirect("/login?resent=rate_limited");
  }

  try {
    await dispatchVerificationEmail(user.id, user.email);
  } catch (error) {
    console.error("Failed to resend verification email:", error);
    redirect("/login?resent=failed");
  }

  redirect("/login?resent=1");
}

// ─── Login with email/password ─────────────────────────────────────────────

export async function loginWithPassword(formData: FormData) {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    redirect("/login?error=missing");
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/campaigns" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=invalid_credentials");
    }
    throw error;
  }
}
