import { test, expect, signUp, serviceClient } from "./fixtures/auth";

/**
 * Cloud onboarding — the authenticated path that the guest lane can't cover.
 * Asserts the gate flags and preferences are written to `profiles` in Postgres.
 */
async function profile(userId: string) {
  const { data, error } = await serviceClient()
    .from("profiles")
    .select("onboarding_completed,onboarding_skipped,weekly_review_day,peak_hours")
    .eq("id", userId)
    .single();
  expect(error).toBeNull();
  return data as {
    onboarding_completed: boolean;
    onboarding_skipped: boolean;
    weekly_review_day: number;
    peak_hours: { start: string; end: string } | null;
  };
}

test.describe("cloud onboarding", () => {
  test("skip writes onboarding_skipped to the profile", async ({ page }) => {
    const { userId } = await signUp(page);
    await expect(page).toHaveURL(/\/onboarding/);

    await page.getByTestId("onboarding-skip").click();
    await expect(page).toHaveURL(/\/app/);

    await expect.poll(async () => (await profile(userId)).onboarding_skipped).toBe(true);
  });

  test("finish writes onboarding_completed and chosen preferences", async ({ page }) => {
    const { userId } = await signUp(page);
    await expect(page).toHaveURL(/\/onboarding/);

    // Step 0 (schedule) -> Step 1 (activities) -> Step 2 (preferences).
    await page.getByTestId("onboarding-continue").click();
    await page.getByTestId("onboarding-continue").click();
    await page.getByTestId("onboarding-review-day-3").click();
    await page.getByTestId("onboarding-finish").click();

    await expect(page).toHaveURL(/\/app/);
    await expect.poll(async () => (await profile(userId)).onboarding_completed).toBe(true);
    expect((await profile(userId)).weekly_review_day).toBe(3);
  });

  test("a completed user is not redirected back to onboarding on reload", async ({ page }) => {
    await signUp(page);
    await page.getByTestId("onboarding-skip").click();
    await expect(page).toHaveURL(/\/app/);

    await page.reload();
    await expect(page).toHaveURL(/\/app/);
    await expect(page).not.toHaveURL(/\/onboarding/);
  });
});
