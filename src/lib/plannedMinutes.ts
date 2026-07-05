import { blocksOnDay } from "@/lib/gaps";
import { isoToWeekday } from "@/lib/time";

export type PlannedBlock = {
  start_time: string;
  end_time: string;
  days_of_week: number[];
  category_id: string | null;
};

export type PlannedDayRow = { date: string; [categoryId: string]: number | string };

/** Per-day, per-category scheduled minutes for the given days, from recurring blocks. */
export function plannedMinutesByDay(blocks: PlannedBlock[], days: string[]): PlannedDayRow[] {
  const blocksByCategory = new Map<string, PlannedBlock[]>();
  for (const b of blocks) {
    if (!b.category_id) continue;
    blocksByCategory.set(b.category_id, [...(blocksByCategory.get(b.category_id) ?? []), b]);
  }

  return days.map((date) => {
    const weekday = isoToWeekday(date);
    const row: PlannedDayRow = { date };
    for (const [categoryId, categoryBlocks] of blocksByCategory) {
      const windows = blocksOnDay(categoryBlocks, weekday);
      row[categoryId] = windows.reduce((sum, w) => sum + (w.end - w.start), 0);
    }
    return row;
  });
}
