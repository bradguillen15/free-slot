import type { LocalCategory, LocalTimeLog } from "@/lib/localStore";
import type { WeeklyPlan } from "@/resources/types/weeklyPlan";
import type { WeeklyReview } from "@/resources/types/weeklyReview";

type ActivityEntry = { name: string; minutes: number };
type MergedEntry = { name: string; planned: number; actual: number };

export type WeeklyReviewAggregate = {
  planned: ActivityEntry[];
  actual: ActivityEntry[];
  ratio: number;
  total: number;
  insights: string | null;
  existing: boolean;
  merged: MergedEntry[];
};

type AggregateInput = {
  logs: LocalTimeLog[];
  categories: LocalCategory[];
  plan: WeeklyPlan | null;
  saved: WeeklyReview | null;
};

function toMin(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function aggregateWeeklyReview({ logs, categories, plan, saved }: AggregateInput): WeeklyReviewAggregate {
  const plannedMap = new Map<string, number>();
  if (plan) {
    for (const slot of plan.slots) {
      const duration = toMin(slot.end) - toMin(slot.start);
      plannedMap.set(slot.activity_name, (plannedMap.get(slot.activity_name) ?? 0) + duration);
    }
  }
  const planned = [...plannedMap.entries()].map(([name, minutes]) => ({ name, minutes }));

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const actualMap = new Map<string, number>();
  let productiveMinutes = 0;
  let totalMinutes = 0;

  for (const log of logs) {
    const duration = toMin(log.end_time) - toMin(log.start_time);
    totalMinutes += duration;
    if (log.type === "productive") productiveMinutes += duration;
    const name = catMap.get(log.category_id ?? "")?.name ?? "Unknown";
    actualMap.set(name, (actualMap.get(name) ?? 0) + duration);
  }
  const actual = [...actualMap.entries()].map(([name, minutes]) => ({ name, minutes }));
  const ratio = totalMinutes > 0 ? Math.round((productiveMinutes / totalMinutes) * 100) : 0;

  const names = new Set([...plannedMap.keys(), ...actualMap.keys()]);
  const merged: MergedEntry[] = [...names]
    .map((name) => ({ name, planned: plannedMap.get(name) ?? 0, actual: actualMap.get(name) ?? 0 }))
    .sort((a, b) => b.planned + b.actual - (a.planned + a.actual));

  return {
    planned,
    actual,
    ratio,
    total: totalMinutes,
    insights: saved?.insights ?? null,
    existing: saved !== null,
    merged,
  };
}
