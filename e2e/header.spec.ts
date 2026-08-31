import { test, expect } from "@playwright/test";
import { TEST_CAMPAIGN } from "./fixtures/test-data";
import { login } from "./fixtures/auth";

// Dogfoods S2-1 (global nav header) + S2-2 (logout in the user menu).
// Selectors are semantic (roles/labels) or data-testid — no brittle text
// matching on the components under test.
test("header persists, wordmark returns to /campaigns, logout ends the session", async ({ page }) => {
  // ── 1. Log in as the seeded test user ────────────────────────────────────
  await login(page);

  // ── 2. AppHeader is present on /campaigns ────────────────────────────────
  const header = page.getByTestId("app-header");
  await expect(header).toBeVisible();
  await expect(header.getByTestId("app-header-wordmark")).toHaveText("GRIMOIRE");
  await expect(header.getByTestId("user-menu-trigger")).toBeVisible();

  // ── 3. From a campaign hub, the wordmark links back to /campaigns ────────
  await page.getByRole("link", { name: TEST_CAMPAIGN.name }).click();
  await page.waitForURL(/\/campaigns\/[0-9a-f-]{36}$/);
  await expect(page.getByTestId("app-header")).toBeVisible();

  await page.getByTestId("app-header-wordmark").click();
  await page.waitForURL("**/campaigns");
  await expect(page).toHaveURL(/\/campaigns$/);

  // ── 4. Logout ends the session and redirects to /login ──────────────────
  await page.getByTestId("user-menu-trigger").click();
  await expect(page.getByTestId("user-menu-logout")).toBeVisible();
  await page.getByTestId("user-menu-logout").click();
  await page.waitForURL("**/login");

  // No header on the unauthenticated login screen.
  await expect(page.getByTestId("app-header")).toHaveCount(0);

  // Session is really gone server-side: a protected route bounces to /login.
  await page.goto("/campaigns");
  await page.waitForURL("**/login");
});
