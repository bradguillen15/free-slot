import { test, expect, seedGuest, pickDefaultLabel, readGuestTimeLogs } from "./fixtures/guest";

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysISO(iso: string, delta: number): string {
  const [y, mo, d] = iso.split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  dt.setDate(dt.getDate() + delta);
  const ry = dt.getFullYear();
  const rm = String(dt.getMonth() + 1).padStart(2, "0");
  const rd = String(dt.getDate()).padStart(2, "0");
  return `${ry}-${rm}-${rd}`;
}

/**
 * Phase 5 — time logging. Quick-log a time entry from the Day view and confirm
 * it is stored against the day and survives a reload.
 */
const skip = { profile: { onboarding_skipped: true } };

test.describe("guest time logging", () => {
  test("overnight sleep log is stored on the previous day", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app");

    const yesterday = addDaysISO(todayISO(), -1);

    await page.getByTestId("day-fab").click();

    await page.getByTestId("quicklog-title").fill("Sleep");
    await page.getByTestId("quicklog-start").fill("23:00");
    await page.getByTestId("quicklog-end").fill("07:00");
    await pickDefaultLabel(page, "Sleep");
    await page.getByTestId("quicklog-submit").click();

    await expect
      .poll(async () => (await readGuestTimeLogs(page)).map((l) => l.title))
      .toContain("Sleep");

    const logs = await readGuestTimeLogs(page);
    const entry = logs.find((l) => l.title === "Sleep");
    expect(entry?.date).toBe(yesterday);
    expect(entry?.start_time).toBe("23:00");
    expect(entry?.end_time).toBe("07:00");
  });

  test("quick-logs a time entry that persists", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app");

    // Open the quick-log dialog via the Day FAB.
    await page.getByTestId("day-fab").click();

    await page.getByTestId("quicklog-title").fill("Morning standup");
    await page.getByTestId("quicklog-start").fill("09:00");
    await page.getByTestId("quicklog-end").fill("09:30");
    await pickDefaultLabel(page);
    await page.getByTestId("quicklog-submit").click();

    await expect
      .poll(async () => (await readGuestTimeLogs(page)).map((l) => l.title))
      .toContain("Morning standup");

    await page.reload();
    const logs = await readGuestTimeLogs(page);
    const entry = logs.find((l) => l.title === "Morning standup");
    expect(entry).toBeTruthy();
    expect(entry?.start_time).toBe("09:00");
    expect(entry?.end_time).toBe("09:30");
  });

  test("picks a start time with the wheel picker (24h)", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app");

    await page.getByTestId("day-fab").click();
    await page.getByTestId("quicklog-title").fill("Wheel pick");
    await pickDefaultLabel(page);

    // Open the start picker panel and choose 08:30 by clicking wheel rows.
    await page.getByTestId("quicklog-start").click();
    await page.getByRole("button", { name: "Hour 08" }).click();
    await page.getByRole("button", { name: "Minute 30" }).click();
    // Click the title to dismiss the panel before finishing the form.
    await page.getByTestId("quicklog-title").click();

    await page.getByTestId("quicklog-end").fill("09:15");
    await page.getByTestId("quicklog-submit").click();

    await expect
      .poll(async () => (await readGuestTimeLogs(page)).map((l) => l.title))
      .toContain("Wheel pick");

    const entry = (await readGuestTimeLogs(page)).find((l) => l.title === "Wheel pick");
    expect(entry?.start_time).toBe("08:30");
    expect(entry?.end_time).toBe("09:15");
  });

  test("picks a 12-hour time with the AM/PM toggle", async ({ page }) => {
    await seedGuest(page, { profile: { onboarding_skipped: true, time_format: "12h" } });
    await page.goto("/app");

    await page.getByTestId("day-fab").click();
    await page.getByTestId("quicklog-title").fill("Afternoon block");
    await pickDefaultLabel(page);

    // Choose 3:00 PM via the wheels + the AM/PM segmented toggle.
    await page.getByTestId("quicklog-start").click();
    await page.getByRole("button", { name: "Hour 3", exact: true }).click();
    await page.getByRole("button", { name: "Minute 00" }).click();
    await page.getByRole("button", { name: "PM", exact: true }).click();
    await page.getByTestId("quicklog-title").click();

    // The end field accepts typed 12-hour input.
    await page.getByTestId("quicklog-end").fill("4:30 PM");
    await page.getByTestId("quicklog-submit").click();

    await expect
      .poll(async () => (await readGuestTimeLogs(page)).map((l) => l.title))
      .toContain("Afternoon block");

    const entry = (await readGuestTimeLogs(page)).find((l) => l.title === "Afternoon block");
    expect(entry?.start_time).toBe("15:00");
    expect(entry?.end_time).toBe("16:30");
  });
});
