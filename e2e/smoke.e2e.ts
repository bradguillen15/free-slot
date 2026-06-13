import { test, expect } from "./fixtures/guest";

/**
 * Phase 0 smoke test — proves the harness boots the app in guest mode (no real
 * backend) and renders the landing page in English.
 */
test.describe("smoke", () => {
  test("landing page renders in guest mode", async ({ page }) => {
    await page.goto("/");

    // Hero heading and the guest entry point render.
    await expect(page.getByTestId("landing-heading")).toBeVisible();
    await expect(page.getByTestId("landing-try-app")).toBeVisible();
  });
});
