import { test, expect, seedGuest } from "./fixtures/guest";

/**
 * Dashboard Activity Trends — a single period selector (Day/Week/Month/Custom)
 * drives one multi-line activity trend chart, replacing the old card grid
 * (Schedule vs Actual, three-state filter, agenda, card visibility menu).
 */
test.describe("guest dashboard activity trends", () => {
  test("shows the trend chart with per-activity lines after logging real data, and switches periods", async ({ page }) => {
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
    await expect(page.getByTestId("period-selector")).toBeVisible();
    await expect(page.getByRole("radio", { name: /week/i })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("activity-trend-chart")).toBeVisible();

    // Template labels appear as legend entries (Deep work, Meals, Sleep).
    const legend = page.getByTestId("trend-legend");
    await expect(legend.getByRole("button", { name: /sleep/i })).toBeVisible();

    // Toggling the planned overlay doesn't error and reflects checked state.
    const plannedSwitch = page.getByTestId("trend-show-planned");
    await plannedSwitch.click();
    await expect(plannedSwitch).toHaveAttribute("data-state", "checked");

    // Switching period re-scopes the page without losing the chart.
    await page.getByRole("radio", { name: /^day$/i }).click();
    await expect(page.getByRole("radio", { name: /^day$/i })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("activity-trend-chart")).toBeVisible();
  });

  test("shows the empty state when nothing is scheduled or logged", async ({ page }) => {
    await seedGuest(page, {
      profile: { tour_completed: true },
      timeLogs: [],
      scheduleBlocks: [],
    });
    await page.goto("/app/dashboard");
    await expect(page.getByTestId("dashboard-empty")).toBeVisible();
  });
});
