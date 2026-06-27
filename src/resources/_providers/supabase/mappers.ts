import type { LocalActivity, LocalCategory, LocalDailyNote, LocalInboxItem, LocalProfile, LocalScheduleBlock, LocalTimeLog } from "@/lib/localStore";
import type { WeeklyPlan } from "@/resources/types/weeklyPlan";

export function mapCategory(r: Record<string, unknown>): LocalCategory {
  return { ...(r as LocalCategory), hidden: (r.hidden as boolean | undefined) ?? false };
}

export function mapActivity(r: Record<string, unknown>): LocalActivity {
  return r as LocalActivity;
}

export function mapScheduleBlock(r: Record<string, unknown>): LocalScheduleBlock {
  return r as LocalScheduleBlock;
}

function stripSeconds(t: unknown): string {
  const s = String(t ?? "");
  // Postgres TIME columns return "HH:MM:SS[.ffffff]" — keep only "HH:MM".
  return s.length > 5 ? s.slice(0, 5) : s;
}

export function mapTimeLog(r: Record<string, unknown>): LocalTimeLog {
  return {
    ...(r as LocalTimeLog),
    start_time: stripSeconds(r.start_time),
    end_time: stripSeconds(r.end_time),
  };
}

export function mapProfile(r: Record<string, unknown>): LocalProfile {
  const time_format = r.time_format === "12h" ? "12h" : "24h";
  return { ...(r as LocalProfile), time_format };
}

export function mapWeeklyPlan(r: Record<string, unknown>): WeeklyPlan {
  return r as unknown as WeeklyPlan;
}

export function mapDailyNote(r: Record<string, unknown>): LocalDailyNote {
  return {
    user_id: r.user_id as string,
    date: r.date as string,
    content: (r.content ?? {}) as object,
    updated_at: r.updated_at as string,
  };
}

export function mapInboxItem(r: Record<string, unknown>): LocalInboxItem {
  return {
    id: r.id as string,
    user_id: r.user_id as string,
    content: r.content as string,
    created_at: r.created_at as string,
    archived_at: (r.archived_at as string | null) ?? null,
  };
}

export function sortScheduleBlocks(blocks: LocalScheduleBlock[]): LocalScheduleBlock[] {
  return [...blocks].sort((a, b) => {
    const ao = (a as unknown as { sort_order?: number }).sort_order ?? 0;
    const bo = (b as unknown as { sort_order?: number }).sort_order ?? 0;
    if (ao !== bo) return ao - bo;
    return a.created_at.localeCompare(b.created_at);
  });
}

export function sortCategories(cats: LocalCategory[]): LocalCategory[] {
  return [...cats].sort((a, b) => {
    const ao = (a as unknown as { sort_order?: number }).sort_order ?? 0;
    const bo = (b as unknown as { sort_order?: number }).sort_order ?? 0;
    if (ao !== bo) return ao - bo;
    return a.created_at.localeCompare(b.created_at);
  });
}
