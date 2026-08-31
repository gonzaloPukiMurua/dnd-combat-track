import { test, expect } from "@playwright/test";
import { TEST_CAMPAIGN } from "./fixtures/test-data";
import { login } from "./fixtures/auth";

// S2-4 — the invite code shows on the campaign hub for the DM, not only on
// the D5 post-creation screen. Also serves as the runtime check that the API
// (GET /api/campaigns/[id]) actually populates campaign.inviteCode for DMs.
test("campaign hub shows the invite code to the DM", async ({ page }) => {
  await login(page);

  await page.getByRole("link", { name: TEST_CAMPAIGN.name }).click();
  await page.waitForURL(/\/campaigns\/[0-9a-f-]{36}$/);

  const chip = page.getByTestId("invite-code-chip");
  await expect(chip).toBeVisible();
  await expect(chip.getByTestId("invite-code-value")).toHaveText(TEST_CAMPAIGN.inviteCode);
  await expect(chip.getByTestId("invite-code-copy")).toBeVisible();
});
