import { test, expect, seedGuest, readGuestTimeLogs } from "./fixtures/guest";

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

    // Title is required; times default to 09:00–10:00 and the label defaults to
    // the first seeded category, so a title + submit is enough.
    await page.getByTestId("quicklog-title").fill("Morning standup");
    await page.getByTestId("quicklog-start").fill("09:00");
    await page.getByTestId("quicklog-end").fill("09:30");
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
});
