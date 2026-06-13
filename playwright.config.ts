import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for guest-flow E2E tests.
 *
 * The app boots entirely in guest mode (localStorage-backed) and never needs a
 * real backend: the dev server runs in `e2e` mode, which loads `.env.e2e` with
 * placeholder Supabase config. `AuthContext` swallows the failed session call
 * and falls back to guest, so no network access is required.
 *
 * E2E specs live in `e2e/` and are matched by `*.e2e.ts`, keeping them fully
 * isolated from Vitest (which only includes `src/**` and `supabase/**`).
 *
 * @playwright/test is pinned to 1.58.x — UI mode Actions/trace panels break in
 * 1.59–1.60 (playwright#40950). Bump when 1.61+ is released.
 */
// Dedicated E2E port (separate from the normal `pnpm dev` port 8080) so the
// e2e server never collides with — or gets reused in place of — a running dev
// server. This keeps interactive (`--ui`) and headless runs fully self-contained:
// Playwright always starts its own `vite --mode e2e` instance with `.env.e2e`.
const PORT = 8090;
const BASE_URL = `http://localhost:${PORT}`;
const isCI = !!process.env.CI;
const isUIMode = process.argv.includes("--ui");

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: !isUIMode,
  forbidOnly: isCI,
  // One local retry keeps the pre-push hook from spuriously blocking on the
  // occasional timing-sensitive drag-and-drop flake under parallel load; CI
  // gets two. A genuine failure still fails every attempt.
  retries: isCI ? 2 : 1,
  workers: isCI || isUIMode ? 1 : undefined,
  reporter: isCI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: BASE_URL,
    // UI mode reads trace snapshots for Actions/Before/After; on-first-retry
    // skips traces when tests pass, leaving those panels empty.
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
    command: "pnpm exec vite --mode e2e --port " + PORT,
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
