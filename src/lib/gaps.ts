// Pure-logic gap detection: compute free time windows from schedule blocks + logs.
// All times in minutes since 00:00.

import { MIN_PER_DAY, expandRange, toMin } from "./time";

export type DayBlockInput = {
  start_time: string;
  end_time: string;
  days_of_week: number[];
};

export type DayLogInput = {
  start_time: string;
  end_time: string;
};

export type Interval = { start: number; end: number };

export type GapWindow = Interval & {
  durationMin: number;
  isPeak: boolean;
};

const DAY_START = 0;
const DAY_END = MIN_PER_DAY;

function mergeIntervals(items: Interval[]): Interval[] {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) => a.start - b.start);
  const out: Interval[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    const cur = sorted[i];
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      out.push({ ...cur });
    }
  }
  return out;
}

/**
 * Intervals occupied by recurring blocks on a given weekday (0=Sun).
 * An overnight block (end < start) occupies [start, 24:00] on its listed day
 * and [00:00, end] on the FOLLOWING day — so pass the full block list, not a
 * list pre-filtered by weekday.
 */
export function blocksOnDay(
  blocks: DayBlockInput[],
  weekday: number
): Interval[] {
  const segs: Interval[] = [];
  const prevWeekday = (weekday + 6) % 7;
  for (const b of blocks) {
    const s = toMin(b.start_time);
    const e = toMin(b.end_time);
    if (s === e) continue; // zero-length block occupies nothing
    const wraps = e < s;
    if (b.days_of_week?.includes(weekday)) {
      segs.push(wraps ? { start: s, end: MIN_PER_DAY } : { start: s, end: e });
    }
    if (wraps && b.days_of_week?.includes(prevWeekday)) {
      segs.push({ start: 0, end: e });
    }
  }
  return segs;
}

export function logsToIntervals(logs: DayLogInput[]): Interval[] {
  const segs: Interval[] = [];
  for (const l of logs) {
    for (const [a, b] of expandRange(toMin(l.start_time), toMin(l.end_time))) {
      segs.push({ start: a, end: b });
    }
  }
  return segs;
}

/**
 * Find free windows for a single day given recurring blocks (already filtered or full set
 * with weekday), logs for that day, and optional peak-hour window.
 */
export function findFreeWindows({
  blocks,
  logs,
  weekday,
  minWindowMinutes = 30,
  peakStart,
  peakEnd,
  dayStart = DAY_START,
  dayEnd = DAY_END,
}: {
  blocks: DayBlockInput[];
  logs: DayLogInput[];
  weekday: number;
  minWindowMinutes?: number;
  peakStart?: string;
  peakEnd?: string;
  dayStart?: number;
  dayEnd?: number;
}): GapWindow[] {
  const occupied = mergeIntervals([
    ...blocksOnDay(blocks, weekday),
    ...logsToIntervals(logs),
  ]);

  // Compute complement within [dayStart, dayEnd]
  const free: Interval[] = [];
  let cursor = dayStart;
  for (const o of occupied) {
    if (o.end <= dayStart || o.start >= dayEnd) continue;
    const oStart = Math.max(o.start, dayStart);
    const oEnd = Math.min(o.end, dayEnd);
    if (oStart > cursor) free.push({ start: cursor, end: oStart });
    cursor = Math.max(cursor, oEnd);
  }
  if (cursor < dayEnd) free.push({ start: cursor, end: dayEnd });

  const peakA = peakStart ? toMin(peakStart) : null;
  const peakB = peakEnd ? toMin(peakEnd) : null;

  return free
    .filter((w) => w.end - w.start >= minWindowMinutes)
    .map((w) => {
      const isPeak =
        peakA !== null && peakB !== null
          ? w.start < peakB && w.end > peakA
          : false;
      return { ...w, durationMin: w.end - w.start, isPeak };
    });
}

export function totalFreeMinutes(windows: GapWindow[]): number {
  return windows.reduce((sum, w) => sum + w.durationMin, 0);
}
