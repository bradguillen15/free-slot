import { useMemo } from "react";
import { useCategories, useScheduleBlocks, useTimeLogsInRange } from "@/lib/dataStore";
import { durationMinutes } from "@/lib/time";
import { periodDays, type Period } from "@/lib/dashboardPeriod";
import { plannedMinutesByDay, type PlannedDayRow } from "@/lib/plannedMinutes";

export type CategoryMeta = { id: string; name: string; color: string; totalMinutes: number };
export type TrendRow = { date: string; [categoryId: string]: number | string };

export function useDashboardStats(period: Period) {
  const days = useMemo(() => periodDays(period), [period]);

  const { data: logs } = useTimeLogsInRange(period.start, period.end);
  const { data: cats } = useCategories();
  const { data: blocks } = useScheduleBlocks();

  const catMap = useMemo(() => Object.fromEntries(cats.map((c) => [c.id, c])), [cats]);

  const trendData: TrendRow[] = useMemo(() => {
    return days.map((date) => {
      const row: TrendRow = { date };
      for (const log of logs) {
        if (log.date !== date || !log.category_id) continue;
        const prev = (row[log.category_id] as number) ?? 0;
        row[log.category_id] = prev + durationMinutes(log.start_time, log.end_time);
      }
      return row;
    });
  }, [days, logs]);

  const plannedData: PlannedDayRow[] = useMemo(() => plannedMinutesByDay(blocks, days), [blocks, days]);

  const categories: CategoryMeta[] = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of trendData) {
      for (const [key, value] of Object.entries(row)) {
        if (key === "date") continue;
        totals.set(key, (totals.get(key) ?? 0) + (value as number));
      }
    }
    for (const row of plannedData) {
      for (const [key, value] of Object.entries(row)) {
        if (key === "date") continue;
        if (!totals.has(key)) totals.set(key, 0);
      }
    }
    return [...totals.entries()]
      .map(([id, totalMinutes]) => {
        const c = catMap[id];
        return c ? { id, name: c.name, color: c.color, totalMinutes } : null;
      })
      .filter((c): c is CategoryMeta => c !== null)
      .sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [trendData, plannedData, catMap]);

  const isEmpty = logs.length === 0 && blocks.length === 0;

  const totals = useMemo(() => {
    const total = logs
      .filter((l) => l.date >= period.start && l.date <= period.end)
      .reduce((sum, l) => sum + durationMinutes(l.start_time, l.end_time), 0);
    return { total: Math.round(total) };
  }, [logs, period.start, period.end]);

  const daysLogged = useMemo(() => new Set(logs.map((l) => l.date)).size, [logs]);

  return { trendData, plannedData, categories, isEmpty, totals, daysLogged };
}
