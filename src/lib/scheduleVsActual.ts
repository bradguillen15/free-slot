// Pure Level-B math for the dashboard's Schedule vs Actual card: per-label
// scheduled/logged totals, overlap-based adherence, and displacement (what was
// logged inside a label's scheduled windows). Minute-attribution sweeps trade
// micro-performance for clarity — a week is at most 7 × 1440 steps per label.
import { blocksOnDay, logsToIntervals, type Interval } from "@/lib/gaps";
import { durationMinutes, isoToWeekday, toMin } from "@/lib/time";
import { weekDays } from "@/lib/week";

export type SvaBlock = {
  start_time: string;
  end_time: string;
  days_of_week: number[];
  category_id: string | null;
};

export type SvaLog = {
  date: string;
  start_time: string;
  end_time: string;
  category_id: string | null;
};

export type DisplacementEntry = { categoryId: string; min: number };

export type ScheduleVsActualRow = {
  categoryId: string;
  scheduledMin: number;
  loggedMin: number;
  /** Minutes of the label's own logs inside its scheduled windows (== displacement.keptMin). */
  adherenceMin: number;
  displacement: {
    keptMin: number;
    byCategory: DisplacementEntry[];
    unloggedMin: number;
  };
};

export type ScheduleVsActualResult = {
  rows: ScheduleVsActualRow[];
  totals: {
    scheduledMin: number;
    loggedMin: number;
    adherenceMin: number;
    /** Rounded percentage, or null when nothing is scheduled. */
    adherencePct: number | null;
  };
};

/**
 * Include/exclude filter semantics shared by the dashboard: with no inclusions,
 * everything except the excluded set; otherwise the included set minus exclusions.
 */
export function effectiveCategoryIds(
  allIds: string[],
  includedIds: string[],
  excludedIds: string[]
): string[] {
  const excluded = new Set(excludedIds);
  const base = includedIds.length > 0 ? includedIds : allIds;
  return base.filter((id) => !excluded.has(id));
}

const MIN_PER_DAY = 1440;
const UNLOGGED = "";

type MutableRow = {
  scheduledMin: number;
  loggedMin: number;
  keptMin: number;
  displacedBy: Map<string, number>;
  unloggedMin: number;
};

function getRow(rows: Map<string, MutableRow>, categoryId: string): MutableRow {
  let row = rows.get(categoryId);
  if (!row) {
    row = { scheduledMin: 0, loggedMin: 0, keptMin: 0, displacedBy: new Map(), unloggedMin: 0 };
    rows.set(categoryId, row);
  }
  return row;
}

/**
 * Per-day minute ownership. Each minute belongs to the earliest-starting log
 * covering it; a label's own coverage (`coverage`) overrides ownership inside
 * that label's windows so "kept" wins over an earlier foreign log.
 */
function sweepDay(dayLogs: SvaLog[]): { owner: string[]; coverage: Map<string, Uint8Array> } {
  const owner = new Array<string>(MIN_PER_DAY).fill(UNLOGGED);
  const coverage = new Map<string, Uint8Array>();
  const sorted = [...dayLogs].sort((a, b) => toMin(a.start_time) - toMin(b.start_time));
  for (const log of sorted) {
    if (!log.category_id) continue;
    let cov = coverage.get(log.category_id);
    if (!cov) {
      cov = new Uint8Array(MIN_PER_DAY);
      coverage.set(log.category_id, cov);
    }
    for (const interval of logsToIntervals([log])) {
      for (let m = interval.start; m < interval.end; m++) {
        cov[m] = 1;
        if (owner[m] === UNLOGGED) owner[m] = log.category_id;
      }
    }
  }
  return { owner, coverage };
}

export function buildScheduleVsActual(
  weekStart: string,
  blocks: SvaBlock[],
  logs: SvaLog[]
): ScheduleVsActualResult {
  const dates = weekDays(weekStart);
  const dateSet = new Set(dates);
  const rows = new Map<string, MutableRow>();

  const blocksByCategory = new Map<string, SvaBlock[]>();
  for (const b of blocks) {
    if (!b.category_id) continue;
    blocksByCategory.set(b.category_id, [...(blocksByCategory.get(b.category_id) ?? []), b]);
  }

  const logsByDate = new Map<string, SvaLog[]>();
  for (const l of logs) {
    if (!l.category_id || !dateSet.has(l.date)) continue;
    logsByDate.set(l.date, [...(logsByDate.get(l.date) ?? []), l]);
    getRow(rows, l.category_id).loggedMin += durationMinutes(l.start_time, l.end_time);
  }

  for (const date of dates) {
    const weekday = isoToWeekday(date);
    const dayLogs = logsByDate.get(date) ?? [];
    const { owner, coverage } = sweepDay(dayLogs);

    for (const [categoryId, categoryBlocks] of blocksByCategory) {
      const windows: Interval[] = blocksOnDay(categoryBlocks, weekday);
      if (windows.length === 0) continue;
      const row = getRow(rows, categoryId);
      const own = coverage.get(categoryId);

      for (const w of windows) {
        row.scheduledMin += w.end - w.start;
        for (let m = w.start; m < w.end; m++) {
          if (own?.[m]) {
            row.keptMin += 1;
          } else if (owner[m] !== UNLOGGED) {
            row.displacedBy.set(owner[m], (row.displacedBy.get(owner[m]) ?? 0) + 1);
          } else {
            row.unloggedMin += 1;
          }
        }
      }
    }
  }

  const resultRows: ScheduleVsActualRow[] = [...rows.entries()]
    .map(([categoryId, r]) => ({
      categoryId,
      scheduledMin: r.scheduledMin,
      loggedMin: r.loggedMin,
      adherenceMin: r.keptMin,
      displacement: {
        keptMin: r.keptMin,
        byCategory: [...r.displacedBy.entries()]
          .map(([id, min]) => ({ categoryId: id, min }))
          .sort((a, b) => b.min - a.min),
        unloggedMin: r.unloggedMin,
      },
    }))
    .sort((a, b) => b.scheduledMin + b.loggedMin - (a.scheduledMin + a.loggedMin));

  const scheduledMin = resultRows.reduce((s, r) => s + r.scheduledMin, 0);
  const loggedMin = resultRows.reduce((s, r) => s + r.loggedMin, 0);
  const adherenceMin = resultRows.reduce((s, r) => s + r.adherenceMin, 0);

  return {
    rows: resultRows,
    totals: {
      scheduledMin,
      loggedMin,
      adherenceMin,
      adherencePct: scheduledMin > 0 ? Math.round((adherenceMin / scheduledMin) * 100) : null,
    },
  };
}
