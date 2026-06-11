// Force a timezone west of UTC so the UTC-vs-local month-iteration bug is reproducible.
process.env.TZ = "America/New_York";

import { beforeEach, describe, it, expect } from "vitest";
import {
  getProfile,
  insertLog,
  listActivities,
  listLogsInRange,
  updateLog,
} from "./localStore";

beforeEach(() => {
  localStorage.clear();
});

describe("listLogsInRange", () => {
  it("includes logs on a range end that falls on the 1st of a month", () => {
    insertLog({ date: "2026-03-01", start_time: "09:00", end_time: "10:00", type: "productive" });
    const logs = listLogsInRange("2026-02-23", "2026-03-01");
    expect(logs).toHaveLength(1);
    expect(logs[0].date).toBe("2026-03-01");
  });

  it("spans a year boundary", () => {
    insertLog({ date: "2026-01-02", start_time: "09:00", end_time: "10:00", type: "productive" });
    const logs = listLogsInRange("2025-12-29", "2026-01-04");
    expect(logs).toHaveLength(1);
  });
});

describe("corrupt localStorage shapes", () => {
  it("getProfile falls back to defaults when the stored value is null", () => {
    localStorage.setItem("freeslot.guest.profile", "null");
    const p = getProfile();
    expect(p.peak_hours).toEqual({ start: "09:00", end: "12:00" });
    expect(p.buffer_minutes).toBe(15);
  });

  it("list functions return [] when the stored value is not an array", () => {
    localStorage.setItem("freeslot.guest.activities", "{}");
    expect(listActivities()).toEqual([]);
  });
});

describe("updateLog", () => {
  it("throws when no log matches the id (parity with the cloud adapter)", () => {
    expect(() => updateLog("missing-id", { notes: "x" })).toThrow();
  });

  it("updates a matching log in place", () => {
    const log = insertLog({ date: "2026-06-10", start_time: "09:00", end_time: "10:00", type: "productive" });
    const updated = updateLog(log.id, { notes: "hi" });
    expect(updated?.notes).toBe("hi");
  });
});
