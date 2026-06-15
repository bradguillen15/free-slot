import { supabase } from "@/integrations/supabase/client";
import type { ResourcesProvider } from "@/resources/_providers/types";
import { mapActivity, mapCategory, mapProfile, mapScheduleBlock, mapTimeLog, mapWeeklyPlan, sortScheduleBlocks } from "./mappers";

export function createSupabaseProvider(): ResourcesProvider {
  return {
    categories: {
      async list(userId) {
        const { data, error } = await supabase
          .from("categories")
          .select("id,name,color,type,is_default,hidden,created_at")
          .eq("user_id", userId)
          .order("name");
        if (error) throw new Error(error.message);
        return (data ?? []).map((r) => mapCategory(r as Record<string, unknown>));
      },
    },

    activities: {
      async list(userId) {
        const { data, error } = await supabase
          .from("activities")
          .select("id,name,category_id,target_hours_per_week,is_active,created_at")
          .eq("user_id", userId)
          .order("created_at");
        if (error) throw new Error(error.message);
        return (data ?? []).map((r) => mapActivity(r as Record<string, unknown>));
      },
    },

    scheduleBlocks: {
      async list(userId) {
        const { data, error } = await supabase
          .from("schedule_blocks")
          .select("*")
          .eq("user_id", userId);
        if (error) throw new Error(error.message);
        return sortScheduleBlocks(
          (data ?? []).map((r) => mapScheduleBlock(r as Record<string, unknown>))
        );
      },
    },

    timeLogs: {
      async listInRange(userId, startISO, endISO) {
        const { data, error } = await supabase
          .from("time_logs")
          .select("*")
          .eq("user_id", userId)
          .gte("date", startISO)
          .lte("date", endISO)
          .order("date");
        if (error) throw new Error(error.message);
        return (data ?? []).map((r) => mapTimeLog(r as Record<string, unknown>));
      },
    },

    profiles: {
      async get(userId) {
        const { data, error } = await supabase
          .from("profiles")
          .select("peak_hours,include_weekends,weekly_review_day,onboarding_completed")
          .eq("id", userId)
          .maybeSingle();
        if (error) throw new Error(error.message);
        return data ? mapProfile(data as Record<string, unknown>) : null;
      },
    },

    weeklyPlans: {
      async getForWeek(userId, weekStart) {
        const { data, error } = await supabase
          .from("weekly_plans")
          .select("id,week_start,generated_at,slots")
          .eq("user_id", userId)
          .eq("week_start", weekStart)
          .maybeSingle();
        if (error) throw new Error(error.message);
        return data ? mapWeeklyPlan(data as Record<string, unknown>) : null;
      },
    },
  };
}
