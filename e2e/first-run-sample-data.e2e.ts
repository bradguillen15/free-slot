import { test, expect } from "./fixtures/guest";

/**
 * First-run sample data — a brand-new guest (no seeded localStorage) lands
 * directly in the app with example schedule/logs already visible, and can
 * clear them in one confirmed action.
 */
test.describe("guest first-run sample data", () => {
  test("a fresh guest lands on /app (not redirected to /onboarding) and sees the sample-data banner", async ({ page }) => {
    await page.goto("/app");

    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByTestId("sample-data-banner")).toBeVisible();
    await expect(page.getByTitle(/Sleep · Planned/).first()).toBeVisible();
  });

  test("clearing examples removes the sample data and hides the banner", async ({ page }) => {
    await page.goto("/app");
    await expect(page.getByTestId("sample-data-banner")).toBeVisible();

    await page.getByTestId("sample-data-clear-cta").click();
    await page.getByTestId("sample-data-confirm-clear").click();

    await expect(page.getByTestId("sample-data-banner")).not.toBeVisible();
    await expect(page.getByTitle(/Sleep · Planned/)).toHaveCount(0);
  });
});
