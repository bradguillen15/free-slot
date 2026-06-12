// Force a timezone west of UTC so the UTC-vs-local month-iteration bug is reproducible.
process.env.TZ = "America/New_York";

import { beforeEach, describe, it, expect, vi } from "vitest";
import {
  clearGuestData,
  deleteLog,
  ensureBootstrap,
  getProfile,
  hasGuestData,
  insertLog,
  listActivities,
  listCategories,
  listLogsForMonth,
  listLogsInRange,
  listPriorities,
  listScheduleBlocks,
  reorderScheduleBlocks,
  setPriorities,
  updateLog,
  updateProfile,
  upsertActivity,
  upsertScheduleBlock,
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
    expect(p.onboarding_completed).toBe(false);
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

describe("ensureBootstrap", () => {
  it("seeds the 11 default categories once and is idempotent", () => {
    ensureBootstrap();
    ensureBootstrap();
    expect(listCategories()).toHaveLength(11);
  });
});

describe("activity / block upserts", () => {
  it("inserts with defaults, then updates in place by id", () => {
    const a = upsertActivity({ name: "Guitar" });
    expect(a.target_hours_per_week).toBe(1);
    expect(a.is_active).toBe(true);

    const updated = upsertActivity({ id: a.id, target_hours_per_week: 4 });
    expect(updated.target_hours_per_week).toBe(4);
    expect(listActivities()).toHaveLength(1);
  });

  it("upserts schedule blocks the same way", () => {
    const b = upsertScheduleBlock({ name: "Work", start_time: "09:00", end_time: "17:00", days_of_week: [1, 2] });
    const updated = upsertScheduleBlock({ id: b.id, end_time: "18:00" });
    expect(updated.end_time).toBe("18:00");
    expect(listScheduleBlocks()).toHaveLength(1);
  });

  it("reorders schedule blocks by id list", () => {
    const a = upsertScheduleBlock({ name: "A", start_time: "09:00", end_time: "10:00", days_of_week: [1] });
    const b = upsertScheduleBlock({ name: "B", start_time: "10:00", end_time: "11:00", days_of_week: [1] });
    const c = upsertScheduleBlock({ name: "C", start_time: "11:00", end_time: "12:00", days_of_week: [1] });
    reorderScheduleBlocks([c.id, a.id, b.id]);
    expect(listScheduleBlocks().map((x) => x.name)).toEqual(["C", "A", "B"]);
  });
});

describe("log bucketing and deletion", () => {
  it("buckets logs by month and deletes across buckets", () => {
    const june = insertLog({ date: "2026-06-15", start_time: "09:00", end_time: "10:00", type: "productive" });
    insertLog({ date: "2026-07-01", start_time: "09:00", end_time: "10:00", type: "productive" });
    expect(listLogsForMonth("2026-06")).toHaveLength(1);
    expect(listLogsForMonth("2026-07")).toHaveLength(1);

    deleteLog(june.id);
    expect(listLogsForMonth("2026-06")).toHaveLength(0);
    expect(listLogsForMonth("2026-07")).toHaveLength(1);
  });
});

describe("hasGuestData", () => {
  it("is false on a fresh store, true after each kind of data appears", () => {
    expect(hasGuestData()).toBe(false);

    insertLog({ date: "2026-06-10", start_time: "09:00", end_time: "10:00", type: "productive" });
    expect(hasGuestData()).toBe(true);

    clearGuestData();
    expect(hasGuestData()).toBe(false);

    updateProfile({ onboarding_completed: true });
    expect(hasGuestData()).toBe(true);
  });
});

describe("clearGuestData", () => {
  it("removes only freeslot.guest.* keys and fires the change event", () => {
    insertLog({ date: "2026-06-10", start_time: "09:00", end_time: "10:00", type: "productive" });
    localStorage.setItem("freeslot:bestRatio", "42");
    localStorage.setItem("unrelated.key", "keep");
    const listener = vi.fn();
    window.addEventListener("freeslot:guest-change", listener);

    clearGuestData();

    expect(localStorage.getItem("freeslot:bestRatio")).toBe("42");
    expect(localStorage.getItem("unrelated.key")).toBe("keep");
    expect(listLogsForMonth("2026-06")).toEqual([]);
    expect(listener).toHaveBeenCalled();
    window.removeEventListener("freeslot:guest-change", listener);
  });
});

describe("weekly priorities", () => {
  it("round-trips per week and overwrites on re-set", () => {
    setPriorities("2026-06-08", [{ activity_id: "a1", rank: 0 }, { activity_id: "a2", rank: 1 }]);
    expect(listPriorities("2026-06-08")).toEqual([
      { week_start: "2026-06-08", activity_id: "a1", rank: 0 },
      { week_start: "2026-06-08", activity_id: "a2", rank: 1 },
    ]);

    setPriorities("2026-06-08", [{ activity_id: "a2", rank: 0 }]);
    expect(listPriorities("2026-06-08")).toHaveLength(1);
    expect(listPriorities("2026-06-15")).toEqual([]);
  });
});
