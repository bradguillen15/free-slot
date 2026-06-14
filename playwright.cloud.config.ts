import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the CLOUD E2E lane.
 *
 * Unlike the guest config (`playwright.config.ts`), these specs run against a real
 * LOCAL Supabase stack (`supabase start`, Docker). The app boots in `e2e-cloud`
 * mode, which loads `.env.e2e-cloud` pointing at `http://127.0.0.1:54321`, so auth
 * and data persistence hit actual Postgres.
 *
 * `global-setup.ts` brings the stack up, resets the schema, and captures the local
 * service-role key for in-test DB assertions. Set `SKIP_CLOUD_E2E=1` to skip the
 * whole lane (used by the pre-push hook when Docker is unavailable).
 *
 * Specs live in `e2e/cloud/` and are matched by `*.cloud.e2e.ts`, keeping them out
 * of both the guest lane (`*.e2e.ts` in `e2e/`) and Vitest (`src/**`).
 */
// Dedicated port, distinct from the guest lane's 8090, so both lanes can run
// without colliding and each starts its own `vite` instance.
const PORT = 8091;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const isCI = !!process.env.CI;
const isUIMode = process.argv.includes("--ui");

export default defineConfig({
  testDir: "e2e/cloud",
  testMatch: "**/*.cloud.e2e.ts",
  globalSetup: "./e2e/cloud/global-setup.ts",
  globalTeardown: "./e2e/cloud/global-teardown.ts",
  // Serialized: the specs share one Postgres instance. Per-test isolation comes
  // from a unique signup email (RLS scopes every row by auth.uid()), but running
  // serially keeps DB-state assertions deterministic and the output readable.
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 2 : 1,
  reporter: isCI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: isUIMode ? "on" : "on-first-retry",
    locale: "en-US",
    testIdAttribute: "data-testid",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm exec vite --mode e2e-cloud --port " + PORT,
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
