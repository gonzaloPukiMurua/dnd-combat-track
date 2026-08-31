// Shared identifiers for the e2e test user + campaign. The values are seeded
// into the database by e2e/global-setup.ts before the suite runs.

export const TEST_USER = {
  email: "e2e@grimoire.test",
  password: "e2e-playwright-pw",
  name: "E2E Tester",
} as const;

export const TEST_CAMPAIGN = {
  name: "E2E Test Campaign",
  // 6 uppercase alphanumeric, like the real generateUniqueInviteCode output.
  // Deterministic so global-setup can upsert on it.
  inviteCode: "E2E001",
} as const;

// A second campaign used only by the edit spec, so its mutations never race
// the specs that read TEST_CAMPAIGN by name.
export const TEST_EDITABLE_CAMPAIGN = {
  name: "E2E Editable Campaign",
  inviteCode: "E2E002",
} as const;
