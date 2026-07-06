import { describe, it, expect } from "vitest";
import { resolvePeriod, periodDays } from "./dashboardPeriod";

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
