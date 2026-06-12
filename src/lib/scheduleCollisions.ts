import { MIN_PER_DAY, toMin } from "./time";

export type ScheduleBlockInput = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
};

export type ScheduleCollision = {
  weekday: number;
  blockA: { id: string; name: string };
  blockB: { id: string; name: string };
};

export type ScheduleCollisionGroup = {
  blockA: { id: string; name: string };
  blockB: { id: string; name: string };
  weekdays: number[];
};

type DaySegment = { id: string; name: string; start: number; end: number };

/** Intervals a block contributes on a weekday (mirrors blocksOnDay, with block identity). */
function blockSegmentsOnDay(block: ScheduleBlockInput, weekday: number): DaySegment[] {
  const s = toMin(block.start_time);
  const e = toMin(block.end_time);
  if (s === e) return [];

  const prevWeekday = (weekday + 6) % 7;
  const wraps = e < s;
  const out: DaySegment[] = [];
  const push = (start: number, end: number) => out.push({ id: block.id, name: block.name, start, end });

  if (block.days_of_week?.includes(weekday)) {
    push(s, wraps ? MIN_PER_DAY : e);
  }
  if (wraps && block.days_of_week?.includes(prevWeekday)) {
    push(0, e);
  }
  return out;
}

function intervalsOverlap(a: DaySegment, b: DaySegment): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Find every pair of blocks that overlap on the same weekday. */
export function findScheduleCollisions(blocks: ScheduleBlockInput[]): ScheduleCollision[] {
  const collisions: ScheduleCollision[] = [];
  const seen = new Set<string>();

  for (let weekday = 0; weekday < 7; weekday++) {
    const segs = blocks.flatMap((b) => blockSegmentsOnDay(b, weekday));
    for (let i = 0; i < segs.length; i++) {
      for (let j = i + 1; j < segs.length; j++) {
        const a = segs[i];
        const b = segs[j];
        if (a.id === b.id || !intervalsOverlap(a, b)) continue;
        const [blockA, blockB] = a.id < b.id ? [a, b] : [b, a];
        const key = `${weekday}|${blockA.id}|${blockB.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        collisions.push({
          weekday,
          blockA: { id: blockA.id, name: blockA.name },
          blockB: { id: blockB.id, name: blockB.name },
        });
      }
    }
  }

  return collisions;
}

/** Merge per-day collisions into one row per block pair. */
export function groupScheduleCollisions(collisions: ScheduleCollision[]): ScheduleCollisionGroup[] {
  const map = new Map<string, ScheduleCollisionGroup>();

  for (const c of collisions) {
    const [a, b] = c.blockA.id < c.blockB.id ? [c.blockA, c.blockB] : [c.blockB, c.blockA];
    const key = `${a.id}|${b.id}`;
    const existing = map.get(key);
    if (existing) {
      if (!existing.weekdays.includes(c.weekday)) existing.weekdays.push(c.weekday);
    } else {
      map.set(key, { blockA: a, blockB: b, weekdays: [c.weekday] });
    }
  }

  return [...map.values()].map((g) => ({
    ...g,
    weekdays: [...g.weekdays].sort((x, y) => x - y),
  }));
}
