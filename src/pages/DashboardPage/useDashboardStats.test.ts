import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { resolvePeriod } from "@/lib/dashboardPeriod";
import type { LocalCategory, LocalScheduleBlock, LocalTimeLog } from "@/lib/localStore";

const cats: LocalCategory[] = [
  { id: "work", name: "Work", type: "productive", color: "#3b82f6", is_default: false, hidden: false, created_at: "2024-01-01" },
  { id: "gym", name: "Gym", type: "productive", color: "#22c55e", is_default: false, hidden: false, created_at: "2024-01-01" },
];

const logs: LocalTimeLog[] = [
  { id: "l1", date: "2026-06-15", start_time: "09:00", end_time: "10:00", category_id: "work", type: "productive", notes: null, created_at: "2024-01-01" },
  { id: "l2", date: "2026-06-16", start_time: "18:00", end_time: "18:30", category_id: "gym", type: "productive", notes: null, created_at: "2024-01-01" },
];

const blocks: LocalScheduleBlock[] = [
  { id: "b1", name: "Work block", start_time: "09:00", end_time: "11:00", days_of_week: [1], color: "#3b82f6", type: "fixed", category_id: "work", created_at: "2024-01-01" },
];

const state = { logs, cats, blocks };

vi.mock("@/lib/dataStore", () => ({
  useTimeLogsInRange: () => ({ data: state.logs }),
  useCategories: () => ({ data: state.cats }),
  useScheduleBlocks: () => ({ data: state.blocks }),
}));

import { useDashboardStats } from "./useDashboardStats";

describe("useDashboardStats", () => {
  it("builds a wide-format trend row per day with per-category minutes", () => {
    const period = resolvePeriod("week", "2026-06-15");
    const { result } = renderHook(() => useDashboardStats(period));
    const monRow = result.current.trendData.find((r) => r.date === "2026-06-15");
    const tueRow = result.current.trendData.find((r) => r.date === "2026-06-16");
    expect(monRow?.work).toBe(60);
    expect(tueRow?.gym).toBe(30);
  });

  it("merges planned minutes per day per category", () => {
    const period = resolvePeriod("week", "2026-06-15");
    const { result } = renderHook(() => useDashboardStats(period));
    const monRow = result.current.plannedData.find((r) => r.date === "2026-06-15");
    expect(monRow?.work).toBe(120);
  });

  it("returns category metadata sorted by total minutes desc", () => {
    const period = resolvePeriod("week", "2026-06-15");
    const { result } = renderHook(() => useDashboardStats(period));
    expect(result.current.categories.map((c) => c.id)).toEqual(["work", "gym"]);
  });

  it("reports isEmpty false when logs or blocks exist in the period", () => {
    const period = resolvePeriod("week", "2026-06-15");
    const { result } = renderHook(() => useDashboardStats(period));
    expect(result.current.isEmpty).toBe(false);
  });

  it("reports isEmpty true when there are no logs and no blocks", () => {
    state.logs = [];
    state.blocks = [];
    const period = resolvePeriod("week", "2026-06-15");
    const { result } = renderHook(() => useDashboardStats(period));
    expect(result.current.isEmpty).toBe(true);
    state.logs = logs;
    state.blocks = blocks;
  });

  it("computes total minutes tracked and days logged for the period", () => {
    const period = resolvePeriod("week", "2026-06-15");
    const { result } = renderHook(() => useDashboardStats(period));
    expect(result.current.totals.total).toBe(90);
    expect(result.current.daysLogged).toBe(2);
  });
});
