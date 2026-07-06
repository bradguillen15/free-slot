import { describe, expect, it } from "vitest";
import { buildScheduleVsActual, effectiveCategoryIds } from "./scheduleVsActual";

// 2026-07-06 is a Monday.
const WEEK = "2026-07-06";
const WEEKDAYS = [1, 2, 3, 4, 5];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const block = (categoryId: string | null, start: string, end: string, days: number[] = WEEKDAYS) => ({
  start_time: start,
  end_time: end,
  days_of_week: days,
  category_id: categoryId,
});

const log = (categoryId: string | null, date: string, start: string, end: string) => ({
  date,
  start_time: start,
  end_time: end,
  category_id: categoryId,
});

const rowFor = (result: ReturnType<typeof buildScheduleVsActual>, categoryId: string) =>
  result.rows.find((r) => r.categoryId === categoryId);

describe("buildScheduleVsActual", () => {
  it("compares scheduled vs logged totals per label", () => {
    const result = buildScheduleVsActual(
      WEEK,
      [block("deep", "09:00", "12:00")], // 3h x 5 weekdays = 15h
      [
        log("deep", "2026-07-06", "09:00", "12:00"),
        log("deep", "2026-07-07", "09:00", "14:00"),
      ]
    );
    const deep = rowFor(result, "deep")!;
    expect(deep.scheduledMin).toBe(15 * 60);
    expect(deep.loggedMin).toBe(8 * 60);
  });

  it("creates a row for a label that is logged but never scheduled", () => {
    const result = buildScheduleVsActual(WEEK, [], [log("gaming", "2026-07-08", "20:00", "23:00")]);
    const gaming = rowFor(result, "gaming")!;
    expect(gaming.scheduledMin).toBe(0);
    expect(gaming.loggedMin).toBe(180);
    expect(gaming.adherenceMin).toBe(0);
  });

  it("attributes overnight blocks across calendar days without losing minutes", () => {
    const result = buildScheduleVsActual(WEEK, [block("sleep", "23:00", "07:00", ALL_DAYS)], []);
    const sleep = rowFor(result, "sleep")!;
    // Every date in the week gets 23:00–24:00 (own day) + 00:00–07:00 (wrap from previous day).
    expect(sleep.scheduledMin).toBe(7 * 8 * 60);
  });

  it("gives zero adherence when the same label is logged outside its window", () => {
    const result = buildScheduleVsActual(
      WEEK,
      [block("deep", "09:00", "12:00", [1])],
      [log("deep", "2026-07-06", "15:00", "18:00")]
    );
    const deep = rowFor(result, "deep")!;
    expect(deep.loggedMin).toBe(180);
    expect(deep.adherenceMin).toBe(0);
    expect(deep.displacement.unloggedMin).toBe(180);
  });

  it("counts only the overlapping part as adherence", () => {
    const result = buildScheduleVsActual(
      WEEK,
      [block("deep", "09:00", "12:00", [1])],
      [log("deep", "2026-07-06", "10:00", "14:00")]
    );
    expect(rowFor(result, "deep")!.adherenceMin).toBe(120);
  });

  it("breaks a scheduled window into kept, displaced-by-label, and unlogged", () => {
    const result = buildScheduleVsActual(
      WEEK,
      [block("deep", "09:00", "12:00", [1])],
      [
        log("deep", "2026-07-06", "09:00", "10:00"),
        log("gaming", "2026-07-06", "10:00", "11:30"),
      ]
    );
    const deep = rowFor(result, "deep")!;
    expect(deep.displacement.keptMin).toBe(60);
    expect(deep.displacement.byCategory).toEqual([{ categoryId: "gaming", min: 90 }]);
    expect(deep.displacement.unloggedMin).toBe(30);
    expect(
      deep.displacement.keptMin +
        deep.displacement.byCategory.reduce((s, d) => s + d.min, 0) +
        deep.displacement.unloggedMin
    ).toBe(deep.scheduledMin);
  });

  it("never attributes a window minute twice when logs overlap", () => {
    const result = buildScheduleVsActual(
      WEEK,
      [block("deep", "09:00", "12:00", [1])],
      [
        log("gaming", "2026-07-06", "09:00", "11:00"),
        log("reading", "2026-07-06", "10:00", "12:00"),
      ]
    );
    const deep = rowFor(result, "deep")!;
    const attributed =
      deep.displacement.keptMin +
      deep.displacement.byCategory.reduce((s, d) => s + d.min, 0) +
      deep.displacement.unloggedMin;
    expect(attributed).toBe(deep.scheduledMin);
    // Earliest log start wins the contested 10:00–11:00 hour.
    expect(deep.displacement.byCategory).toEqual([
      { categoryId: "gaming", min: 120 },
      { categoryId: "reading", min: 60 },
    ]);
  });

  it("prefers the label's own log over an earlier overlapping foreign log", () => {
    const result = buildScheduleVsActual(
      WEEK,
      [block("deep", "09:00", "12:00", [1])],
      [
        log("gaming", "2026-07-06", "08:00", "12:00"),
        log("deep", "2026-07-06", "10:00", "12:00"),
      ]
    );
    const deep = rowFor(result, "deep")!;
    expect(deep.displacement.keptMin).toBe(120);
    expect(deep.displacement.byCategory).toEqual([{ categoryId: "gaming", min: 60 }]);
  });

  it("computes weekly totals and adherence percentage", () => {
    const result = buildScheduleVsActual(
      WEEK,
      [block("deep", "09:00", "11:00", [1, 2])], // 4h scheduled
      [
        log("deep", "2026-07-06", "09:00", "11:00"), // 2h kept
        log("gaming", "2026-07-07", "09:00", "11:00"), // displaces the other 2h
      ]
    );
    expect(result.totals.scheduledMin).toBe(240);
    expect(result.totals.adherenceMin).toBe(120);
    expect(result.totals.adherencePct).toBe(50);
  });

  it("reports null adherence percentage when nothing is scheduled", () => {
    const result = buildScheduleVsActual(WEEK, [], [log("deep", "2026-07-06", "09:00", "10:00")]);
    expect(result.totals.adherencePct).toBeNull();
  });

  it("ignores blocks and logs without a label", () => {
    const result = buildScheduleVsActual(
      WEEK,
      [block(null, "09:00", "12:00", [1])],
      [log(null, "2026-07-06", "09:00", "10:00")]
    );
    expect(result.rows).toHaveLength(0);
  });

  it("sorts rows by scheduled+logged descending", () => {
    const result = buildScheduleVsActual(
      WEEK,
      [block("deep", "09:00", "10:00", [1]), block("meals", "12:00", "16:00", [1])],
      [log("gaming", "2026-07-06", "18:00", "20:00")]
    );
    expect(result.rows.map((r) => r.categoryId)).toEqual(["meals", "gaming", "deep"]);
  });

  it("deduplicates overlapping same-category scheduled windows", () => {
    const result = buildScheduleVsActual(
      WEEK,
      [
        block("deep", "09:00", "12:00", [1]),
        block("deep", "10:00", "14:00", [1]),
      ],
      [log("deep", "2026-07-06", "09:00", "14:00")]
    );
    const deep = rowFor(result, "deep")!;
    expect(deep.scheduledMin).toBe(300);
    expect(deep.adherenceMin).toBe(300);
    expect(result.totals.adherencePct).toBe(100);
  });

  it("only counts logs inside the requested week", () => {
    const result = buildScheduleVsActual(WEEK, [], [
      log("deep", "2026-07-05", "09:00", "10:00"), // Sunday before the week
      log("deep", "2026-07-12", "09:00", "10:00"), // inside (last day of week)
    ]);
    expect(rowFor(result, "deep")!.loggedMin).toBe(60);
  });
});

describe("effectiveCategoryIds", () => {
  const all = ["a", "b", "c", "d"];

  it("returns everything minus exclusions when nothing is included", () => {
    expect(effectiveCategoryIds(all, [], ["b"])).toEqual(["a", "c", "d"]);
  });

  it("returns inclusions minus exclusions when includes exist", () => {
    expect(effectiveCategoryIds(all, ["a", "b"], ["b"])).toEqual(["a"]);
  });

  it("returns all when no filters are active", () => {
    expect(effectiveCategoryIds(all, [], [])).toEqual(all);
  });
});
