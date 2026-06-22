import { test, expect, seedGuest } from "./fixtures/guest";

/**
 * Phase 6 — calendar views & dashboard. Date paging on Day/Week/Month updates
 * the visible range; the Dashboard reflects whether data has been logged.
 */
const skip = { profile: { onboarding_skipped: true } };

function todayISO(): string {
  // Use the local date — `toISOString()` is UTC and can roll to the next day
  // in western timezones, seeding the log on a day outside the dashboard week.
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

test.describe("guest calendar views", () => {
  test("pages forward and back on the Day view", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app");

    const title = page.getByTestId("page-day").getByRole("heading", { level: 1 });
    const original = (await title.textContent())?.trim() ?? "";

    await page.getByRole("button", { name: "Next day" }).click();
    await expect(title).not.toHaveText(original);

    await page.getByRole("button", { name: "Previous day" }).click();
    await expect(title).toHaveText(original);
  });

  test("pages forward on the Week view", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app/week");

    const title = page.getByTestId("page-week").getByRole("heading", { level: 1 });
    const original = (await title.textContent())?.trim() ?? "";

    await page.getByRole("button", { name: "Next week" }).click();
    await expect(title).not.toHaveText(original);
  });

  test("pages forward on the Month view", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app/month");

    const title = page.getByTestId("page-month").getByRole("heading", { level: 1 });
    const original = (await title.textContent())?.trim() ?? "";

    await page.getByRole("button", { name: "Next month" }).click();
    await expect(title).not.toHaveText(original);
  });
});

test.describe("guest dashboard", () => {
  test("shows the empty state when nothing is logged", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app/dashboard");

    await expect(page.getByTestId("page-dashboard")).toBeVisible();
    await expect(page.getByTestId("dashboard-empty")).toBeVisible();
  });

  test("reflects a logged entry and hides the empty state", async ({ page }) => {
    await seedGuest(page, {
      ...skip,
      timeLogs: [
        {
          id: "l1",
          date: todayISO(),
          start_time: "09:00",
          end_time: "10:00",
          type: "productive",
          title: "Focus block",
        },
      ],
    });
    await page.goto("/app/dashboard");

    await expect(page.getByTestId("page-dashboard")).toBeVisible();
    await expect(page.getByTestId("dashboard-empty")).toHaveCount(0);
  });
});
