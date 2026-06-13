// Pure segment math for the day timeline (minutes since 00:00, overnight-aware).
import { expandRange, subtractIntervals, toMin } from "@/lib/time";

export type Segment = { startMin: number; endMin: number };

export function segmentsForDay(start: string, end: string): Segment[] {
  const s = toMin(start);
  const e = toMin(end);
  return expandRange(s, e).map(([a, b]) => ({ startMin: a, endMin: b }));
}

/**
 * Visible segments of a planned block after logged time takes precedence: the block is
 * clipped to only the minutes not covered by any log on that day (overnight-aware). The
 * schedule reads as a shrinking guide of time still unaccounted for.
 */
export function visibleBlockSegments(
  block: { start_time: string; end_time: string },
  logs: Array<{ start_time: string; end_time: string }>,
): Segment[] {
  const base = segmentsForDay(block.start_time, block.end_time).map(
    (s) => [s.startMin, s.endMin] as [number, number]
  );
  const cuts = logs
    .flatMap((l) => segmentsForDay(l.start_time, l.end_time))
    .map((s) => [s.startMin, s.endMin] as [number, number]);
  return subtractIntervals(base, cuts).map(([startMin, endMin]) => ({ startMin, endMin }));
}
