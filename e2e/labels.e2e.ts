import { test, expect, seedGuest, readGuestCategories } from "./fixtures/guest";

/**
 * Phase 4 — labels. Create a custom productive label, then delete it. Default
 * labels cannot be deleted, so the test operates on a user-created one.
 */
const skip = { profile: { onboarding_skipped: true } };

test.describe("guest labels", () => {
  test("creates a label that persists", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app/labels");

    await page.getByTestId("labels-add").click();
    await page.getByTestId("label-dialog-name").fill("Focus");
    await page.getByTestId("label-dialog-submit").click();

    await expect
      .poll(async () => (await readGuestCategories(page)).map((c) => c.name))
      .toContain("Focus");

    await page.reload();
    await expect
      .poll(async () => (await readGuestCategories(page)).map((c) => c.name))
      .toContain("Focus");
  });

  test("deletes a custom label", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app/labels");

    // Create one first (defaults are not deletable).
    await page.getByTestId("labels-add").click();
    await page.getByTestId("label-dialog-name").fill("Temporary");
    await page.getByTestId("label-dialog-submit").click();

    const created = await expect
      .poll(async () => (await readGuestCategories(page)).find((c) => c.name === "Temporary"))
      .toBeTruthy();
    void created;

    const id = (await readGuestCategories(page)).find((c) => c.name === "Temporary")!.id;

    await page.getByTestId(`label-delete-${id}`).click();
    await page.getByTestId("labels-confirm-delete").click();

    await expect(page.getByTestId(`label-row-${id}`)).toHaveCount(0);
    await expect
      .poll(async () => (await readGuestCategories(page)).map((c) => c.name))
      .not.toContain("Temporary");

    await page.reload();
    expect((await readGuestCategories(page)).map((c) => c.name)).not.toContain("Temporary");
  });
});
