import { describe, it, expect } from "vitest";
import {
  mapCategory,
  mapActivity,
  mapScheduleBlock,
  mapTimeLog,
  mapProfile,
  mapWeeklyPlan,
  sortCategories,
  sortScheduleBlocks,
} from "./mappers";
import type { LocalCategory, LocalScheduleBlock } from "@/lib/localStore";

describe("mapCategory", () => {
  it("sets hidden=false when missing", () => {
    const r = { id: "1", name: "Work", color: "#fff", type: "productive", is_default: false, created_at: "2024-01-01" };
    expect(mapCategory(r as Record<string, unknown>).hidden).toBe(false);
  });

  it("preserves hidden=true", () => {
    const r = { id: "1", name: "Work", color: "#fff", type: "productive", is_default: false, created_at: "2024-01-01", hidden: true };
    expect(mapCategory(r as Record<string, unknown>).hidden).toBe(true);
  });
});

describe("mapActivity", () => {
  it("passes through the row as-is", () => {
    const r = { id: "a1", name: "Reading", category_id: "c1", target_hours_per_week: 5, is_active: true, created_at: "2024-01-01" };
    expect(mapActivity(r as Record<string, unknown>)).toEqual(r);
  });
});

describe("mapScheduleBlock", () => {
  it("passes through the row as-is", () => {
    const r = { id: "b1", name: "Deep work", start_time: "09:00", end_time: "11:00", days_of_week: [1, 2], type: "fixed", color: "#333", created_at: "2024-01-01" };
    expect(mapScheduleBlock(r as Record<string, unknown>)).toEqual(r);
  });
});

describe("mapTimeLog", () => {
  it("passes through the row as-is when times are already HH:MM", () => {
    const r = { id: "l1", date: "2024-06-01", start_time: "09:00", end_time: "10:00", category_id: "c1", type: "productive" };
    expect(mapTimeLog(r as Record<string, unknown>)).toEqual(r);
  });

  it("strips seconds from Postgres TIME columns (HH:MM:SS → HH:MM)", () => {
    const r = { id: "l1", date: "2024-06-01", start_time: "23:00:00", end_time: "07:00:00", category_id: null, type: "productive" };
    const result = mapTimeLog(r as Record<string, unknown>);
    expect(result.start_time).toBe("23:00");
    expect(result.end_time).toBe("07:00");
  });

  it("strips microseconds from Postgres TIME columns (HH:MM:SS.ffffff → HH:MM)", () => {
    const r = { id: "l1", date: "2024-06-01", start_time: "09:00:00.000000", end_time: "10:30:00.000000", category_id: null, type: "productive" };
    const result = mapTimeLog(r as Record<string, unknown>);
    expect(result.start_time).toBe("09:00");
    expect(result.end_time).toBe("10:30");
  });
});

describe("mapProfile", () => {
  it("passes through the row as-is", () => {
    const r = { peak_hours: { start: "09:00", end: "12:00" }, include_weekends: false, weekly_review_day: 0, onboarding_completed: true };
    expect(mapProfile(r as Record<string, unknown>)).toEqual(r);
  });
});

describe("mapWeeklyPlan", () => {
  it("passes through the row as-is", () => {
    const r = { id: "w1", week_start: "2024-06-03", generated_at: "2024-06-03T10:00:00Z", slots: [] };
    expect(mapWeeklyPlan(r as Record<string, unknown>)).toEqual(r);
  });
});

describe("sortScheduleBlocks", () => {
  it("sorts by sort_order ascending, then created_at", () => {
    const b1 = { id: "b1", sort_order: 2, created_at: "2024-01-01" } as unknown as LocalScheduleBlock;
    const b2 = { id: "b2", sort_order: 0, created_at: "2024-01-02" } as unknown as LocalScheduleBlock;
    const b3 = { id: "b3", sort_order: 0, created_at: "2024-01-01" } as unknown as LocalScheduleBlock;
    expect(sortScheduleBlocks([b1, b2, b3]).map((b) => b.id)).toEqual(["b3", "b2", "b1"]);
  });

  it("does not mutate the original array", () => {
    const blocks = [{ id: "b1", sort_order: 1, created_at: "2024-01-01" } as unknown as LocalScheduleBlock];
    const original = [...blocks];
    sortScheduleBlocks(blocks);
    expect(blocks).toEqual(original);
  });
});

describe("sortCategories", () => {
  it("sorts by sort_order ascending, then created_at", () => {
    const c1 = { id: "c1", sort_order: 2, created_at: "2024-01-01" } as unknown as LocalCategory;
    const c2 = { id: "c2", sort_order: 0, created_at: "2024-01-02" } as unknown as LocalCategory;
    const c3 = { id: "c3", sort_order: 0, created_at: "2024-01-01" } as unknown as LocalCategory;
    expect(sortCategories([c1, c2, c3]).map((c) => c.id)).toEqual(["c3", "c2", "c1"]);
  });

  it("does not mutate the original array", () => {
    const cats = [{ id: "c1", sort_order: 1, created_at: "2024-01-01" } as unknown as LocalCategory];
    const original = [...cats];
    sortCategories(cats);
    expect(cats).toEqual(original);
  });
});
