import { test, expect, seedGuest, pickDefaultLabel, readGuestTimeLogs } from "./fixtures/guest";

/**
 * Confirm my day — materializes today's schedule blocks into real time logs
 * with one tap, and is safe to re-run without duplicating them.
 */
test.describe("guest confirm day", () => {
  test("confirming the day creates a log from the schedule block, and re-confirming does not duplicate it", async ({ page }) => {
    // Confirm-day is elapsed-only for today — pin the clock to the evening so
    // the default 09:00–10:00 block has already ended.
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

    await page.goto("/app");
    await expect(page.getByTestId("confirm-day-button")).toBeVisible();

    await page.getByTestId("confirm-day-button").click();
    await expect(page.getByTestId("confirm-day-already-logged")).toBeVisible();

    const logsAfterFirstConfirm = await readGuestTimeLogs(page);
    expect(logsAfterFirstConfirm).toHaveLength(1);
    expect(logsAfterFirstConfirm[0]).toMatchObject({ title: "Deep work block" });

    // Re-running is idempotent: the button already shows "already logged"
    // (nothing left to confirm), and reloading confirms no duplicate was created.
    await page.reload();
    await expect(page.getByTestId("confirm-day-already-logged")).toBeVisible();
    expect(await readGuestTimeLogs(page)).toHaveLength(1);
  });
});
