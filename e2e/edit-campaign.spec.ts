import { test, expect } from "@playwright/test";
import { TEST_EDITABLE_CAMPAIGN } from "./fixtures/test-data";
import { login } from "./fixtures/auth";

const HUB_URL = /\/campaigns\/[0-9a-f-]{36}$/;

// S2-3 — a DM edits the campaign name and it persists. Uses a dedicated
// campaign (TEST_EDITABLE_CAMPAIGN) so the rename never races the specs that
// look up TEST_CAMPAIGN by name; global-setup resets its name every run.
test("DM edits the campaign name and it persists", async ({ page }) => {
  await login(page);

  await page.getByRole("link", { name: TEST_EDITABLE_CAMPAIGN.name }).click();
  await page.waitForURL(HUB_URL);

  const newName = `E2E Renamed ${Date.now()}`;

  await page.getByRole("link", { name: "Editar" }).click();
  await page.waitForURL(/\/campaigns\/[0-9a-f-]{36}\/edit$/);
  await page.getByLabel("Nombre de la campaña").fill(newName);
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  // Save redirects back to the hub; the new name renders there…
  await page.waitForURL(HUB_URL);
  await expect(page.getByRole("heading", { name: newName })).toBeVisible();

  // …and it's really in the DB — a fresh full load of the campaign list
  // (no client cache) shows the renamed campaign.
  await page.goto("/campaigns");
  await expect(page.getByRole("link", { name: newName })).toBeVisible();
});
