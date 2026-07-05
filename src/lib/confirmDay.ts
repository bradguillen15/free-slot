// Pure logic for "confirm my day" — materializes schedule blocks into ordinary
// time_logs rows. See openspec/changes/archive/*-confirm-your-day-logging/design.md
// for why overlap = whole-block skip (no partial fill) and why there is no
// separate "confirmed" marker: idempotency falls out of the overlap check.
import { addDaysISO, isoToWeekday, durationMinutes } from "@/lib/time";
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
  reason: "no-category" | "overlaps-existing" | "not-elapsed";
};

export type ConfirmDayResult = {
  rows: ConfirmDayRow[];
  skipped: ConfirmDaySkip[];
};

/** A block is elapsed once its end has passed; overnight blocks end on the next day, so they never count as elapsed on their start day. */
function hasBlockElapsed(block: Pick<ConfirmDayBlock, "start_time" | "end_time">, now: string): boolean {
  // DB times can be HH:mm:ss — normalize to HH:mm before comparing.
  const start = block.start_time.slice(0, 5);
  const end = block.end_time.slice(0, 5);
  const isOvernight = end < start;
  if (isOvernight) return false;
  return end <= now.slice(0, 5);
}

export type ConfirmDayBlockInstance = {
  block: ConfirmDayBlock;
  /** The calendar date this occurrence of the block belongs to — see module doc. */
  date: string;
};

/**
 * Every schedule-block occurrence relevant to confirming `date`:
 * - a **same-day** instance for any block whose `days_of_week` includes `date`'s weekday
 *   (this is the block's own scheduled start day, dated `date`).
 * - additionally, for **overnight** blocks (end time earlier than start time) whose
 *   `days_of_week` includes the *previous* day's weekday, a **tail** instance dated
 *   that previous day — the occurrence that started the night before and ends during
 *   `date`'s daytime. A block active every day of the week yields both instances,
 *   since they represent two distinct real-world occurrences (last night's and
 *   tonight's), not a duplicate.
 */
export function blockInstancesForDate(blocks: ConfirmDayBlock[], date: string): ConfirmDayBlockInstance[] {
  const weekday = isoToWeekday(date);
  const prevDate = addDaysISO(date, -1);
  const prevWeekday = isoToWeekday(prevDate);

  const instances: ConfirmDayBlockInstance[] = [];
  for (const block of blocks) {
    if (block.days_of_week.includes(weekday)) {
      instances.push({ block, date });
    }
    const isOvernight = block.end_time.slice(0, 5) < block.start_time.slice(0, 5);
    if (isOvernight && block.days_of_week.includes(prevWeekday)) {
      instances.push({ block, date: prevDate });
    }
  }
  return instances;
}

/**
 * `now` (HH:mm) makes the confirm elapsed-only — pass it when the confirmed date is
 * today so instances that haven't ended yet are skipped. Omit it for past dates.
 */
export function buildConfirmDayRows(
  date: string,
  blocks: ConfirmDayBlock[],
  existingLogs: ConfirmDayLog[],
  categories: ConfirmDayCategory[],
  now?: string
): ConfirmDayResult {
  const instances = blockInstancesForDate(blocks, date);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const rows: ConfirmDayRow[] = [];
  const skipped: ConfirmDaySkip[] = [];

  for (const { block, date: instanceDate } of instances) {
    const isTail = instanceDate !== date;
    const elapsed =
      now === undefined
        ? true
        : isTail
          ? block.end_time.slice(0, 5) <= now.slice(0, 5)
          : hasBlockElapsed(block, now);
    if (!elapsed) {
      skipped.push({ blockId: block.id, reason: "not-elapsed" });
      continue;
    }
    if (!block.category_id) {
      skipped.push({ blockId: block.id, reason: "no-category" });
      continue;
    }

    const totalDuration = durationMinutes(block.start_time, block.end_time);
    const visible = visibleBlockSegments(block, existingLogs, instanceDate);
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
      date: instanceDate,
      start_time: block.start_time,
      end_time: block.end_time,
      category_id: block.category_id,
      type: category.type,
      title: block.name,
    });
  }

  return { rows, skipped };
}
