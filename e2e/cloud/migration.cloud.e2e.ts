import {
  test,
  expect,
  signUp,
  serviceClient,
  seedGuest,
  readGuestScheduleBlocks,
  readGuestActivities,
} from "./fixtures/auth";

/**
 * Cloud migration — the guest→cloud import (`migrateGuestToCloud`). Seed guest
 * data in localStorage, sign up (which surfaces the migrate dialog), choose
 * "Import", and assert the rows land in Postgres for the new user and the guest
 * copy is cleared.
 */
test.describe("cloud guest→cloud migration", () => {
  test("imports seeded guest data into the user's account", async ({ page }) => {
    await seedGuest(page, {
      scheduleBlocks: [
        { id: "g1", name: "Guest work", start_time: "09:00", end_time: "17:00", days_of_week: [1, 2, 3, 4, 5] },
      ],
      activities: [{ id: "a1", name: "Guest reading", target_hours_per_week: 2 }],
    });

    // Guest data is present, so signup opens the migrate dialog instead of navigating.
    const { userId } = await signUp(page, { expectMigrateDialog: true });
    await page.getByTestId("migrate-import").click();

    // After a successful import the dialog closes and the app navigates away from /auth.
    await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 20_000 });

    const svc = serviceClient();
    await expect
      .poll(async () => {
        const { data } = await svc.from("schedule_blocks").select("name").eq("user_id", userId);
        return (data ?? []).map((b) => (b as { name: string }).name);
      })
      .toContain("Guest work");

    const { data: acts } = await svc.from("activities").select("name").eq("user_id", userId);
    expect((acts ?? []).map((a) => (a as { name: string }).name)).toContain("Guest reading");

    // The guest copy is destroyed only after a fully successful migration.
    expect(await readGuestScheduleBlocks(page)).toHaveLength(0);
    expect(await readGuestActivities(page)).toHaveLength(0);
  });
});
