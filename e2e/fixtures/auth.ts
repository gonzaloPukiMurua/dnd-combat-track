import { type Page } from "@playwright/test";
import { TEST_USER } from "./test-data";

// Logs in the seeded test user through the real /login form and waits for
// the post-login redirect to /campaigns.
export async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(TEST_USER.email);
  await page.getByLabel("Contraseña").fill(TEST_USER.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL("**/campaigns");
}
