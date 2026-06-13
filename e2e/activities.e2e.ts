import {
  test,
  expect,
  seedGuest,
  readGuestActivities,
  type GuestActivity,
} from "./fixtures/guest";

/**
 * Phase 4 — activities. Create via the editor form, edit a name inline, and
 * deactivate, asserting guest storage and the active count.
 */
const skip = { profile: { onboarding_skipped: true } };

test.describe("guest activities", () => {
  test("creates an activity that persists", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app/activities");

    await page.getByTestId("activity-name-input").fill("Read 30 min");
    await page.getByTestId("activity-add").click();

    await expect
      .poll(async () => (await readGuestActivities(page)).map((a) => a.name))
      .toContain("Read 30 min");

    await page.reload();
    await expect
      .poll(async () => (await readGuestActivities(page)).map((a) => a.name))
      .toContain("Read 30 min");
  });

  test("assigns a category and deactivates an activity", async ({ page }) => {
    const seeded: GuestActivity = {
      id: "a1",
      name: "Guitar",
      target_hours_per_week: 2,
      is_active: true,
    };
    await seedGuest(page, { ...skip, activities: [seeded] });
    await page.goto("/app/activities");

    // Edit: assign a (default) productive category via the row select.
    await page.getByTestId("activity-category-a1").click();
    await page.getByRole("option", { name: "Deep work" }).click();
    await expect
      .poll(async () => (await readGuestActivities(page)).find((a) => a.id === "a1")?.category_id)
      .toBeTruthy();

    // Deactivate via the row switch.
    await page.getByTestId("activity-active-a1").click();
    await expect
      .poll(async () => (await readGuestActivities(page)).find((a) => a.id === "a1")?.is_active)
      .toBe(false);

    await page.reload();
    const after = (await readGuestActivities(page)).find((a) => a.id === "a1");
    expect(after?.category_id).toBeTruthy();
    expect(after?.is_active).toBe(false);
  });
});
