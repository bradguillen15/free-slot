import { describe, it, expect } from "vitest";
import { BLOCK_PRESETS, SUGGESTED_SCHEDULE_TEMPLATE, applyPresetSegmentsAtomic, logDefaultsFromBlock, presetSegments } from "./schedule";
import { findScheduleCollisions } from "./scheduleCollisions";

describe("logDefaultsFromBlock", () => {
  it("prefills the real span for an overnight block", () => {
    expect(
      logDefaultsFromBlock({ name: "Sleep", start_time: "23:00:00", end_time: "08:00:00" })
    ).toEqual({ start: "23:00", end: "08:00", defaultTitle: "Sleep" });
  });

  it("prefills the real span for a same-day block", () => {
    expect(
      logDefaultsFromBlock({ name: "Work", start_time: "09:00:00", end_time: "17:00:00" })
    ).toEqual({ start: "09:00", end: "17:00", defaultTitle: "Work" });
  });
});

describe("BLOCK_PRESETS", () => {
  it("expands Work into morning work, lunch, and afternoon work without overlap", () => {
    const work = BLOCK_PRESETS.find((p) => p.name === "Work");
    expect(work).toBeDefined();
    const segments = presetSegments(work!);
    expect(segments).toEqual([
      { name: "Work", start: "09:00", end: "12:00", color: "#3b82f6" },
      { name: "Lunch", start: "12:00", end: "13:00", color: "#f59e0b" },
      { name: "Break", start: "13:00", end: "13:25", color: "#94a3b8" },
      { name: "Work", start: "13:25", end: "17:00", color: "#3b82f6" },
    ]);

    const blocks = segments.map((seg, i) => ({
      id: String(i),
      name: seg.name,
      start_time: seg.start,
      end_time: seg.end,
      days_of_week: [1, 2, 3, 4, 5],
    }));
    expect(findScheduleCollisions(blocks)).toEqual([]);
  });

  it("uses noon for the standalone Lunch preset", () => {
    const lunch = BLOCK_PRESETS.find((p) => p.name === "Lunch");
    expect(lunch?.start).toBe("12:00");
    expect(lunch?.end).toBe("13:00");
  });
});

describe("SUGGESTED_SCHEDULE_TEMPLATE", () => {
  it("contains daily sleep plus weekday work split by lunch", () => {
    expect(
      SUGGESTED_SCHEDULE_TEMPLATE.map(({ name, start, end, days }) => ({ name, start, end, days }))
    ).toEqual([
      { name: "Sleep", start: "23:00", end: "07:00", days: [0, 1, 2, 3, 4, 5, 6] },
      { name: "Work", start: "09:00", end: "12:00", days: [1, 2, 3, 4, 5] },
      { name: "Lunch", start: "12:00", end: "13:00", days: [1, 2, 3, 4, 5] },
      { name: "Work", start: "13:00", end: "17:00", days: [1, 2, 3, 4, 5] },
    ]);
  });

  it("has no same-day overlaps between template blocks", () => {
    const blocks = SUGGESTED_SCHEDULE_TEMPLATE.map((b, i) => ({
      id: String(i),
      name: b.name,
      start_time: b.start,
      end_time: b.end,
      days_of_week: b.days,
    }));
    expect(findScheduleCollisions(blocks)).toEqual([]);
  });

  it("only uses the fixed block type", () => {
    expect(SUGGESTED_SCHEDULE_TEMPLATE.every((b) => b.type === "fixed")).toBe(true);
  });
});

describe("applyPresetSegmentsAtomic", () => {
  it("rolls back created segments when a later insert fails", async () => {
    const deleted: string[] = [];
    await expect(
      applyPresetSegmentsAtomic(
        [
          { name: "A", start: "09:00", end: "10:00" },
          { name: "B", start: "10:00", end: "11:00" },
        ],
        async (seg) => {
          if (seg.name === "B") throw new Error("insert failed");
          return { id: seg.name };
        },
        async (id) => {
          deleted.push(id);
        },
      ),
    ).rejects.toThrow("insert failed");
    expect(deleted).toEqual(["A"]);
  });

  it("throws when rollback fails after a later insert fails", async () => {
    await expect(
      applyPresetSegmentsAtomic(
        [
          { name: "A", start: "09:00", end: "10:00" },
          { name: "B", start: "10:00", end: "11:00" },
        ],
        async (seg) => {
          if (seg.name === "B") throw new Error("insert failed");
          return { id: seg.name };
        },
        async () => {
          throw new Error("delete failed");
        },
      ),
    ).rejects.toThrow("Preset apply failed and rollback was incomplete.");
  });
});
