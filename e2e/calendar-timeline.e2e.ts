import { test, expect, seedGuest, pickDefaultLabel, readGuestTimeLogs } from "./fixtures/guest";
import type { Locator, Page } from "@playwright/test";

const skip = { profile: { onboarding_skipped: true } };

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function weekdayIndex(iso: string): number {
  return new Date(`${iso}T12:00:00`).getDay();
}

async function createDraggableLog(page: Page, title: string) {
  await page.getByTestId("day-fab").click();
  await page.getByTestId("quicklog-title").fill(title);
  await page.getByTestId("quicklog-start").fill("09:00");
  await page.getByTestId("quicklog-end").fill("10:00");
  await pickDefaultLabel(page);
  await page.getByTestId("quicklog-submit").click();
  await expect(page.locator("[data-timeline-log]").filter({ hasText: title })).toBeVisible();
}

async function pointerDragLogBar(logBar: Locator, deltaY: number) {
  await logBar.evaluate((el, dy) => {
    const bar = el as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const endY = y + dy;
    const fire = (type: string, clientY: number) => {
      bar.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 1,
          clientX: x,
          clientY,
          bubbles: true,
          cancelable: true,
        }),
      );
    };
    fire("pointerdown", y);
    bar.setPointerCapture(1);
    fire("pointermove", y + 8);
    fire("pointermove", endY);
    fire("pointerup", endY);
  }, deltaY);
}

async function pointerDragGripHandle(grip: Locator, deltaY: number) {
  await grip.evaluate((btn, dy) => {
    const bar = btn.closest("[data-timeline-log]") as HTMLElement | null;
    if (!bar) throw new Error("log bar not found for grip handle");
    const rect = btn.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const endY = y + dy;
    const fire = (type: string, clientY: number, target: HTMLElement) => {
      target.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 1,
          clientX: x,
          clientY,
          bubbles: true,
          cancelable: true,
        }),
      );
    };
    fire("pointerdown", y, btn);
    bar.setPointerCapture(1);
    fire("pointermove", y + 8, bar);
    fire("pointermove", endY, bar);
    fire("pointerup", endY, bar);
  }, deltaY);
}

test.describe("guest calendar timeline", () => {
  test("clicking a schedule block opens Quick Log prefilled from the block", async ({ page }) => {
    const today = todayISO();
    await seedGuest(page, {
      ...skip,
      scheduleBlocks: [
        {
          id: "work-block",
          name: "Work",
          start_time: "09:00",
          end_time: "17:00",
          days_of_week: [weekdayIndex(today)],
          color: "#3b82f6",
          type: "fixed",
        },
      ],
    });
    await page.goto("/app");

    await page.getByTitle(/Work · Planned/).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByTestId("quicklog-title")).toHaveValue("Work");
    await expect(page.getByTestId("quicklog-start")).toHaveValue("09:00");
    await expect(page.getByTestId("quicklog-end")).toHaveValue("17:00");
  });

  test("reschedules a log by dragging the bar on desktop", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app");
    await createDraggableLog(page, "Desktop drag");

    const logBar = page.locator("[data-timeline-log]").filter({ hasText: "Desktop drag" });
    await pointerDragLogBar(logBar, 80);

    await expect
      .poll(async () => (await readGuestTimeLogs(page)).find((l) => l.title === "Desktop drag")?.start_time)
      .not.toBe("09:00");
  });
});

test.describe("guest calendar timeline — mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("does not reschedule when dragging the log bar body on mobile", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app");
    await createDraggableLog(page, "Mobile scroll");

    const logBar = page.locator("[data-timeline-log]").filter({ hasText: "Mobile scroll" });
    await pointerDragLogBar(logBar, 80);

    const log = (await readGuestTimeLogs(page)).find((l) => l.title === "Mobile scroll");
    expect(log?.start_time).toBe("09:00");
  });

  test("reschedules from the grip handle on mobile", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app");
    await createDraggableLog(page, "Mobile grip");

    const logBar = page.locator("[data-timeline-log]").filter({ hasText: "Mobile grip" });
    const grip = logBar.getByRole("button", { name: "Drag to reschedule" });
    await pointerDragGripHandle(grip, 80);

    await expect
      .poll(async () => (await readGuestTimeLogs(page)).find((l) => l.title === "Mobile grip")?.start_time)
      .not.toBe("09:00");
  });

  test("renders a wider scrollable week grid on mobile", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app/week");

    const minWidth = await page.getByTestId("week-grid").evaluate((el) => getComputedStyle(el).minWidth);

    expect(minWidth).toBe("860px");
  });
});
