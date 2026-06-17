// Pure segment math for the day timeline (minutes since 00:00, overnight-aware).
import { addDaysISO, expandRange, subtractIntervals, toMin } from "@/lib/time";

export type Segment = { startMin: number; endMin: number };

export function segmentsForDay(start: string, end: string): Segment[] {
  const s = toMin(start);
  const e = toMin(end);
  return expandRange(s, e).map(([a, b]) => ({ startMin: a, endMin: b }));
}

export function segmentsForLogOnDay(
  log: { date?: string; start_time: string; end_time: string },
  dayISO: string,
): Segment[] {
  if (!log.date) return segmentsForDay(log.start_time, log.end_time);

  const start = toMin(log.start_time);
  const end = toMin(log.end_time);

  if (end > start) {
    return log.date === dayISO ? [{ startMin: start, endMin: end }] : [];
  }

  if (end === start) return [];
  if (log.date === dayISO) return [{ startMin: start, endMin: 24 * 60 }];
  if (addDaysISO(log.date, 1) === dayISO) return [{ startMin: 0, endMin: end }];
  return [];
}

/**
 * Visible segments of a planned block after logged time takes precedence: the block is
 * clipped to only the minutes not covered by any log on that day (overnight-aware). The
 * schedule reads as a shrinking guide of time still unaccounted for.
 */
export function visibleBlockSegments(
  block: { start_time: string; end_time: string },
  logs: Array<{ start_time: string; end_time: string; date?: string }>,
  dayISO?: string,
): Segment[] {
  const base = segmentsForDay(block.start_time, block.end_time).map(
    (s) => [s.startMin, s.endMin] as [number, number]
  );
  const cuts = logs
    .flatMap((l) => dayISO ? segmentsForLogOnDay(l, dayISO) : segmentsForDay(l.start_time, l.end_time))
    .map((s) => [s.startMin, s.endMin] as [number, number]);
  return subtractIntervals(base, cuts).map(([startMin, endMin]) => ({ startMin, endMin }));
}
