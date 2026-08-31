import { defineConfig, devices } from '@playwright/test';

/**
 * E2E test config. See https://playwright.dev/docs/test-configuration.
 *
 * `globalSetup` seeds a known test user + campaign into the database pointed
 * at by `.env` (`DATABASE_URL`) — see e2e/global-setup.ts and CONTRIBUTING.md.
 * `webServer` boots `npm run dev` on :3000 (reused if one is already running).
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  /* Dev-mode runs compile each route on first hit; a multi-navigation flow
     blows the 30s default well before anything is actually wrong. */
  timeout: 90_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    /* Dev-mode on-demand compilation can make the first hit of a route slow. */
    navigationTimeout: 60_000,
    actionTimeout: 15_000,
  },
  expect: { timeout: 10_000 },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
