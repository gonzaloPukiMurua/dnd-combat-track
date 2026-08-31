# Contributing

## End-to-end tests (Playwright)

E2E specs live in `e2e/`. Config is `playwright.config.ts`.

```bash
npx playwright test            # run the whole suite (headless)
npx playwright test --headed   # watch it in a real browser
npx playwright test --ui       # interactive runner
npx playwright test e2e/header.spec.ts   # one file
npx playwright show-report     # open the last HTML report
```

`npm run test:e2e` is an alias for `npx playwright test`.

### What the runner does for you

- **Web server**: `playwright.config.ts` starts `npm run dev` on
  `http://localhost:3000` automatically (and reuses one if it's already
  running locally).
- **Browsers**: Chromium only. If it's missing, run
  `npx playwright install chromium`.

### Test data / seed (required)

`e2e/global-setup.ts` runs once before the suite and **upserts a known test
user and a campaign into the database** that `.env`'s `DATABASE_URL` points
at:

| | value |
|---|---|
| user email | `e2e@grimoire.test` |
| user password | `e2e-playwright-pw` |
| campaign | `E2E Test Campaign` (invite code `E2E001`) |

These identifiers live in `e2e/fixtures/test-data.ts`. The seed is
idempotent — safe to re-run.

**Consequences:**

- A reachable database is required. There is no mock/in-memory mode; the
  tests exercise the real Server Actions and Prisma.
- The seeded rows persist after the run. They're inert (a campaign with no
  combats) and get reused on the next run.
- Running against a shared database will create that user/campaign there.
  Point `DATABASE_URL` at a local or disposable database if that matters.
