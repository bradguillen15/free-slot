process.env.TZ = "America/New_York";

import { describe, it, expect } from "vitest";
import { weekStartISO, weekDays, fmtWeekRange } from "./week";

describe("weekStartISO (Monday convention)", () => {
  it("returns the same date for a Monday", () => {
    expect(weekStartISO("2026-06-08")).toBe("2026-06-08"); // Monday
  });

  it("returns the previous Monday for a mid-week date", () => {
    expect(weekStartISO("2026-06-10")).toBe("2026-06-08"); // Wednesday
  });

  it("maps a Sunday to the Monday six days earlier, not the next day", () => {
    expect(weekStartISO("2026-06-14")).toBe("2026-06-08"); // Sunday
  });

  it("crosses a year boundary", () => {
    expect(weekStartISO("2026-01-01")).toBe("2025-12-29"); // Thursday → prior Monday
  });
});

describe("weekDays", () => {
  it("returns 7 consecutive ISO dates starting at weekStart", () => {
    expect(weekDays("2026-06-08")).toEqual([
      "2026-06-08", "2026-06-09", "2026-06-10", "2026-06-11",
      "2026-06-12", "2026-06-13", "2026-06-14",
    ]);
  });

  it("spans a month boundary", () => {
    expect(weekDays("2026-06-29")[6]).toBe("2026-07-05");
  });
});

describe("fmtWeekRange", () => {
  it("renders a same-month range without repeating the month", () => {
    expect(fmtWeekRange("2026-06-08")).toBe("Jun 8 – 14");
  });

  it("renders a cross-month range with both months", () => {
    expect(fmtWeekRange("2026-06-29")).toBe("Jun 29 – Jul 5");
  });
});
