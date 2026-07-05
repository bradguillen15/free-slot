import { useMemo } from "react";
import { useCategories, useScheduleBlocks, useTimeLogsInRange, useWeeklyPlan } from "@/lib/dataStore";
import { addDaysISO, durationMinutes as durMin } from "@/lib/time";
import { weekDays } from "@/lib/week";
import { buildScheduleVsActual, effectiveCategoryIds } from "@/lib/scheduleVsActual";

const SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type CatBreakdownEntry = { name: string; value: number; color: string; type: "productive" | "unproductive" | "essential" };

/**
 * All derived dashboard statistics for a given week.
 * `includedIds`/`excludedIds` apply three-state filter semantics to both logs
 * and schedule blocks (see effectiveCategoryIds). The AI plan card is exempt:
 * `planVsActual` keeps the original include-only log filtering and unfiltered
 * plan slots (they don't carry a category_id).
 */
export function useDashboardStats(weekStart: string, includedIds: string[] = [], excludedIds: string[] = []) {
  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const weekEnd = useMemo(() => addDaysISO(weekStart, 6), [weekStart]);

  const { data: logs } = useTimeLogsInRange(weekStart, weekEnd);
  const { data: cats } = useCategories();
  const { data: blocks } = useScheduleBlocks();
  const { slots: planSlots } = useWeeklyPlan(weekStart);

  const catMap = useMemo(() => Object.fromEntries(cats.map((c) => [c.id, c])), [cats]);

  const effectiveIds = useMemo(
    () => new Set(effectiveCategoryIds(cats.map((c) => c.id), includedIds, excludedIds)),
    [cats, includedIds, excludedIds]
  );

  const filteredLogs = useMemo(
    () =>
      logs.filter((l) =>
        l.category_id === null ? includedIds.length === 0 : effectiveIds.has(l.category_id)
      ),
    [logs, includedIds.length, effectiveIds]
  );

  const filteredBlocks = useMemo(
    () => blocks.filter((b) => b.category_id !== null && effectiveIds.has(b.category_id)),
    [blocks, effectiveIds]
  );

  const scheduleVsActual = useMemo(
    () => buildScheduleVsActual(weekStart, filteredBlocks, filteredLogs),
    [weekStart, filteredBlocks, filteredLogs]
  );

  // AI plan card keeps its pre-three-state behavior: include-only, no exclusions.
  const aiFilteredLogs = useMemo(
    () => includedIds.length === 0
      ? logs
      : logs.filter((l) => l.category_id !== null && includedIds.includes(l.category_id)),
    [logs, includedIds]
  );

  const perDay = useMemo(() => {
    return days.map((iso, i) => {
      const dayLogs = filteredLogs.filter((l) => l.date === iso);
      let prod = 0, unprod = 0;
      for (const log of dayLogs) {
        const m = durMin(log.start_time, log.end_time);
        if (log.type === "productive") prod += m;
        else if (log.type === "unproductive") unprod += m;
        // essential logs are excluded from prod/unprod bars
      }
      return { day: SHORT[i], iso, productive: Math.round(prod), unproductive: Math.round(unprod), total: Math.round(prod + unprod) };
    });
  }, [days, filteredLogs]);

  const totals = useMemo(() => {
    const prod = perDay.reduce((s, d) => s + d.productive, 0);
    const unprod = perDay.reduce((s, d) => s + d.unproductive, 0);
    const total = prod + unprod;
    return { prod, unprod, total, ratio: total ? Math.round((prod / total) * 100) : 0 };
    // ratio = productive / (productive + unproductive), essential is intentionally excluded
  }, [perDay]);

  const daysLogged = useMemo(() => new Set(filteredLogs.map((l) => l.date)).size, [filteredLogs]);

  const catBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of filteredLogs) {
      if (!log.category_id) continue;
      map.set(log.category_id, (map.get(log.category_id) ?? 0) + durMin(log.start_time, log.end_time));
    }
    return [...map.entries()]
      .map(([id, mins]) => {
        const c = catMap[id];
        return c ? { name: c.name, value: mins, color: c.color, type: c.type } : null;
      })
      .filter((x): x is CatBreakdownEntry => x !== null)
      .sort((a, b) => b.value - a.value);
  }, [filteredLogs, catMap]);

  const planVsActual = useMemo(() => {
    const planned = new Map<string, number>();
    for (const s of planSlots) {
      planned.set(s.activity_name, (planned.get(s.activity_name) ?? 0) + durMin(s.start, s.end));
    }
    const actualByCatName = new Map<string, number>();
    for (const log of aiFilteredLogs) {
      const c = log.category_id ? catMap[log.category_id] : null;
      if (!c) continue;
      actualByCatName.set(c.name, (actualByCatName.get(c.name) ?? 0) + durMin(log.start_time, log.end_time));
    }
    const names = new Set([...planned.keys(), ...actualByCatName.keys()]);
    return [...names].map((name) => ({
      name,
      planned: Math.round(planned.get(name) ?? 0),
      actual: Math.round(actualByCatName.get(name) ?? 0),
    })).sort((a, b) => (b.planned + b.actual) - (a.planned + a.actual)).slice(0, 8);
  }, [planSlots, aiFilteredLogs, catMap]);

  return { perDay, totals, daysLogged, catBreakdown, planVsActual, planSlotsCount: planSlots.length, scheduleVsActual };
}
