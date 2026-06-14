import { test, expect, signUp, serviceClient } from "./fixtures/auth";

/**
 * Cloud schedule — proves the shared ScheduleEditor (embedded in onboarding AND
 * on /app/schedule) persists to Postgres for authenticated users.
 */
async function blocks(userId: string) {
  const { data, error } = await serviceClient()
    .from("schedule_blocks")
    .select("id,name")
    .eq("user_id", userId);
  expect(error).toBeNull();
  return (data ?? []) as { id: string; name: string }[];
}

test.describe("cloud schedule", () => {
  test("a block added in onboarding persists to the DB and shows on the schedule page", async ({ page }) => {
    const { userId } = await signUp(page);
    await expect(page).toHaveURL(/\/onboarding/);

    // Add via the embedded editor's dialog on step 1.
    await page.getByTestId("schedule-add-block").click();
    await page.getByTestId("schedule-dialog-name").fill("Morning gym");
    await page.getByTestId("schedule-dialog-submit").click();

    await expect.poll(async () => (await blocks(userId)).map((b) => b.name)).toContain("Morning gym");

    // Skip onboarding, then confirm the same block renders on /app/schedule.
    await page.getByTestId("onboarding-skip").click();
    await expect(page).toHaveURL(/\/app/);
    await page.goto("/app/schedule");
    const id = (await blocks(userId))[0].id;
    await expect(page.getByTestId(`schedule-name-${id}`)).toHaveValue("Morning gym");
  });

  test("deleting a block removes it from the DB", async ({ page }) => {
    const { userId } = await signUp(page);
    await page.getByTestId("schedule-add-block").click();
    await page.getByTestId("schedule-dialog-name").fill("Temp block");
    await page.getByTestId("schedule-dialog-submit").click();

    await expect.poll(async () => (await blocks(userId)).length).toBe(1);
    const id = (await blocks(userId))[0].id;

    await page.getByTestId(`schedule-delete-${id}`).click();
    await page.getByTestId("schedule-confirm-delete").click();

    await expect.poll(async () => (await blocks(userId)).length).toBe(0);
  });
});
