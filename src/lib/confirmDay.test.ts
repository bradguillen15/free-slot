import { describe, it, expect } from "vitest";
import { buildConfirmDayRows } from "./confirmDay";

const category = (id: string, type: "productive" | "unproductive" | "essential" = "productive") => ({
  id, name: `Cat ${id}`, type, color: "#000", is_default: false, hidden: false, created_at: "",
});

const block = (overrides: Record<string, unknown> = {}) => ({
  id: "b1",
  name: "Work",
  start_time: "09:00",
  end_time: "17:00",
  days_of_week: [1, 2, 3, 4, 5],
  category_id: "c1" as string | null,
  ...overrides,
});

const log = (overrides: Record<string, unknown> = {}) => ({
  id: "l1",
  date: "2026-07-06", // Monday
  start_time: "09:00",
  end_time: "10:00",
  ...overrides,
});

describe("buildConfirmDayRows", () => {
  const categories = [category("c1", "productive")];

  it("materializes a block with no existing logs into one row per block", () => {
    const result = buildConfirmDayRows("2026-07-06", [block()], [], categories);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      date: "2026-07-06",
      start_time: "09:00",
      end_time: "17:00",
      category_id: "c1",
      type: "productive",
      title: "Work",
    });
    expect(result.skipped).toHaveLength(0);
  });

  it("materializes an overnight block as a single row", () => {
    const sleep = block({ id: "b2", name: "Sleep", start_time: "23:00", end_time: "07:00", days_of_week: [0, 1, 2, 3, 4, 5, 6] });
    const result = buildConfirmDayRows("2026-07-06", [sleep], [], categories);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ start_time: "23:00", end_time: "07:00" });
  });

  it("skips a block fully covered by an existing log", () => {
    const result = buildConfirmDayRows(
      "2026-07-06",
      [block()],
      [log({ start_time: "09:00", end_time: "17:00" })],
      categories
    );
    expect(result.rows).toHaveLength(0);
    expect(result.skipped).toEqual([{ blockId: "b1", reason: "overlaps-existing" }]);
  });

  it("skips a block only partially covered by an existing log (no partial fill)", () => {
    const result = buildConfirmDayRows(
      "2026-07-06",
      [block()],
      [log({ start_time: "12:00", end_time: "13:00" })],
      categories
    );
    expect(result.rows).toHaveLength(0);
    expect(result.skipped).toEqual([{ blockId: "b1", reason: "overlaps-existing" }]);
  });

  it("skips a block with no category_id", () => {
    const result = buildConfirmDayRows("2026-07-06", [block({ category_id: null })], [], categories);
    expect(result.rows).toHaveLength(0);
    expect(result.skipped).toEqual([{ blockId: "b1", reason: "no-category" }]);
  });

  it("ignores blocks not active on the given weekday", () => {
    const weekendOnly = block({ days_of_week: [0, 6] }); // 2026-07-06 is a Monday
    const result = buildConfirmDayRows("2026-07-06", [weekendOnly], [], categories);
    expect(result.rows).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });

  it("is idempotent: re-running against a day with its own confirm-created logs produces no new rows", () => {
    const first = buildConfirmDayRows("2026-07-06", [block()], [], categories);
    expect(first.rows).toHaveLength(1);

    const existingLogs = [log({ id: "confirmed-1", start_time: first.rows[0].start_time, end_time: first.rows[0].end_time })];
    const second = buildConfirmDayRows("2026-07-06", [block()], existingLogs, categories);
    expect(second.rows).toHaveLength(0);
  });

  it("uses the category's type for the log's type", () => {
    const result = buildConfirmDayRows(
      "2026-07-06",
      [block({ category_id: "c-unprod" })],
      [],
      [...categories, category("c-unprod", "unproductive")]
    );
    expect(result.rows[0].type).toBe("unproductive");
  });
});
