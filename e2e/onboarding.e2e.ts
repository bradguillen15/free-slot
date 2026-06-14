import { test, expect, seedGuest, readGuestProfile } from "./fixtures/guest";

/**
 * Phase 2 — onboarding. Covers the skip path, the finish path with chosen
 * preferences, the redirect for already-onboarded guests, and persistence.
 */
test.describe("guest onboarding", () => {
  test("skip records the skipped flag and lands in the app", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/onboarding/);

    await page.getByTestId("onboarding-skip").click();

    await expect(page).toHaveURL(/\/app/);
    const profile = await readGuestProfile(page);
    expect(profile.onboarding_skipped).toBe(true);
  });

  test("finish records completion and chosen preferences", async ({ page }) => {
    await page.goto("/onboarding");

    // Step 0 (schedule) -> Step 1 (activities) -> Step 2 (preferences).
    await page.getByTestId("onboarding-continue").click();
    await page.getByTestId("onboarding-continue").click();

    // Choose a non-default weekly review day, then finish.
    await page.getByTestId("onboarding-review-day-3").click();
    await page.getByTestId("onboarding-finish").click();

    await expect(page).toHaveURL(/\/app/);
    const profile = await readGuestProfile(page);
    expect(profile.onboarding_completed).toBe(true);
    expect(profile.weekly_review_day).toBe(3);
  });

  test("already-onboarded guest is redirected away from onboarding", async ({ page }) => {
    await seedGuest(page, { profile: { onboarding_completed: true } });
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/app/);
  });

  test("completed onboarding persists across reload", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByTestId("onboarding-continue").click();
    await page.getByTestId("onboarding-continue").click();
    await page.getByTestId("onboarding-finish").click();
    await expect(page).toHaveURL(/\/app/);

    await page.reload();
    await expect(page).toHaveURL(/\/app/);
    const profile = await readGuestProfile(page);
    expect(profile.onboarding_completed).toBe(true);
  });
});
