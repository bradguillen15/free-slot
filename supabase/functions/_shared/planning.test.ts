import { describe, it, expect } from "vitest";
import {
  buildPlanPrompts,
  buildReviewPrompts,
  fmtMinutes,
  rankActivities,
  validateSlots,
  type GapWindow,
} from "./planning.ts";

const gap = (day: string, start: string, end: string): GapWindow => ({
  day, start, end, durationMin: 0, isPeak: false,
});

const gaps = [gap("2026-06-08", "09:00", "12:00"), gap("2026-06-09", "18:00", "20:00")];

const slot = (overrides: Record<string, unknown> = {}) => ({
  activity_id: "a1",
  activity_name: "Guitar",
  day: "2026-06-08",
  start: "09:00",
  end: "10:00",
  ...overrides,
});

describe("validateSlots", () => {
  it("accepts a slot inside a window on the same day", () => {
    expect(validateSlots([slot()], gaps)).toHaveLength(1);
  });

  it("rejects malformed day/time formats", () => {
    expect(validateSlots([slot({ day: "06/08/2026" })], gaps)).toEqual([]);
    expect(validateSlots([slot({ start: "9am" })], gaps)).toEqual([]);
    expect(validateSlots([slot({ end: "25:99" })], gaps)).toHaveLength(0); // format ok but no window contains it
  });

  it("rejects zero-length and inverted slots", () => {
    expect(validateSlots([slot({ end: "09:00" })], gaps)).toEqual([]);
    expect(validateSlots([slot({ start: "11:00", end: "10:00" })], gaps)).toEqual([]);
  });

  it("rejects slots outside any submitted window", () => {
    expect(validateSlots([slot({ start: "08:00", end: "09:30" })], gaps)).toEqual([]); // starts before window
    expect(validateSlots([slot({ day: "2026-06-09", start: "09:00", end: "10:00" })], gaps)).toEqual([]); // wrong day's window
  });

  it("rejects non-array and non-object input without throwing", () => {
    expect(validateSlots(null, gaps)).toEqual([]);
    expect(validateSlots([null, 42, "x"], gaps)).toEqual([]);
  });

  it("keeps valid slots while dropping invalid neighbors", () => {
    const valid = slot();
    const invalid = slot({ end: "13:00" }); // exceeds the window
    expect(validateSlots([invalid, valid], gaps)).toEqual([
      expect.objectContaining({ start: "09:00", end: "10:00" }),
    ]);
  });
});

describe("rankActivities", () => {
  const acts = [
    { id: "a1", name: "Guitar", target_hours_per_week: 2, category_id: null },
    { id: "a2", name: "Reading", target_hours_per_week: 5, category_id: null },
  ];

  it("orders by explicit priority rank", () => {
    const ordered = rankActivities(acts, [
      { activity_id: "a1", rank: 0 },
      { activity_id: "a2", rank: 1 },
    ]);
    expect(ordered.map((a) => a.id)).toEqual(["a1", "a2"]);
  });

  it("falls back to target hours desc without priorities", () => {
    expect(rankActivities(acts, []).map((a) => a.id)).toEqual(["a2", "a1"]);
  });

  it("skips priorities referencing unknown activities", () => {
    const ordered = rankActivities(acts, [
      { activity_id: "ghost", rank: 0 },
      { activity_id: "a1", rank: 1 },
    ]);
    expect(ordered.map((a) => a.id)).toEqual(["a1"]);
  });
});

describe("prompt builders", () => {
  it("buildPlanPrompts lists ranked activities and flags peak windows", () => {
    const { user } = buildPlanPrompts(
      "2026-06-08",
      [{ ...gap("2026-06-08", "09:00", "12:00"), durationMin: 180, isPeak: true }],
      [{ id: "a1", name: "Guitar", target_hours_per_week: 4, category_id: null }],
      []
    );
    expect(user).toContain("1. Guitar (target 4h/wk, id=a1)");
    expect(user).toContain("(180m, PEAK)");
  });

  it("buildPlanPrompts uses placeholders when empty", () => {
    const { user } = buildPlanPrompts("2026-06-08", [], [], []);
    expect(user).toContain("(none)");
  });

  it("buildReviewPrompts formats minutes and falls back when there is no plan", () => {
    const { user } = buildReviewPrompts({
      weekStart: "2026-06-08",
      planned: [],
      actual: [{ name: "Guitar", minutes: 90 }],
      productiveRatio: 80,
      totalTracked: 90,
    });
    expect(user).toContain("(no plan)");
    expect(user).toContain("- Guitar: 1h 30m");
    expect(user).toContain("80% (1h 30m tracked)");
  });
});

describe("fmtMinutes", () => {
  it("formats minutes, hours, and mixes", () => {
    expect(fmtMinutes(45)).toBe("45m");
    expect(fmtMinutes(60)).toBe("1h");
    expect(fmtMinutes(90)).toBe("1h 30m");
  });
});
