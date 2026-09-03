const COOLDOWN_MS = 60_000; // 1 minute between resends

// In-memory only — resets on server restart / isn't shared across instances.
// Good enough for a single dev-stage server; revisit if this ever needs to
// survive restarts or run behind multiple instances.
const lastSentAt = new Map<string, number>();

export function canResendVerificationEmail(userId: string): boolean {
  const last = lastSentAt.get(userId);
  if (last !== undefined && Date.now() - last < COOLDOWN_MS) return false;
  lastSentAt.set(userId, Date.now());
  return true;
}

const lastResetRequestAt = new Map<string, number>();

export function canRequestPasswordReset(userId: string): boolean {
  const last = lastResetRequestAt.get(userId);
  if (last !== undefined && Date.now() - last < COOLDOWN_MS) return false;
  lastResetRequestAt.set(userId, Date.now());
  return true;
}
