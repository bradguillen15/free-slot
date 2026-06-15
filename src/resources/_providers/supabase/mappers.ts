import type { LocalActivity, LocalCategory, LocalProfile, LocalScheduleBlock, LocalTimeLog } from "@/lib/localStore";
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

export function mapTimeLog(r: Record<string, unknown>): LocalTimeLog {
  return r as LocalTimeLog;
}

export function mapProfile(r: Record<string, unknown>): LocalProfile {
  return r as LocalProfile;
}

export function mapWeeklyPlan(r: Record<string, unknown>): WeeklyPlan {
  return r as unknown as WeeklyPlan;
}

export function sortScheduleBlocks(blocks: LocalScheduleBlock[]): LocalScheduleBlock[] {
  return [...blocks].sort((a, b) => {
    const ao = (a as unknown as { sort_order?: number }).sort_order ?? 0;
    const bo = (b as unknown as { sort_order?: number }).sort_order ?? 0;
    if (ao !== bo) return ao - bo;
    return a.created_at.localeCompare(b.created_at);
  });
}
