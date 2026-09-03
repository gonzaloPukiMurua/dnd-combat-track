"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";
import {
  createEmailVerificationToken,
  createPasswordResetToken,
  verifyPasswordResetToken,
  unsafeDecodePasswordResetTokenUserId,
} from "@/lib/auth/tokens";
import { canResendVerificationEmail, canRequestPasswordReset } from "@/lib/auth/rate-limit";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email/resend";

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

// ─── Request password reset (rate-limited) ─────────────────────────────────

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  if (!email) redirect("/forgot-password?error=missing");

  const user = await prisma.user.findUnique({ where: { email } });

  // Don't reveal whether the account exists — same status either way.
  if (!user) {
    redirect("/forgot-password?sent=1");
  }

  if (!canRequestPasswordReset(user.id)) {
    redirect("/forgot-password?sent=1");
  }

  try {
    const baseUrl = await getBaseUrl();
    const token = createPasswordResetToken(user.id, user.passwordHash);
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    // Still don't reveal account existence via a different status.
  }

  redirect("/forgot-password?sent=1");
}

// ─── Reset password with token ──────────────────────────────────────────────

export async function resetPassword(formData: FormData) {
  const token = formData.get("token")?.toString();
  const password = formData.get("password")?.toString();
  const confirmPassword = formData.get("confirmPassword")?.toString();

  if (!token) redirect("/forgot-password?error=invalid_token");
  if (!password || !confirmPassword) {
    redirect(`/reset-password?token=${token}&error=missing`);
  }
  if (password.length < 8) {
    redirect(`/reset-password?token=${token}&error=weak_password`);
  }
  if (password !== confirmPassword) {
    redirect(`/reset-password?token=${token}&error=mismatch`);
  }

  // The token is bound to userId + a fingerprint of the passwordHash active
  // when it was issued, so we need the user's current passwordHash before we
  // can verify it. unsafeDecodePasswordResetTokenUserId only reads the
  // userId to find that candidate — verifyPasswordResetToken below still
  // checks the signature before trusting anything about the token.
  const candidateUserId = unsafeDecodePasswordResetTokenUserId(token);
  const user = candidateUserId ? await prisma.user.findUnique({ where: { id: candidateUserId } }) : null;

  if (!user || !verifyPasswordResetToken(token, user.passwordHash)) {
    redirect("/forgot-password?error=invalid_token");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  redirect("/login?reset=success");
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
