import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { ResourcesProvider, ActivityInput, CategoryInput, ScheduleBlockInput, TimeLogInput, TimeLogPatch } from "@/resources/_providers/types";
import { mapActivity, mapCategory, mapDailyNote, mapInboxItem, mapProfile, mapScheduleBlock, mapTimeLog, mapWeeklyPlan, sortCategories, sortScheduleBlocks } from "./mappers";

export function edgeFunctionErrorMessage(error: unknown, data: unknown): string {
  if (data && typeof data === "object" && "error" in data) {
    const message = (data as { error: unknown }).error;
    if (typeof message === "string" && message.length > 0) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Request failed";
}

function throwOnFunctionError(error: unknown, data: unknown): void {
  if (error) throw new Error(edgeFunctionErrorMessage(error, data));
}

export function createSupabaseProvider(): ResourcesProvider {
  return {
    categories: {
      async list(userId) {
        const { data, error } = await supabase
          .from("categories")
          .select("id,name,color,type,is_default,hidden,created_at,sort_order")
          .eq("user_id", userId);
        if (error) throw new Error(error.message);
        return sortCategories((data ?? []).map((r) => mapCategory(r as Record<string, unknown>)));
      },

      async upsert(userId, input: CategoryInput) {
        if (input.id) {
          const patch: { name?: string; color?: string; type?: "productive" | "unproductive" | "essential"; hidden?: boolean } = {};
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
        const { data: existing } = await supabase
          .from("categories")
          .select("sort_order")
          .eq("user_id", userId)
          .order("sort_order", { ascending: false })
          .limit(1);
        const nextSort =
          (((existing?.[0] as { sort_order?: number } | undefined)?.sort_order) ?? -1) + 1;
        const { data, error } = await supabase
          .from("categories")
          .insert({
            user_id: userId,
            name: input.name ?? "Untitled",
            color: input.color ?? "#3b82f6",
            type: input.type ?? "productive",
            hidden: input.hidden ?? false,
            sort_order: nextSort,
          })
          .select()
          .single();
        if (error) throw error;
        return mapCategory(data as Record<string, unknown>);
      },

      async reorder(userId, orderedIds) {
        const results = await Promise.all(
          orderedIds.map((id, i) =>
            supabase
              .from("categories")
              .update({ sort_order: i })
              .eq("id", id)
              .eq("user_id", userId)
          )
        );
        const err = results.find((r) => r.error)?.error;
        if (err) throw new Error(err.message);
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
            note_json: (input.note_json ?? null) as Json | null,
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
            ...(patch.note_json !== undefined ? { note_json: patch.note_json as Json | null } : {}),
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
        const rows = items.map((l) => ({ ...l, user_id: userId, note_json: (l.note_json ?? null) as Json | null }));
        const { data, error } = await supabase.from("time_logs").insert(rows).select();
        if (error) throw new Error(error.message);
        return (data ?? []).map((r) => mapTimeLog(r as Record<string, unknown>));
      },
    },

    profiles: {
      async get(userId) {
        const { data, error } = await supabase
          .from("profiles")
          .select("peak_hours,include_weekends,weekly_review_day,time_format,onboarding_completed,onboarding_skipped")
          .eq("id", userId)
          .maybeSingle();
        if (error) throw new Error(error.message);
        return data ? mapProfile(data as Record<string, unknown>) : null;
      },

      async update(userId, patch) {
        // LocalProfile.peak_hours is { start, end } | null; Supabase types it as Json — cast required.
        const dbPatch: {
          peak_hours?: Json;
          include_weekends?: boolean;
          weekly_review_day?: number;
          time_format?: string;
          onboarding_completed?: boolean;
          onboarding_skipped?: boolean;
        } = {
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
          .select("id,week_start,insights,completed_at")
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

    dailyNotes: {
      async get(userId, date) {
        const { data, error } = await supabase
          .from("daily_notes")
          .select("user_id,date,content,updated_at")
          .eq("user_id", userId)
          .eq("date", date)
          .maybeSingle();
        if (error) throw new Error(error.message);
        return data ? mapDailyNote(data as Record<string, unknown>) : null;
      },

      async upsert(userId, date, content) {
        const { error } = await supabase
          .from("daily_notes")
          .upsert(
            { user_id: userId, date, content: content as Json, updated_at: new Date().toISOString() },
            { onConflict: "user_id,date" }
          );
        if (error) throw new Error(error.message);
      },

      async listForWeek(userId, startISO, endISO) {
        const { data, error } = await supabase
          .from("daily_notes")
          .select("user_id,date,content,updated_at")
          .eq("user_id", userId)
          .gte("date", startISO)
          .lte("date", endISO);
        if (error) throw new Error(error.message);
        return (data ?? []).map((r: Record<string, unknown>) => mapDailyNote(r));
      },

      async listDates(userId) {
        const { data, error } = await supabase
          .from("daily_notes")
          .select("date")
          .eq("user_id", userId)
          .order("date", { ascending: false });
        if (error) throw new Error(error.message);
        return (data ?? []).map((r: { date: string }) => r.date);
      },

      async insertMany(userId, rows) {
        if (!rows.length) return;
        const { error } = await supabase
          .from("daily_notes")
          .upsert(
            rows.map((r) => ({ user_id: userId, date: r.date, content: r.content as Json, updated_at: r.updated_at })),
            { onConflict: "user_id,date" }
          );
        if (error) throw new Error(error.message);
      },
    },

    inboxItems: {
      async list(userId) {
        const { data, error } = await supabase
          .from("inbox_items")
          .select("id,user_id,content,created_at,archived_at")
          .eq("user_id", userId)
          .is("archived_at", null)
          .order("created_at", { ascending: false });
        if (error) throw new Error(error.message);
        return (data ?? []).map((r: Record<string, unknown>) => mapInboxItem(r));
      },

      async insert(userId, content) {
        const { data, error } = await supabase
          .from("inbox_items")
          .insert({ user_id: userId, content })
          .select("id,user_id,content,created_at,archived_at")
          .single();
        if (error) throw new Error(error.message);
        return mapInboxItem(data as Record<string, unknown>);
      },

      async archive(userId, id) {
        const { error } = await supabase
          .from("inbox_items")
          .update({ archived_at: new Date().toISOString() })
          .eq("id", id)
          .eq("user_id", userId);
        if (error) throw new Error(error.message);
      },

      async insertMany(userId, rows) {
        if (!rows.length) return [];
        const { data, error } = await supabase
          .from("inbox_items")
          .insert(rows.map((r) => ({
            user_id: userId,
            content: r.content,
            created_at: r.created_at,
            archived_at: r.archived_at,
          })))
          .select("id,user_id,content,created_at,archived_at");
        if (error) throw new Error(error.message);
        return (data ?? []).map((r: Record<string, unknown>) => mapInboxItem(r));
      },
    },

    functions: {
      async generateWeeklyReview(body) {
        const { data, error } = await supabase.functions.invoke("weekly-review", { body });
        throwOnFunctionError(error, data);
        return data as { review: { insights: string } };
      },

      async generateWeeklyPlan(body) {
        const { data, error } = await supabase.functions.invoke("generate-weekly-plan", { body });
        throwOnFunctionError(error, data);
        return data as { slots: unknown[] };
      },

      async deleteAccount(_userId) {
        const { data, error } = await supabase.functions.invoke("delete-account");
        throwOnFunctionError(error, data);
      },
    },
  };
}
