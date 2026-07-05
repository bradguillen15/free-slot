import { test, expect, seedGuest, readGuestTimeLogs } from "./fixtures/guest";

/**
 * Guided first-run tour — auto-starts for a fresh guest, drives navigation to
 * the schedule (apply the suggested template with consent), back to the day
 * view (Confirm Day materializes only elapsed blocks), persists dismissal,
 * and can be replayed from the help button.
 */
test.describe("guided first-run tour", () => {
  test("walks a fresh guest through apply-schedule and confirm-day, then stays dismissed until replayed", async ({ page }) => {
    // Pin the clock to a weekday evening: the template's work/lunch blocks are
    // active (weekdays) and have elapsed by 20:00; overnight sleep has not.
    const evening = new Date();
    evening.setDate(evening.getDate() - ((evening.getDay() + 6) % 7)); // most recent Monday
    evening.setHours(20, 0, 0, 0);
    await page.clock.setFixedTime(evening);
    await seedGuest(page, { profile: { tour_completed: false } });

    await page.goto("/app");
    await expect(page.getByTestId("tour-bubble-welcome")).toBeVisible();

    // Tour navigates to the schedule page itself.
    await page.getByTestId("tour-next").click();
    await expect(page).toHaveURL(/\/app\/schedule$/);
    await expect(page.getByTestId("tour-bubble-apply-schedule")).toBeVisible();

    // Consent moment: apply the suggested schedule; the tour advances on the action.
    await page.getByTestId("apply-suggested-schedule").click();
    await page.getByTestId("apply-suggested-confirm").click();
    await expect(page.locator('[data-testid^="schedule-row-"]')).toHaveCount(4);
    await expect(page.getByTestId("tour-bubble-edit-schedule")).toBeVisible();

    // Back to the day view for the Confirm Day step.
    await page.getByTestId("tour-next").click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByTestId("tour-bubble-confirm-day")).toBeVisible();

    // Elapsed-only: work (x2) and lunch are logged for today; tonight's sleep
    // has not started yet, but last night's sleep (ending this morning) has
    // already elapsed and is confirmed too, dated yesterday.
    await page.getByTestId("confirm-day-button").click();
    const logs = await readGuestTimeLogs(page);
    expect(logs).toHaveLength(4);
    expect(logs.map((l: { title?: string | null }) => l.title).sort()).toEqual(["Lunch", "Sleep", "Work", "Work"]);
    await expect(page.getByTestId("tour-bubble-wrap-up")).toBeVisible();

    // Done dismisses and persists.
    await page.getByTestId("tour-next").click();
    await expect(page.getByTestId("tour-overlay")).toHaveCount(0);
    await page.reload();
    await expect(page.locator("#day-timeline-root")).toBeVisible();
    await expect(page.getByTestId("tour-overlay")).toHaveCount(0);

    // Replay from the sidebar help button.
    await page.getByTestId("tour-replay").click();
    await expect(page.getByTestId("tour-bubble-welcome")).toBeVisible();
  });

  test("skipping the tour persists dismissal", async ({ page }) => {
    await seedGuest(page, { profile: { tour_completed: false } });
    await page.goto("/app");
    await expect(page.getByTestId("tour-bubble-welcome")).toBeVisible();

    await page.getByTestId("tour-skip").click();
    await expect(page.getByTestId("tour-overlay")).toHaveCount(0);

    await page.reload();
    await expect(page.locator("#day-timeline-root")).toBeVisible();
    await expect(page.getByTestId("tour-overlay")).toHaveCount(0);
  });
});
