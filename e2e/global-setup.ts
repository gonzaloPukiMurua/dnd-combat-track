import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { TEST_USER, TEST_CAMPAIGN, TEST_EDITABLE_CAMPAIGN } from "./fixtures/test-data";

// Seeds a known test user + the campaigns they DM, idempotently, into the DB
// pointed at by `.env` (DATABASE_URL). Runs once before the e2e suite.
//
// The user is created with `emailVerified` set and a real bcrypt hash so the
// Credentials provider's `authorize()` accepts it (it compares the hash and
// does not gate on verification, but we set it anyway to match a real signup).
// Campaign names are reset here on every run, so a spec that renames one does
// not have to leave it pristine.
async function globalSetup() {
  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(TEST_USER.password, 10);

    const user = await prisma.user.upsert({
      where: { email: TEST_USER.email },
      update: { passwordHash, emailVerified: new Date(), name: TEST_USER.name },
      create: {
        email: TEST_USER.email,
        name: TEST_USER.name,
        passwordHash,
        emailVerified: new Date(),
      },
    });

    for (const c of [TEST_CAMPAIGN, TEST_EDITABLE_CAMPAIGN]) {
      const campaign = await prisma.campaign.upsert({
        where: { inviteCode: c.inviteCode },
        update: { ownerId: user.id, name: c.name },
        create: { name: c.name, inviteCode: c.inviteCode, ownerId: user.id },
      });

      await prisma.campaignMember.upsert({
        where: { userId_campaignId: { userId: user.id, campaignId: campaign.id } },
        update: { role: "DM" },
        create: { userId: user.id, campaignId: campaign.id, role: "DM" },
      });

      console.log(`[e2e] seeded campaign "${c.name}" (${campaign.id})`);
    }

    console.log(`[e2e] seeded ${TEST_USER.email}`);
  } finally {
    await prisma.$disconnect();
  }
}

export default globalSetup;
