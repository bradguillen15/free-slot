import { useMemo } from "react";
import { expandRange, isoToWeekday, toMin, todayISO } from "@/lib/time";
import { findFreeWindows, totalFreeMinutes } from "@/lib/gaps";
import type { LocalCategory, LocalProfile, LocalScheduleBlock, LocalTimeLog } from "@/lib/localStore";
import { useScheduleBlocks, useTimeLogsInRange, useVisibleCategories, useProfile } from "@/lib/dataStore";

// ---- Types (canonical home; re-exported from WeekGrid for back-compat) ----

type Seg = { startMin: number; endMin: number };

export type AISlotSeg = { seg: Seg; name: string; rationale?: string };
export type DayCellBlock = { id?: string; seg: Seg; name: string; color: string };
export type DayCellLog = {
  id?: string;
  seg: Seg;
  name: string;
  color: string;
  category_id?: string | null;
  type: "productive" | "unproductive";
};

export type DayCellData = {
  iso: string;
  weekday: number;
  label: string;
  short: string;
  isToday: boolean;
  blocks: DayCellBlock[];
  logs: DayCellLog[];
  gaps: ReturnType<typeof findFreeWindows>;
  aiSlots?: AISlotSeg[];
  totalFree: number;
};

// ---- Builder input ----

export type BuildDayCellsInput = {
  /** ISO date strings to build cells for — week = 7, month = 28–42. */
  days: string[];
  blocks: LocalScheduleBlock[];
  logs: LocalTimeLog[];
  categories: LocalCategory[];
  profile: LocalProfile | null;
  today: string;
  aiPlan?: { slots: Array<{ day: string; start: string; end: string; activity_id: string; activity_name: string; rationale?: string }> } | null;
};

const SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FULL  = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// ---- Hook (thin React wrapper over the builder) ----

export function useCalendarDays(
  startISO: string,
  endISO: string,
  aiPlan?: BuildDayCellsInput["aiPlan"],
): DayCellData[] {
  const { data: blocksRaw } = useScheduleBlocks();
  const { data: logsRaw }   = useTimeLogsInRange(startISO, endISO);
  const { all: catsRaw }    = useVisibleCategories();
  const { data: profileRaw } = useProfile();

  const blocks     = blocksRaw as unknown as LocalScheduleBlock[];
  const logs       = logsRaw   as unknown as LocalTimeLog[];
  const categories = catsRaw   as unknown as LocalCategory[];
  const profile    = profileRaw as LocalProfile | null;

  return useMemo(() => {
    const days: string[] = [];
    const current = new Date(startISO + "T00:00:00");
    const end     = new Date(endISO   + "T00:00:00");
    while (current <= end) {
      days.push(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
    }
    return buildDayCells({ days, blocks, logs, categories, profile, today: todayISO(), aiPlan });
  }, [startISO, endISO, blocks, logs, categories, profile, aiPlan]);
}

// ---- Pure builder — lifted verbatim from WeekPage.dayCells memo ----

export function buildDayCells({
  days,
  blocks,
  logs,
  categories,
  profile,
  today,
  aiPlan,
}: BuildDayCellsInput): DayCellData[] {
  const peak = profile?.peak_hours ?? null;

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  return days.map((iso) => {
    const weekday = isoToWeekday(iso);
    const dayBlocks = blocks.filter((b) => b.days_of_week?.includes(weekday));
    const dayLogs   = logs.filter((l) => l.date === iso);

    const gaps = findFreeWindows({
      blocks,
      logs: dayLogs,
      weekday,
      minWindowMinutes: 30,
      peakStart: peak?.start,
      peakEnd: peak?.end,
    });

    const blockSegs: DayCellBlock[] = dayBlocks.flatMap((b) =>
      expandRange(toMin(b.start_time), toMin(b.end_time)).map(([a, c]) => ({
        id: b.id,
        seg: { startMin: a, endMin: c },
        name: b.name,
        color: b.color,
      }))
    );

    const logSegs: DayCellLog[] = dayLogs.flatMap((l) => {
      const cat   = l.category_id ? catMap[l.category_id] : undefined;
      const color = cat?.color ?? (l.type === "productive" ? "hsl(var(--productive))" : "hsl(var(--unproductive))");
      return expandRange(toMin(l.start_time), toMin(l.end_time)).map(([a, c]) => ({
        id: l.id,
        seg: { startMin: a, endMin: c },
        name: l.title || (cat?.name ?? l.type),
        color,
        category_id: l.category_id,
        type: l.type,
      }));
    });

    const aiSlots = (aiPlan?.slots ?? [])
      .filter((s) => s.day === iso)
      .map((s) => ({
        seg: { startMin: toMin(s.start), endMin: toMin(s.end) },
        name: s.activity_name,
        rationale: s.rationale,
      }));

    return {
      iso,
      weekday,
      label: FULL[(weekday + 6) % 7],
      short: SHORT[(weekday + 6) % 7],
      isToday: iso === today,
      blocks: blockSegs,
      logs: logSegs,
      gaps,
      aiSlots,
      totalFree: totalFreeMinutes(gaps),
    };
  });
}
