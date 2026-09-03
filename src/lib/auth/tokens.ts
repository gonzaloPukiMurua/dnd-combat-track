import crypto from "crypto";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const RESET_TOKEN_TTL_MS = 1000 * 60 * 60; // 1h — tighter window than email verification

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

// Stateless password-reset token: userId + expiry + a short HMAC of the
// user's CURRENT passwordHash at issuance time, signed with AUTH_SECRET.
// Unlike the email-verification token above, this one must NOT be safely
// replayable — a leaked reset link (server logs, an archived email) would
// otherwise let anyone reset the password again and again until it expires.
// Binding the token to a fingerprint of passwordHash makes it single-use in
// practice: the first successful reset changes passwordHash, so the
// fingerprint no longer matches and any older token is rejected on
// verification — without needing a DB-backed used/unused token table.
function passwordHashFingerprint(passwordHash: string): string {
  return crypto.createHmac("sha256", getSecret()).update(passwordHash).digest("hex").slice(0, 16);
}

export function createPasswordResetToken(userId: string, passwordHash: string): string {
  const expiresAt = Date.now() + RESET_TOKEN_TTL_MS;
  const hashFingerprint = passwordHashFingerprint(passwordHash);
  const payload = `${userId}.${expiresAt}.${hashFingerprint}`;
  return Buffer.from(`${payload}.${sign(payload)}`).toString("base64url");
}

// Reads the userId out of a reset token WITHOUT verifying its signature —
// only used to know which user to look up so verifyPasswordResetToken can
// then check the signature + fingerprint against that user's real
// passwordHash. Never trust the userId this returns on its own.
export function unsafeDecodePasswordResetTokenUserId(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const userId = decoded.split(".")[0];
    return userId || null;
  } catch {
    return null;
  }
}

export function verifyPasswordResetToken(token: string, currentPasswordHash: string): { userId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [userId, expiresAtRaw, hashFingerprint, signature] = decoded.split(".");
    if (!userId || !expiresAtRaw || !hashFingerprint || !signature) return null;

    const expectedSignature = sign(`${userId}.${expiresAtRaw}.${hashFingerprint}`);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (signatureBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

    const expectedFingerprint = passwordHashFingerprint(currentPasswordHash);
    const fingerprintBuffer = Buffer.from(hashFingerprint);
    const expectedFingerprintBuffer = Buffer.from(expectedFingerprint);
    if (fingerprintBuffer.length !== expectedFingerprintBuffer.length) return null;
    if (!crypto.timingSafeEqual(fingerprintBuffer, expectedFingerprintBuffer)) return null;

    return { userId };
  } catch {
    return null;
  }
}
