process.env.TZ = "America/New_York";

import { describe, it, expect } from "vitest";
import { addDaysISO, durationMinutes, expandRange, fmtDayHeading, fmtDuration, fmtTimeLabel, fromMin, isoToWeekday, subtractIntervals, toMin } from "./time";

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

  it("wraps a full overnight sleep span", () => {
    expect(durationMinutes("23:00", "06:00")).toBe(420);
  });
});

describe("subtractIntervals", () => {
  it("trims a cut overlapping the start", () => {
    expect(subtractIntervals([[540, 600]], [[520, 560]])).toEqual([[560, 600]]);
  });

  it("trims a cut overlapping the end", () => {
    expect(subtractIntervals([[540, 600]], [[580, 620]])).toEqual([[540, 580]]);
  });

  it("splits the base when a cut falls in the middle", () => {
    expect(subtractIntervals([[540, 1020]], [[720, 780]])).toEqual([[540, 720], [780, 1020]]);
  });

  it("removes a base interval fully covered by a cut", () => {
    expect(subtractIntervals([[780, 840]], [[750, 870]])).toEqual([]);
  });

  it("leaves the base intact when there are no cuts", () => {
    expect(subtractIntervals([[540, 600]], [])).toEqual([[540, 600]]);
  });

  it("applies multiple overlapping cuts", () => {
    expect(subtractIntervals([[0, 600]], [[100, 200], [150, 300]])).toEqual([[0, 100], [300, 600]]);
  });

  it("ignores zero-length cuts", () => {
    expect(subtractIntervals([[540, 600]], [[560, 560]])).toEqual([[540, 600]]);
  });

  it("clips an overnight block by an overnight log using pre-expanded segments", () => {
    // Block 23:00→08:00, log 23:00→01:00 → block remains 01:00→08:00.
    const block = expandRange(toMin("23:00"), toMin("08:00")); // [[1380,1440],[0,480]]
    const log = expandRange(toMin("23:00"), toMin("01:00")); // [[1380,1440],[0,60]]
    expect(subtractIntervals(block, log)).toEqual([[60, 480]]);
  });
});

describe("toMin / fromMin", () => {
  it("round-trips HH:MM values", () => {
    expect(toMin("09:30")).toBe(570);
    expect(fromMin(570)).toBe("09:30");
    expect(toMin("00:00")).toBe(0);
  });

  it("fromMin wraps values outside a day", () => {
    expect(fromMin(1440)).toBe("00:00");
    expect(fromMin(-30)).toBe("23:30");
  });
});

describe("addDaysISO", () => {
  it("crosses month and year boundaries", () => {
    expect(addDaysISO("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDaysISO("2025-12-31", 1)).toBe("2026-01-01");
    expect(addDaysISO("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("is stable across the US DST spring-forward (2026-03-08)", () => {
    expect(addDaysISO("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDaysISO("2026-03-08", 1)).toBe("2026-03-09");
  });
});

describe("isoToWeekday", () => {
  it("returns the local weekday (0=Sun)", () => {
    expect(isoToWeekday("2026-06-10")).toBe(3); // Wednesday
    expect(isoToWeekday("2026-06-14")).toBe(0); // Sunday
  });
});

describe("fmtTimeLabel", () => {
  it("renders 12-hour labels with AM/PM", () => {
    expect(fmtTimeLabel("09:00")).toBe("9 AM");
    expect(fmtTimeLabel("13:30")).toBe("1:30 PM");
    expect(fmtTimeLabel("00:00")).toBe("12 AM");
    expect(fmtTimeLabel("12:00")).toBe("12 PM");
  });
});

describe("fmtDayHeading", () => {
  it("renders the local weekday and day number", () => {
    const heading = fmtDayHeading("2026-06-10");
    expect(heading).toContain("Wednesday");
    expect(heading).toContain("10");
  });
});

describe("fmtDuration", () => {
  it("formats minutes, whole hours, and mixed durations", () => {
    expect(fmtDuration(59)).toBe("59m");
    expect(fmtDuration(60)).toBe("1h");
    expect(fmtDuration(90)).toBe("1h 30m");
    expect(fmtDuration(0)).toBe("0m");
  });
});
