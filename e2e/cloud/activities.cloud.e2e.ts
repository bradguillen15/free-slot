import { test, expect, signUp, serviceClient } from "./fixtures/auth";

/**
 * Cloud activities — the shared ActivityEditor (embedded in onboarding step 2 and
 * on /app/activities) persists to Postgres for authenticated users.
 */
async function activities(userId: string) {
  const { data, error } = await serviceClient()
    .from("activities")
    .select("id,name")
    .eq("user_id", userId);
  expect(error).toBeNull();
  return (data ?? []) as { id: string; name: string }[];
}

test.describe("cloud activities", () => {
  test("an activity added in onboarding persists to the DB and survives reload", async ({ page }) => {
    const { userId } = await signUp(page);
    await expect(page).toHaveURL(/\/onboarding/);

    // Advance to the activities step (step 2) and add one via the embedded editor.
    await page.getByTestId("onboarding-continue").click();
    await page.getByTestId("activity-name-input").fill("Practice guitar");
    await page.getByTestId("activity-add").click();

    await expect.poll(async () => (await activities(userId)).map((a) => a.name)).toContain(
      "Practice guitar",
    );

    await page.reload();
    expect((await activities(userId)).map((a) => a.name)).toContain("Practice guitar");
  });
});
