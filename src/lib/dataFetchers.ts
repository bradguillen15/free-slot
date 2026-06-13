import type { LocalActivity, LocalCategory, LocalProfile, LocalScheduleBlock, LocalTimeLog } from "@/lib/localStore";
import { ensureBootstrap, getProfile, listActivities, listCategories, listLogsInRange, listScheduleBlocks } from "@/lib/localStore";
import { supabase } from "@/integrations/supabase/client";
import type { Mode } from "./queryKeys";

export async function fetchCategories(mode: Mode, userId: string | null): Promise<LocalCategory[]> {
  if (mode === "guest") {
    ensureBootstrap();
    return listCategories();
  }
  const { data: rows, error } = await supabase
    .from("categories")
    .select("id,name,color,type,is_default,hidden,created_at")
    .eq("user_id", userId!)
    .order("name");
  if (error) throw new Error(error.message);
  return (rows ?? []).map((r) => ({
    ...(r as LocalCategory),
    hidden: (r as { hidden?: boolean }).hidden ?? false,
  }));
}

export async function fetchActivities(mode: Mode, userId: string | null): Promise<LocalActivity[]> {
  if (mode === "guest") {
    ensureBootstrap();
    return listActivities();
  }
  const { data: rows, error } = await supabase
    .from("activities")
    .select("id,name,category_id,target_hours_per_week,is_active,created_at")
    .eq("user_id", userId!)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (rows ?? []) as LocalActivity[];
}

export async function fetchScheduleBlocks(mode: Mode, userId: string | null): Promise<LocalScheduleBlock[]> {
  if (mode === "guest") {
    ensureBootstrap();
    return listScheduleBlocks();
  }
  const { data: rows, error } = await supabase
    .from("schedule_blocks")
    .select("*")
    .eq("user_id", userId!);
  if (error) throw new Error(error.message);
  const sorted = [...(rows ?? [])].sort((a, b) => {
    const ao = (a as { sort_order?: number }).sort_order ?? 0;
    const bo = (b as { sort_order?: number }).sort_order ?? 0;
    if (ao !== bo) return ao - bo;
    return a.created_at.localeCompare(b.created_at);
  });
  return sorted as LocalScheduleBlock[];
}

export async function fetchTimeLogsInRange(
  mode: Mode,
  userId: string | null,
  startISO: string,
  endISO: string,
): Promise<LocalTimeLog[]> {
  if (mode === "guest") {
    ensureBootstrap();
    return listLogsInRange(startISO, endISO);
  }
  const { data: rows, error } = await supabase
    .from("time_logs")
    .select("*")
    .eq("user_id", userId!)
    .gte("date", startISO)
    .lte("date", endISO)
    .order("date");
  if (error) throw new Error(error.message);
  return (rows ?? []) as LocalTimeLog[];
}

export async function fetchProfile(mode: Mode, userId: string | null): Promise<LocalProfile | null> {
  if (mode === "guest") {
    ensureBootstrap();
    return getProfile();
  }
  const { data: row, error } = await supabase
    .from("profiles")
    .select("peak_hours,include_weekends,weekly_review_day,onboarding_completed")
    .eq("id", userId!)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (row as LocalProfile | null) ?? null;
}

export type WeeklyPlanSlot = {
  day: string;
  start: string;
  end: string;
  activity_id: string;
  activity_name: string;
};

export type WeeklyPlanRow = {
  id: string;
  week_start: string;
  generated_at: string;
  slots: WeeklyPlanSlot[];
};

export async function fetchWeeklyPlan(userId: string, weekStart: string): Promise<WeeklyPlanRow | null> {
  const { data, error } = await supabase
    .from("weekly_plans")
    .select("id,week_start,generated_at,slots")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as WeeklyPlanRow | null) ?? null;
}
