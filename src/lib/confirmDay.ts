// Pure logic for "confirm my day" — materializes schedule blocks into ordinary
// time_logs rows. See openspec/changes/archive/*-confirm-your-day-logging/design.md
// for why overlap = whole-block skip (no partial fill) and why there is no
// separate "confirmed" marker: idempotency falls out of the overlap check.
import { isoToWeekday, durationMinutes } from "@/lib/time";
import { visibleBlockSegments } from "@/lib/daySegments";

export type ConfirmDayBlock = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  category_id: string | null;
};

export type ConfirmDayLog = {
  date: string;
  start_time: string;
  end_time: string;
};

export type ConfirmDayCategory = {
  id: string;
  type: "productive" | "unproductive" | "essential";
};

export type ConfirmDayRow = {
  date: string;
  start_time: string;
  end_time: string;
  category_id: string;
  type: "productive" | "unproductive" | "essential";
  title: string;
};

export type ConfirmDaySkip = {
  blockId: string;
  reason: "no-category" | "overlaps-existing";
};

export type ConfirmDayResult = {
  rows: ConfirmDayRow[];
  skipped: ConfirmDaySkip[];
};

export function buildConfirmDayRows(
  date: string,
  blocks: ConfirmDayBlock[],
  existingLogs: ConfirmDayLog[],
  categories: ConfirmDayCategory[]
): ConfirmDayResult {
  const weekday = isoToWeekday(date);
  const active = blocks.filter((b) => b.days_of_week.includes(weekday));
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const rows: ConfirmDayRow[] = [];
  const skipped: ConfirmDaySkip[] = [];

  for (const block of active) {
    if (!block.category_id) {
      skipped.push({ blockId: block.id, reason: "no-category" });
      continue;
    }

    const totalDuration = durationMinutes(block.start_time, block.end_time);
    const visible = visibleBlockSegments(block, existingLogs, date);
    const visibleDuration = visible.reduce((sum, s) => sum + (s.endMin - s.startMin), 0);
    if (visibleDuration < totalDuration) {
      skipped.push({ blockId: block.id, reason: "overlaps-existing" });
      continue;
    }

    const category = categoryById.get(block.category_id);
    if (!category) {
      skipped.push({ blockId: block.id, reason: "no-category" });
      continue;
    }

    rows.push({
      date,
      start_time: block.start_time,
      end_time: block.end_time,
      category_id: block.category_id,
      type: category.type,
      title: block.name,
    });
  }

  return { rows, skipped };
}
