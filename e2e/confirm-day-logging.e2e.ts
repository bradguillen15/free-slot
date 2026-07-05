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

  test("confirms an overnight Sleep block from the day after it starts, dated the previous day", async ({ page }) => {
    // Create the recurring Sleep block "yesterday" (relative to when we'll confirm),
    // then advance the clock into "today" afternoon so the block has already ended.
    const yesterday = addDaysISO(todayISO(), -1);
    const [y, mo, d] = yesterday.split("-").map(Number);
    const yesterdayEvening = new Date(y, mo - 1, d, 20, 0, 0, 0);
    await page.clock.setFixedTime(yesterdayEvening);
    await seedGuest(page, { profile: { onboarding_skipped: true } });
    await page.goto("/app/schedule");

    await page.getByTestId("schedule-add-block").click();
    await page.getByTestId("schedule-dialog-name").fill("Sleep");
    await page.getByTestId("schedule-block-start").fill("23:00");
    await page.getByTestId("schedule-block-end").fill("07:00");
    await page.getByText("Every day", { exact: true }).click();
    await pickDefaultLabel(page, "Sleep");
    await page.getByTestId("schedule-dialog-submit").click();
    await expect(page.locator('[data-testid^="schedule-row-"]')).toHaveCount(1);

    // Advance past midnight into "today" afternoon — the Sleep block scheduled to
    // start yesterday has now ended (07:00), well before "now".
    const today = addDaysISO(yesterday, 1);
    const [ty, tmo, td] = today.split("-").map(Number);
    const todayAfternoon = new Date(ty, tmo - 1, td, 15, 0, 0, 0);
    await page.clock.setFixedTime(todayAfternoon);

    await page.goto("/app");
    await expect(page.getByTestId("confirm-day-button")).toBeVisible();
    await page.getByTestId("confirm-day-button").click();

    const logs = await readGuestTimeLogs(page);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ title: "Sleep", start_time: "23:00", end_time: "07:00" });
    expect(logs[0].date).toBe(yesterday);
  });
});
