import { test, expect, seedGuest } from "./fixtures/guest";

/**
 * Dashboard Schedule vs Actual — the card compares the recurring schedule
 * against logs, and the three-state label filter persists exclusions.
 */
test.describe("guest dashboard schedule vs actual", () => {
  test("shows per-label comparison after applying the suggested schedule and confirming the day, and persists a Sleep exclusion", async ({ page }) => {
    // Pin to a weekday evening so template work/lunch blocks are active and elapsed.
    const evening = new Date();
    evening.setDate(evening.getDate() - ((evening.getDay() + 6) % 7)); // most recent Monday
    evening.setHours(20, 0, 0, 0);
    await page.clock.setFixedTime(evening);
    await seedGuest(page, { profile: { tour_completed: true } });

    // Build real data through the UI: template schedule + confirmed day.
    await page.goto("/app/schedule");
    await page.getByTestId("apply-suggested-schedule").click();
    await page.getByTestId("apply-suggested-confirm").click();
    await expect(page.locator('[data-testid^="schedule-row-"]')).toHaveCount(4);

    await page.goto("/app");
    await page.getByTestId("confirm-day-button").click();
    await expect(page.getByTestId("confirm-day-already-logged")).toBeVisible();

    await page.goto("/app/dashboard");
    await expect(page.getByTestId("schedule-vs-actual-card")).toBeVisible();
    await expect(page.getByTestId("adherence-kpi")).toBeVisible();
    // Template labels appear as comparison rows.
    const rows = page.locator('[data-testid^="sva-row-"]');
    await expect(rows).toHaveCount(3); // Deep work, Meals, Sleep

    // Exclude Sleep: neutral -> included -> excluded.
    const sleepChip = page.locator('[data-testid^="label-filter-"]', { hasText: "Sleep" });
    await sleepChip.click();
    await expect(sleepChip).toHaveAttribute("data-state", "included");
    await sleepChip.click();
    await expect(sleepChip).toHaveAttribute("data-state", "excluded");
    await expect(rows).toHaveCount(2);

    // Exclusion persists across reload.
    await page.reload();
    await expect(page.getByTestId("schedule-vs-actual-card")).toBeVisible();
    await expect(
      page.locator('[data-testid^="label-filter-"]', { hasText: "Sleep" })
    ).toHaveAttribute("data-state", "excluded");
    await expect(page.locator('[data-testid^="sva-row-"]')).toHaveCount(2);
  });

  test("shows the schedule empty state when no blocks exist", async ({ page }) => {
    await seedGuest(page, {
      profile: { tour_completed: true },
      timeLogs: [],
    });
    await page.goto("/app/dashboard");
    await expect(page.getByTestId("sva-empty")).toBeVisible();
  });
});
