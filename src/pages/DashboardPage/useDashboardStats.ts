import { useMemo } from "react";
import { useCategories, useTimeLogsInRange, useWeeklyPlan } from "@/lib/dataStore";
import { addDaysISO, durationMinutes as durMin } from "@/lib/time";
import { weekDays } from "@/lib/week";

const SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type CatBreakdownEntry = { name: string; value: number; color: string; type: "productive" | "unproductive" };

/**
 * All derived dashboard statistics for a given week: per-day productive/unproductive split,
 * totals + ratio, days logged, per-category breakdown, and planned-vs-actual (AI plan vs logs).
 * Pulls logs/categories/plan through the same dataStore hooks the page used inline before.
 */
export function useDashboardStats(weekStart: string) {
  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const weekEnd = useMemo(() => addDaysISO(weekStart, 6), [weekStart]);

  const { data: logs } = useTimeLogsInRange(weekStart, weekEnd);
  const { data: cats } = useCategories();
  const { slots: planSlots } = useWeeklyPlan(weekStart);

  const catMap = useMemo(() => Object.fromEntries(cats.map((c) => [c.id, c])), [cats]);

  const perDay = useMemo(() => {
    return days.map((iso, i) => {
      const dayLogs = logs.filter((l) => l.date === iso);
      let prod = 0, unprod = 0;
      for (const log of dayLogs) {
        const m = durMin(log.start_time, log.end_time);
        if (log.type === "productive") prod += m; else unprod += m;
      }
      return { day: SHORT[i], iso, productive: Math.round(prod), unproductive: Math.round(unprod) };
    });
  }, [days, logs]);

  const totals = useMemo(() => {
    const prod = perDay.reduce((s, d) => s + d.productive, 0);
    const unprod = perDay.reduce((s, d) => s + d.unproductive, 0);
    const total = prod + unprod;
    return { prod, unprod, total, ratio: total ? Math.round((prod / total) * 100) : 0 };
  }, [perDay]);

  const daysLogged = useMemo(() => new Set(logs.map((l) => l.date)).size, [logs]);

  const catBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of logs) {
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
  }, [logs, catMap]);

  const planVsActual = useMemo(() => {
    const planned = new Map<string, number>();
    for (const s of planSlots) {
      planned.set(s.activity_name, (planned.get(s.activity_name) ?? 0) + durMin(s.start, s.end));
    }
    const actualByCatName = new Map<string, number>();
    for (const log of logs) {
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
  }, [planSlots, logs, catMap]);

  return { perDay, totals, daysLogged, catBreakdown, planVsActual, planSlotsCount: planSlots.length };
}
