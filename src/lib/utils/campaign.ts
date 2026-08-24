import { prisma } from "@/lib/prisma";

const INVITE_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
const INVITE_CODE_LENGTH = 6;
const MAX_GENERATION_ATTEMPTS = 10;

function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)];
  }
  return code;
}

// Generates a unique Campaign.inviteCode, retrying on collision instead of
// relying solely on the DB's unique constraint.
export async function generateUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const code = generateInviteCode();
    const existing = await prisma.campaign.findUnique({ where: { inviteCode: code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique invite code after multiple attempts");
}
