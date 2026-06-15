import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { ResourcesProvider, ActivityInput, CategoryInput, ScheduleBlockInput, TimeLogInput, TimeLogPatch } from "@/resources/_providers/types";
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

      async upsert(userId, input: CategoryInput) {
        if (input.id) {
          const patch: { name?: string; color?: string; type?: "productive" | "unproductive"; hidden?: boolean } = {};
          if (input.name !== undefined) patch.name = input.name;
          if (input.color !== undefined) patch.color = input.color;
          if (input.type !== undefined) patch.type = input.type;
          if (input.hidden !== undefined) patch.hidden = input.hidden;
          const { data, error } = await supabase
            .from("categories")
            .update(patch)
            .eq("id", input.id)
            .eq("user_id", userId)
            .select()
            .single();
          if (error) throw error;
          return mapCategory(data as Record<string, unknown>);
        }
        const { data, error } = await supabase
          .from("categories")
          .insert({
            user_id: userId,
            name: input.name ?? "Untitled",
            color: input.color ?? "#3b82f6",
            type: input.type ?? "productive",
            hidden: input.hidden ?? false,
          })
          .select()
          .single();
        if (error) throw error;
        return mapCategory(data as Record<string, unknown>);
      },

      async delete(userId, id) {
        const { data: cat, error: selErr } = await supabase
          .from("categories")
          .select("is_default")
          .eq("id", id)
          .eq("user_id", userId)
          .single();
        if (selErr) throw selErr;
        if ((cat as { is_default?: boolean } | null)?.is_default) {
          throw new Error("Default labels cannot be deleted");
        }
        const { error } = await supabase
          .from("categories")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
        if (error) throw error;
      },

      async insertMany(userId, items) {
        const rows = items.map((c) => ({ ...c, user_id: userId }));
        const { data, error } = await supabase.from("categories").insert(rows).select();
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

      async upsert(userId, input: ActivityInput) {
        if (input.id) {
          const { data, error } = await supabase
            .from("activities")
            .update({
              name: input.name,
              category_id: input.category_id,
              target_hours_per_week: input.target_hours_per_week,
              is_active: input.is_active,
            })
            .eq("id", input.id)
            .eq("user_id", userId)
            .select()
            .single();
          if (error) throw error;
          return mapActivity(data as Record<string, unknown>);
        }
        const { data, error } = await supabase
          .from("activities")
          .insert({
            user_id: userId,
            name: input.name,
            category_id: input.category_id,
            target_hours_per_week: input.target_hours_per_week,
            is_active: input.is_active,
          })
          .select()
          .single();
        if (error) throw error;
        return mapActivity(data as Record<string, unknown>);
      },

      async delete(userId, id) {
        const { error } = await supabase
          .from("activities")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
        if (error) throw error;
      },

      async insertMany(userId, items) {
        const rows = items.map((a) => ({ ...a, user_id: userId }));
        const { data, error } = await supabase.from("activities").insert(rows).select();
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

      async upsert(userId, input: ScheduleBlockInput) {
        if (input.id) {
          const { data, error } = await supabase
            .from("schedule_blocks")
            .update({
              name: input.name,
              start_time: input.start_time,
              end_time: input.end_time,
              days_of_week: input.days_of_week,
              color: input.color,
              type: input.type,
              category_id: input.category_id ?? null,
            })
            .eq("id", input.id)
            .eq("user_id", userId)
            .select()
            .single();
          if (error) throw error;
          return mapScheduleBlock(data as Record<string, unknown>);
        }
        const { data: existing } = await supabase
          .from("schedule_blocks")
          .select("sort_order")
          .eq("user_id", userId)
          .order("sort_order", { ascending: false })
          .limit(1);
        const nextSort =
          (((existing?.[0] as { sort_order?: number } | undefined)?.sort_order) ?? -1) + 1;
        const { data, error } = await supabase
          .from("schedule_blocks")
          .insert({
            user_id: userId,
            name: input.name,
            start_time: input.start_time,
            end_time: input.end_time,
            days_of_week: input.days_of_week,
            color: input.color,
            type: input.type,
            category_id: input.category_id ?? null,
            sort_order: nextSort,
          })
          .select()
          .single();
        if (error) throw error;
        return mapScheduleBlock(data as Record<string, unknown>);
      },

      async delete(userId, id) {
        const { error } = await supabase
          .from("schedule_blocks")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
        if (error) throw error;
      },

      async reorder(userId, orderedIds) {
        const results = await Promise.all(
          orderedIds.map((id, i) =>
            supabase
              .from("schedule_blocks")
              .update({ sort_order: i })
              .eq("id", id)
              .eq("user_id", userId)
          )
        );
        const err = results.find((r) => r.error)?.error;
        if (err) throw new Error(err.message);
      },

      async insertMany(userId, items) {
        const rows = items.map((b) => ({ ...b, user_id: userId }));
        const { data, error } = await supabase.from("schedule_blocks").insert(rows).select();
        if (error) throw new Error(error.message);
        return sortScheduleBlocks((data ?? []).map((r) => mapScheduleBlock(r as Record<string, unknown>)));
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

      async insert(userId, input: TimeLogInput) {
        const { data, error } = await supabase
          .from("time_logs")
          .insert({
            user_id: userId,
            id: input.id,
            date: input.date,
            start_time: input.start_time,
            end_time: input.end_time,
            category_id: input.category_id,
            type: input.type,
            title: input.title ?? null,
            notes: input.notes ?? null,
          })
          .select()
          .single();
        if (error) throw error;
        return mapTimeLog(data as Record<string, unknown>);
      },

      async update(userId, id, patch: TimeLogPatch) {
        const { data, error } = await supabase
          .from("time_logs")
          .update({
            start_time: patch.start_time,
            end_time: patch.end_time,
            category_id: patch.category_id,
            type: patch.type,
            ...(patch.date !== undefined ? { date: patch.date } : {}),
            ...(patch.title !== undefined ? { title: patch.title } : {}),
            notes: patch.notes ?? null,
          })
          .eq("id", id)
          .eq("user_id", userId)
          .select()
          .single();
        if (error) throw error;
        return mapTimeLog(data as Record<string, unknown>);
      },

      async delete(userId, id) {
        const { error } = await supabase
          .from("time_logs")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
        if (error) throw error;
      },

      async insertMany(userId, items) {
        const rows = items.map((l) => ({ ...l, user_id: userId }));
        const { data, error } = await supabase.from("time_logs").insert(rows).select();
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

      async update(userId, patch) {
        // LocalProfile.peak_hours is { start, end } | null; Supabase types it as Json — cast required.
        const dbPatch: { peak_hours?: Json; include_weekends?: boolean; weekly_review_day?: number; onboarding_completed?: boolean } = {
          ...patch,
          ...(patch.peak_hours !== undefined ? { peak_hours: patch.peak_hours as Json } : {}),
        };
        const { error } = await supabase.from("profiles").update(dbPatch).eq("id", userId);
        if (error) throw new Error(error.message);
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

      async delete(userId, weekStart) {
        const { error } = await supabase
          .from("weekly_plans")
          .delete()
          .eq("user_id", userId)
          .eq("week_start", weekStart);
        if (error) throw new Error(error.message);
      },
    },

    weeklyReviews: {
      async getForWeek(userId, weekStart) {
        const { data, error } = await supabase
          .from("weekly_reviews")
          .select("id,week_start,insights,planned_vs_actual,completed_at")
          .eq("user_id", userId)
          .eq("week_start", weekStart)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) return null;
        const r = data as Record<string, unknown>;
        return {
          id: r.id as string,
          week_start: r.week_start as string,
          insights: (r.insights ?? null) as string | null,
          planned_vs_actual: r.planned_vs_actual ?? null,
          completed_at: r.completed_at as string,
        };
      },
    },

    weeklyPriorities: {
      async listForWeek(userId, weekStart) {
        const { data, error } = await supabase
          .from("weekly_priorities")
          .select("id,activity_id,rank,week_start")
          .eq("user_id", userId)
          .eq("week_start", weekStart)
          .order("rank");
        if (error) throw new Error(error.message);
        return (data ?? []).map((r) => ({
          id: r.id as string,
          activity_id: r.activity_id as string,
          rank: r.rank as number,
          week_start: r.week_start as string,
        }));
      },

      async upsertMany(userId, weekStart, priorities) {
        const rows = priorities.map((p, i) => ({
          user_id: userId,
          week_start: weekStart,
          activity_id: p.activity_id,
          rank: p.rank ?? i,
        }));
        const { data, error } = await supabase
          .from("weekly_priorities")
          .upsert(rows, { onConflict: "user_id,week_start,activity_id" })
          .select("id,activity_id,rank,week_start");
        if (error) throw new Error(error.message);
        return (data ?? []).map((r) => ({
          id: r.id as string,
          activity_id: r.activity_id as string,
          rank: r.rank as number,
          week_start: r.week_start as string,
        }));
      },
    },

    functions: {
      async generateWeeklyReview(body) {
        const { data, error } = await supabase.functions.invoke("weekly-review", { body });
        if (error) throw error;
        return data as { review: { insights: string } };
      },

      async generateWeeklyPlan(body) {
        const { data, error } = await supabase.functions.invoke("generate-weekly-plan", { body });
        if (error) throw error;
        return data as { slots: unknown[] };
      },

      async deleteAccount(_userId) {
        const { error } = await supabase.functions.invoke("delete-account");
        if (error) throw error;
      },
    },
  };
}
