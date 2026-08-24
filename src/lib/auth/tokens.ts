import crypto from "crypto";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24h

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

// Stateless email-verification token: userId + expiry, HMAC-signed with
// AUTH_SECRET. No VerificationToken table — avoids a schema change for a
// link that's only checked once and is naturally idempotent to replay
// (it just (re)sets emailVerified).
export function createEmailVerificationToken(userId: string): string {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = `${userId}.${expiresAt}`;
  return Buffer.from(`${payload}.${sign(payload)}`).toString("base64url");
}

export function verifyEmailVerificationToken(token: string): { userId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [userId, expiresAtRaw, signature] = decoded.split(".");
    if (!userId || !expiresAtRaw || !signature) return null;

    const expectedSignature = sign(`${userId}.${expiresAtRaw}`);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (signatureBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

    return { userId };
  } catch {
    return null;
  }
}
