import {
  test,
  expect,
  seedGuest,
  pickDefaultLabel,
  readGuestScheduleBlocks,
  type GuestScheduleBlock,
} from "./fixtures/guest";
import type { Page } from "@playwright/test";

/**
 * Phase 3 — schedule blocks. Create (via dialog), edit (inline), delete
 * (confirm dialog), and reorder (drag-and-drop), each persisting across reload.
 */

const skip = { profile: { onboarding_skipped: true } };

const block = (over: Partial<GuestScheduleBlock> & { id: string; name: string }): GuestScheduleBlock => ({
  start_time: "09:00",
  end_time: "10:00",
  days_of_week: [1, 2, 3, 4, 5],
  ...over,
});

async function readBlocks(page: Page) {
  return readGuestScheduleBlocks(page);
}

test.describe("guest schedule blocks", () => {
  test("creates a block via the dialog and it persists", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app/schedule");

    await page.getByTestId("schedule-add-block").click();
    await page.getByTestId("schedule-dialog-name").fill("Morning gym");
    await pickDefaultLabel(page);
    await page.getByTestId("schedule-dialog-submit").click();

    // Dialog closes and a row appears.
    await expect(page.locator('[data-testid^="schedule-row-"]')).toHaveCount(1);
    await expect
      .poll(async () => (await readBlocks(page)).map((b) => b.name))
      .toContain("Morning gym");

    await page.reload();
    await expect
      .poll(async () => (await readBlocks(page)).map((b) => b.name))
      .toContain("Morning gym");
  });

  test("edits a block name inline and it persists", async ({ page }) => {
    await seedGuest(page, {
      ...skip,
      scheduleBlocks: [block({ id: "b1", name: "Work" })],
    });
    await page.goto("/app/schedule");

    const name = page.getByTestId("schedule-name-b1");
    await name.fill("Deep work");
    await name.blur();

    await expect
      .poll(async () => (await readBlocks(page)).find((b) => b.id === "b1")?.name)
      .toBe("Deep work");

    await page.reload();
    expect((await readBlocks(page)).find((b) => b.id === "b1")?.name).toBe("Deep work");
  });

  test("deletes a block via the confirm dialog", async ({ page }) => {
    await seedGuest(page, {
      ...skip,
      scheduleBlocks: [block({ id: "b1", name: "Work" })],
    });
    await page.goto("/app/schedule");

    await page.getByTestId("schedule-delete-b1").click();
    await page.getByTestId("schedule-confirm-delete").click();

    await expect(page.getByTestId("schedule-row-b1")).toHaveCount(0);
    await expect.poll(async () => (await readBlocks(page)).length).toBe(0);

    await page.reload();
    expect((await readBlocks(page)).length).toBe(0);
  });

  test("reorders blocks via drag-and-drop and the order persists", async ({ page }) => {
    await seedGuest(page, {
      ...skip,
      scheduleBlocks: [
        block({ id: "b1", name: "Alpha" }),
        block({ id: "b2", name: "Beta" }),
      ],
    });
    await page.goto("/app/schedule");

    await expect(page.getByTestId("schedule-row-b1")).toBeVisible();
    await expect(page.getByTestId("schedule-row-b2")).toBeVisible();

    const source = page.getByTestId("schedule-drag-b1");
    const target = page.getByTestId("schedule-drag-b2");
    const from = await source.boundingBox();
    const to = await target.boundingBox();
    if (!from || !to) throw new Error("drag handles not measurable");

    // Manual pointer steps — @dnd-kit's PointerSensor needs movement past its
    // 4px activation distance before it treats the gesture as a drag. Aim at
    // the target grip (not the row center) so pointer-up cannot land on edit /
    // delete controls; add a settle move so reorder resolves under CPU load.
    const sourceX = from.x + from.width / 2;
    const sourceY = from.y + from.height / 2;
    const targetX = to.x + to.width / 2;
    const targetY = to.y + to.height / 2;
    await page.mouse.move(sourceX, sourceY);
    await page.mouse.down();
    await page.mouse.move(sourceX, sourceY + 8, { steps: 5 });
    await page.mouse.move(targetX, targetY, { steps: 12 });
    await page.mouse.move(targetX, targetY, { steps: 3 });
    await page.mouse.up();

    await expect.poll(async () => (await readBlocks(page)).length).toBe(2);
    await expect
      .poll(async () => (await readBlocks(page)).map((b) => b.id))
      .toEqual(["b2", "b1"]);

    await page.reload();
    expect((await readBlocks(page)).map((b) => b.id)).toEqual(["b2", "b1"]);
  });
});
