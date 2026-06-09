// Pure-logic gap detection: compute free time windows from schedule blocks + logs.
// All times in minutes since 00:00. Buffer minutes are subtracted from gap edges.

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

const DAY_START = 6 * 60;   // exclude pre-6am from "free time"
const DAY_END = 23 * 60;    // and past 11pm

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

/** Intervals occupied by recurring blocks on a given weekday (0=Sun). */
export function blocksOnDay(
  blocks: DayBlockInput[],
  weekday: number
): Interval[] {
  const segs: Interval[] = [];
  for (const b of blocks) {
    if (!b.days_of_week?.includes(weekday)) continue;
    for (const [a, c] of expandRange(toMin(b.start_time), toMin(b.end_time))) {
      segs.push({ start: a, end: c });
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
 * with weekday), logs for that day, buffer minutes, and optional peak-hour window.
 */
export function findFreeWindows({
  blocks,
  logs,
  weekday,
  bufferMinutes = 15,
  minWindowMinutes = 30,
  peakStart,
  peakEnd,
  dayStart = DAY_START,
  dayEnd = DAY_END,
}: {
  blocks: DayBlockInput[];
  logs: DayLogInput[];
  weekday: number;
  bufferMinutes?: number;
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
    .map((w) => {
      const start = Math.min(w.end, w.start + bufferMinutes);
      const end = Math.max(0, w.end - bufferMinutes);
      return { start, end };
    })
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
