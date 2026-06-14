import { test, expect, seedGuest } from "./fixtures/guest";

/**
 * Phase 7 — i18n. Switching language updates visible copy and the preference
 * persists across a reload.
 */
const skip = { profile: { onboarding_skipped: true } };

test.describe("guest language switch", () => {
  test("switches to Spanish and persists across reload", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app/schedule");

    // Starts in English.
    await expect(page.getByRole("heading", { name: "My schedule" })).toBeVisible();

    // Switch to Spanish via the sidebar language switcher.
    await page.getByTestId("lang-switcher").click();
    await page.getByTestId("lang-option-es").click();

    await expect(page.getByRole("heading", { name: "Mi horario" })).toBeVisible();

    // Preference survives a reload.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Mi horario" })).toBeVisible();
  });
});
