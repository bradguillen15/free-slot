import { test, expect, seedGuest, pickDefaultLabel } from "./fixtures/guest";

/**
 * Week view no longer carries the Notes-feature Inbox toggle (out of place on a
 * schedule-review screen), and gains a Confirm Day action for today.
 */
test.describe("guest week view", () => {
  test("does not show an Inbox toggle, and shows a working Confirm Day action for today", async ({ page }) => {
    const evening = new Date();
    evening.setHours(20, 0, 0, 0);
    await page.clock.setFixedTime(evening);
    await seedGuest(page, { profile: { onboarding_skipped: true } });

    await page.goto("/app/schedule");
    await page.getByTestId("schedule-add-block").click();
    await page.getByTestId("schedule-dialog-name").fill("Deep work block");
    await page.getByText("Every day", { exact: true }).click();
    await pickDefaultLabel(page);
    await page.getByTestId("schedule-dialog-submit").click();
    await expect(page.locator('[data-testid^="schedule-row-"]')).toHaveCount(1);

    await page.goto("/app/week");
    await expect(page.getByRole("button", { name: /inbox/i })).not.toBeVisible();

    await expect(page.getByTestId("confirm-day-button")).toBeVisible();
    await page.getByTestId("confirm-day-button").click();
    await expect(page.getByTestId("confirm-day-already-logged")).toBeVisible();
  });
});
