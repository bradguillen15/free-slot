import { describe, it, expect } from "vitest";
import { resolvePeriod, periodDays, MAX_CUSTOM_RANGE_DAYS } from "./dashboardPeriod";

// A Monday
const MON = "2026-06-15";

describe("resolvePeriod", () => {
  it("resolves a day period to a single-day range", () => {
    expect(resolvePeriod("day", MON)).toEqual({ kind: "day", start: MON, end: MON });
  });

  it("resolves a week period to the Monday-Sunday range containing the anchor", () => {
    // Wednesday within the same week as MON
    expect(resolvePeriod("week", "2026-06-17")).toEqual({ kind: "week", start: MON, end: "2026-06-21" });
  });

  it("resolves a month period to the first-last day of the anchor's month", () => {
    expect(resolvePeriod("month", "2026-06-17")).toEqual({ kind: "month", start: "2026-06-01", end: "2026-06-30" });
  });

  it("resolves February in a leap year to 29 days", () => {
    expect(resolvePeriod("month", "2028-02-10")).toEqual({ kind: "month", start: "2028-02-01", end: "2028-02-29" });
  });

  it("passes through a valid custom range unchanged", () => {
    expect(resolvePeriod("custom", MON, { start: "2026-06-01", end: "2026-06-10" })).toEqual({
      kind: "custom",
      start: "2026-06-01",
      end: "2026-06-10",
    });
  });

  it("clamps a custom range longer than the max to the max span", () => {
    const start = "2026-01-01";
    const end = "2026-12-31"; // far more than MAX_CUSTOM_RANGE_DAYS
    const result = resolvePeriod("custom", MON, { start, end });
    expect(result.start).toBe(start);
    expect(periodDays(result).length).toBe(MAX_CUSTOM_RANGE_DAYS);
  });

  it("throws when custom range is requested without a custom bound", () => {
    expect(() => resolvePeriod("custom", MON)).toThrow();
  });
});

describe("periodDays", () => {
  it("returns a single date for a day period", () => {
    expect(periodDays(resolvePeriod("day", MON))).toEqual([MON]);
  });

  it("returns 7 dates for a week period", () => {
    const days = periodDays(resolvePeriod("week", MON));
    expect(days).toHaveLength(7);
    expect(days[0]).toBe(MON);
    expect(days[6]).toBe("2026-06-21");
  });

  it("returns 30 dates for a 30-day month", () => {
    const days = periodDays(resolvePeriod("month", "2026-06-01"));
    expect(days).toHaveLength(30);
  });
});
