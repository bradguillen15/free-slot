import { describe, it, expect } from "vitest";
import { expandRange, durationMinutes } from "./time";

describe("expandRange", () => {
  it("returns a single segment for a normal range", () => {
    expect(expandRange(540, 600)).toEqual([[540, 600]]);
  });

  it("splits an overnight range at midnight", () => {
    // 23:00 → 07:30
    expect(expandRange(1380, 450)).toEqual([[1380, 1440], [0, 450]]);
  });

  it("treats a zero-length range as empty, not a full-day wrap", () => {
    expect(expandRange(540, 540)).toEqual([]);
  });
});

describe("durationMinutes", () => {
  it("computes a normal duration", () => {
    expect(durationMinutes("09:00", "10:30")).toBe(90);
  });

  it("wraps overnight durations past midnight", () => {
    expect(durationMinutes("23:00", "01:00")).toBe(120);
  });

  it("returns 0 for equal start and end", () => {
    expect(durationMinutes("09:00", "09:00")).toBe(0);
  });
});
