// Pure segment math for the day timeline (minutes since 00:00, overnight-aware).
import { addDaysISO, expandRange, subtractIntervals, toMin } from "@/lib/time";

export type LaneEntry = { lane: number; groupWidth: number };

/**
 * Sweep-line lane assignment for overlapping time segments.
 *
 * Returns a Map keyed by each item's `id` with its assigned lane and the total
 * number of lanes in its collision group.  Non-overlapping items get
 * `{ lane: 0, groupWidth: 1 }`.
 *
 * Algorithm: sort by startMin; maintain active lanes (each lane tracks the
 * endMin of the last item placed in it).  When a new item's startMin is ≥ the
 * max endMin of all active lanes the current group is flushed and a new one
 * starts.  Within a group each item is placed in the lowest available lane.
 */
export function computeLaneLayout(
  items: { startMin: number; endMin: number; id: string }[],
): Map<string, LaneEntry> {
  const result = new Map<string, LaneEntry>();
  if (items.length === 0) return result;

  const sorted = [...items].sort(
    (a, b) => a.startMin - b.startMin || b.endMin - a.endMin,
  );

  // laneEnds[i] = endMin of the last item placed in lane i
  const laneEnds: number[] = [];
  const groupItems: Array<{ id: string; lane: number }> = [];
  let groupEndMin = -1;

  const flush = () => {
    const groupWidth = laneEnds.length;
    for (const { id, lane } of groupItems) {
      result.set(id, { lane, groupWidth });
    }
    laneEnds.length = 0;
    groupItems.length = 0;
    groupEndMin = -1;
  };

  for (const item of sorted) {
    if (groupItems.length > 0 && item.startMin >= groupEndMin) flush();

    let lane = laneEnds.findIndex((end) => end <= item.startMin);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = item.endMin;
    groupItems.push({ id: item.id, lane });
    groupEndMin = Math.max(groupEndMin, item.endMin);
  }

  flush();
  return result;
}

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
