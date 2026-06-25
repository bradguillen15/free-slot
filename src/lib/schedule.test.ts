import { describe, it, expect } from "vitest";
import { BLOCK_PRESETS, logDefaultsFromBlock, presetSegments } from "./schedule";
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
