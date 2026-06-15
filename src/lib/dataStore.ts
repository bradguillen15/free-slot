// Unified data adapter — same shape whether the user is signed in (cloud) or in guest mode (localStorage).
// Reads go through React Query; mutations invalidate the relevant query keys.
import { useCallback, useMemo, useState, type SetStateAction } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { LocalActivity, LocalCategory, LocalProfile, LocalScheduleBlock, LocalTimeLog } from "@/lib/localStore";
import {
  deleteActivity as localDeleteActivity,
  deleteCategory as localDeleteCategory,
  deleteLog as localDeleteLog,
  deleteScheduleBlock as localDeleteScheduleBlock,
  ensureBootstrap,
  getProfile as localGetProfile,
  insertLog as localInsertLog,
  listActivities,
  listCategories,
  listLogsInRange,
  listScheduleBlocks,
  reorderScheduleBlocks as localReorderScheduleBlocks,
  updateLog as localUpdateLog,
  updateProfile as localUpdateProfile,
  upsertActivity as localUpsertActivity,
  upsertCategory as localUpsertCategory,
  upsertScheduleBlock as localUpsertScheduleBlock,
} from "@/lib/localStore";
import { resources } from "@/resources";
import type { WeeklyPlan } from "@/resources/types/weeklyPlan";
import { getQueryClient } from "@/lib/queryClient";
import { queryKeys, type Mode } from "@/lib/queryKeys";

export type { Mode };

export function useMode(): Mode {
  const { user, loading } = useAuth();
  if (loading) return "guest";
  return user ? "cloud" : "guest";
}

function useAuthScope() {
  const { user } = useAuth();
  const mode: Mode = user ? "cloud" : "guest";
  const userId = user?.id ?? null;
  return { mode, userId };
}

function toErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

function useDataQuery<T>({
  queryKey,
  queryFn,
  enabled = true,
}: {
  queryKey: readonly unknown[];
  queryFn: () => Promise<T>;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const [fetchError, setFetchError] = useState<string | null>(null);

  const query = useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      try {
        const data = await queryFn();
        setFetchError(null);
        return data;
      } catch (error) {
        setFetchError(toErrorMessage(error));
        throw error;
      }
    },
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return { query, fetchError, refresh };
}

const EMPTY_CATEGORIES: LocalCategory[] = [];
const EMPTY_ACTIVITIES: LocalActivity[] = [];
const EMPTY_BLOCKS: LocalScheduleBlock[] = [];
const EMPTY_LOGS: LocalTimeLog[] = [];

function invalidateCategories(mode: Mode, userId: string | null) {
  getQueryClient().invalidateQueries({ queryKey: queryKeys.categories(mode, userId) });
}

function invalidateActivities(mode: Mode, userId: string | null) {
  getQueryClient().invalidateQueries({ queryKey: queryKeys.activities(mode, userId) });
}

function invalidateScheduleBlocks(mode: Mode, userId: string | null) {
  getQueryClient().invalidateQueries({ queryKey: queryKeys.scheduleBlocks(mode, userId) });
}

function invalidateTimeLogs(mode: Mode, userId: string | null) {
  getQueryClient().invalidateQueries({ queryKey: queryKeys.timeLogsPrefix(mode, userId) });
}

function invalidateProfile(mode: Mode, userId: string | null) {
  getQueryClient().invalidateQueries({ queryKey: queryKeys.profile(mode, userId) });
}

function invalidateWeeklyPlan(userId: string, weekStart: string) {
  getQueryClient().invalidateQueries({ queryKey: queryKeys.weeklyPlan(userId, weekStart) });
}

// ---------- Categories ----------
export function filterVisibleCategories(categories: LocalCategory[]): LocalCategory[] {
  return categories.filter((c) => !c.hidden);
}

export function useCategories() {
  const { mode, userId } = useAuthScope();
  const { query, fetchError, refresh } = useDataQuery({
    queryKey: queryKeys.categories(mode, userId),
    queryFn: () => {
      if (mode === "guest") { ensureBootstrap(); return Promise.resolve(listCategories()); }
      return resources.categories.list(userId!);
    },
    enabled: mode === "guest" || !!userId,
  });

  return {
    data: query.data ?? EMPTY_CATEGORIES,
    error: fetchError,
    refresh,
    mode,
  };
}

export function useVisibleCategories() {
  const { data, error, refresh, mode } = useCategories();
  const visible = useMemo(() => filterVisibleCategories(data), [data]);
  return { data: visible, all: data, error, refresh, mode };
}

export function pickerCategories<T extends { id: string }>(
  visible: T[],
  all: T[],
  selectedId?: string | null,
): T[] {
  if (!selectedId) return visible;
  if (visible.some((c) => c.id === selectedId)) return visible;
  const selected = all.find((c) => c.id === selectedId);
  return selected ? [...visible, selected] : visible;
}

// ---------- Activities ----------
export function useActivities() {
  const { mode, userId } = useAuthScope();
  const { query, fetchError, refresh } = useDataQuery({
    queryKey: queryKeys.activities(mode, userId),
    queryFn: () => {
      if (mode === "guest") { ensureBootstrap(); return Promise.resolve(listActivities()); }
      return resources.activities.list(userId!);
    },
    enabled: mode === "guest" || !!userId,
  });

  return { data: query.data ?? EMPTY_ACTIVITIES, error: fetchError, refresh, mode };
}

// ---------- Schedule blocks ----------
export function useScheduleBlocks() {
  const { mode, userId } = useAuthScope();
  const { query, fetchError, refresh } = useDataQuery({
    queryKey: queryKeys.scheduleBlocks(mode, userId),
    queryFn: () => {
      if (mode === "guest") { ensureBootstrap(); return Promise.resolve(listScheduleBlocks()); }
      return resources.scheduleBlocks.list(userId!);
    },
    enabled: mode === "guest" || !!userId,
  });

  return { data: query.data ?? EMPTY_BLOCKS, error: fetchError, refresh, mode };
}

// ---------- Time logs in date range ----------
export function useTimeLogsInRange(startISO: string, endISO: string) {
  const { mode, userId } = useAuthScope();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.timeLogs(mode, userId, startISO, endISO);

  const { query, fetchError, refresh } = useDataQuery({
    queryKey,
    queryFn: () => {
      if (mode === "guest") { ensureBootstrap(); return Promise.resolve(listLogsInRange(startISO, endISO)); }
      return resources.timeLogs.listInRange(userId!, startISO, endISO);
    },
    enabled: mode === "guest" || !!userId,
  });

  const setData = useCallback(
    (updater: SetStateAction<LocalTimeLog[]>) => {
      queryClient.setQueryData(queryKey, (prev: LocalTimeLog[] | undefined) => {
        const current = prev ?? [];
        return typeof updater === "function" ? updater(current) : updater;
      });
    },
    [queryClient, queryKey],
  );

  return {
    data: query.data ?? EMPTY_LOGS,
    setData,
    error: fetchError,
    refresh,
    mode,
  };
}

// ---------- Profile ----------
export function useProfile() {
  const { mode, userId } = useAuthScope();
  const { query, fetchError, refresh } = useDataQuery({
    queryKey: queryKeys.profile(mode, userId),
    queryFn: () => {
      if (mode === "guest") { ensureBootstrap(); return Promise.resolve(localGetProfile()); }
      return resources.profiles.get(userId!);
    },
    enabled: mode === "guest" || !!userId,
  });

  return {
    data: query.data ?? null,
    error: fetchError,
    refresh,
    mode,
  };
}

// ---------- Cloud-only weekly plan ----------
export function useWeeklyPlan(weekStart: string) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const query = useQuery({
    queryKey: queryKeys.weeklyPlan(userId ?? "", weekStart),
    queryFn: () => resources.weeklyPlans.getForWeek(userId!, weekStart),
    enabled: !!userId,
  });

  return {
    data: query.data ?? null,
    slots: (query.data?.slots ?? []) as WeeklyPlan["slots"],
    error: toErrorMessage(query.error),
    isLoading: query.isLoading,
  };
}

// ---------- Mutations (async functions + invalidation) ----------
export async function insertTimeLog(
  mode: Mode,
  userId: string | null,
  input: {
    id?: string;
    date: string;
    start_time: string;
    end_time: string;
    category_id: string;
    type: "productive" | "unproductive";
    title?: string | null;
    notes?: string | null;
  },
) {
  let result: unknown;
  if (mode === "guest") {
    result = localInsertLog(input);
  } else {
    const { data, error } = await supabase
      .from("time_logs")
      .insert({
        user_id: userId!,
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
    result = data;
  }
  invalidateTimeLogs(mode, userId);
  return result;
}

export async function deleteTimeLog(mode: Mode, userId: string | null, id: string) {
  if (mode === "guest") {
    localDeleteLog(id);
  } else {
    const { error } = await supabase.from("time_logs").delete().eq("id", id).eq("user_id", userId!);
    if (error) throw error;
  }
  invalidateTimeLogs(mode, userId);
}

export async function updateTimeLog(
  mode: Mode,
  userId: string | null,
  id: string,
  input: {
    start_time: string;
    end_time: string;
    category_id: string;
    type: "productive" | "unproductive";
    title?: string | null;
    notes?: string | null;
  },
) {
  let result: unknown;
  if (mode === "guest") {
    result = localUpdateLog(id, input);
  } else {
    const { data, error } = await supabase
      .from("time_logs")
      .update({
        start_time: input.start_time,
        end_time: input.end_time,
        category_id: input.category_id,
        type: input.type,
        ...(input.title !== undefined ? { title: input.title } : {}),
        notes: input.notes ?? null,
      })
      .eq("id", id)
      .eq("user_id", userId!)
      .select()
      .single();
    if (error) throw error;
    result = data;
  }
  invalidateTimeLogs(mode, userId);
  return result;
}

export async function upsertActivity(
  mode: Mode,
  userId: string | null,
  input: {
    id?: string;
    name: string;
    category_id: string | null;
    target_hours_per_week: number;
    is_active: boolean;
  },
) {
  let result: unknown;
  if (mode === "guest") {
    result = localUpsertActivity(input);
  } else if (input.id) {
    const { data, error } = await supabase.from("activities").update({
      name: input.name,
      category_id: input.category_id,
      target_hours_per_week: input.target_hours_per_week,
      is_active: input.is_active,
    }).eq("id", input.id).eq("user_id", userId!).select().single();
    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await supabase.from("activities").insert({
      user_id: userId!,
      name: input.name,
      category_id: input.category_id,
      target_hours_per_week: input.target_hours_per_week,
      is_active: input.is_active,
    }).select().single();
    if (error) throw error;
    result = data;
  }
  invalidateActivities(mode, userId);
  return result;
}

export async function deleteActivity(mode: Mode, userId: string | null, id: string) {
  if (mode === "guest") {
    localDeleteActivity(id);
  } else {
    const { error } = await supabase.from("activities").delete().eq("id", id).eq("user_id", userId!);
    if (error) throw error;
  }
  invalidateActivities(mode, userId);
}

export async function upsertScheduleBlock(
  mode: Mode,
  userId: string | null,
  input: Partial<LocalScheduleBlock> & {
    name: string;
    start_time: string;
    end_time: string;
    days_of_week: number[];
    type: "fixed" | "waste_expected";
    color: string;
  },
) {
  let result: unknown;
  if (mode === "guest") {
    result = localUpsertScheduleBlock(input);
  } else if (input.id) {
    const { data, error } = await supabase.from("schedule_blocks").update({
      name: input.name, start_time: input.start_time, end_time: input.end_time,
      days_of_week: input.days_of_week, color: input.color, type: input.type,
      category_id: input.category_id ?? null,
    }).eq("id", input.id).eq("user_id", userId!).select().single();
    if (error) throw error;
    result = data;
  } else {
    const { data: existing } = await supabase
      .from("schedule_blocks")
      .select("sort_order")
      .eq("user_id", userId!)
      .order("sort_order", { ascending: false })
      .limit(1);
    const nextSort = ((existing?.[0] as { sort_order?: number } | undefined)?.sort_order ?? -1) + 1;
    const { data, error } = await supabase.from("schedule_blocks").insert({
      user_id: userId!,
      name: input.name, start_time: input.start_time, end_time: input.end_time,
      days_of_week: input.days_of_week, color: input.color, type: input.type,
      category_id: input.category_id ?? null,
      sort_order: nextSort,
    }).select().single();
    if (error) throw error;
    result = data;
  }
  invalidateScheduleBlocks(mode, userId);
  return result;
}

export async function deleteScheduleBlock(mode: Mode, userId: string | null, id: string) {
  if (mode === "guest") {
    localDeleteScheduleBlock(id);
  } else {
    const { error } = await supabase.from("schedule_blocks").delete().eq("id", id).eq("user_id", userId!);
    if (error) throw error;
  }
  invalidateScheduleBlocks(mode, userId);
}

export async function reorderScheduleBlocks(mode: Mode, userId: string | null, orderedIds: string[]) {
  if (mode === "guest") {
    localReorderScheduleBlocks(orderedIds);
  } else {
    const results = await Promise.all(
      orderedIds.map((id, i) =>
        supabase.from("schedule_blocks").update({ sort_order: i }).eq("id", id).eq("user_id", userId!),
      ),
    );
    const err = results.find((r) => r.error)?.error;
    if (err) throw err;
  }
  invalidateScheduleBlocks(mode, userId);
}

export async function upsertCategory(
  mode: Mode,
  userId: string | null,
  input: { id?: string; name?: string; color?: string; type?: "productive" | "unproductive"; hidden?: boolean },
) {
  let result: unknown;
  if (mode === "guest") {
    result = localUpsertCategory(input);
  } else if (input.id) {
    const patch: { name?: string; color?: string; type?: "productive" | "unproductive"; hidden?: boolean } = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.color !== undefined) patch.color = input.color;
    if (input.type !== undefined) patch.type = input.type;
    if (input.hidden !== undefined) patch.hidden = input.hidden;
    const { data, error } = await supabase
      .from("categories")
      .update(patch)
      .eq("id", input.id)
      .eq("user_id", userId!)
      .select()
      .single();
    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: userId!,
        name: input.name ?? "Untitled",
        color: input.color ?? "#3b82f6",
        type: input.type ?? "productive",
        hidden: input.hidden ?? false,
      })
      .select()
      .single();
    if (error) throw error;
    result = data;
  }
  invalidateCategories(mode, userId);
  return result;
}

export async function deleteCategory(mode: Mode, userId: string | null, id: string) {
  if (mode === "guest") {
    await localDeleteCategory(id);
  } else {
    const { data: cat, error: selErr } = await supabase
      .from("categories")
      .select("is_default")
      .eq("id", id)
      .eq("user_id", userId!)
      .single();
    if (selErr) throw selErr;
    if (cat?.is_default) throw new Error("Default labels cannot be deleted");
    const { error } = await supabase.from("categories").delete().eq("id", id).eq("user_id", userId!);
    if (error) throw error;
  }
  invalidateCategories(mode, userId);
}

export async function updateProfile(
  mode: Mode,
  userId: string | null,
  patch: Partial<LocalProfile>,
) {
  if (mode === "guest") {
    localUpdateProfile(patch);
  } else {
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId!);
    if (error) throw error;
  }
  invalidateProfile(mode, userId);
}

// ---------- useMutation wrappers (for components that prefer hooks) ----------
export function useInsertTimeLogMutation() {
  const { mode, userId } = useAuthScope();
  return useMutation({
    mutationFn: (input: Parameters<typeof insertTimeLog>[2]) => insertTimeLog(mode, userId, input),
  });
}

export function useUpdateTimeLogMutation() {
  const { mode, userId } = useAuthScope();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateTimeLog>[3] }) =>
      updateTimeLog(mode, userId, id, input),
  });
}

export function useDeleteTimeLogMutation() {
  const { mode, userId } = useAuthScope();
  return useMutation({
    mutationFn: (id: string) => deleteTimeLog(mode, userId, id),
  });
}

export function useUpsertCategoryMutation() {
  const { mode, userId } = useAuthScope();
  return useMutation({
    mutationFn: (input: Parameters<typeof upsertCategory>[2]) => upsertCategory(mode, userId, input),
  });
}

export function useUpsertScheduleBlockMutation() {
  const { mode, userId } = useAuthScope();
  return useMutation({
    mutationFn: (input: Parameters<typeof upsertScheduleBlock>[2]) => upsertScheduleBlock(mode, userId, input),
  });
}

export function useDeleteScheduleBlockMutation() {
  const { mode, userId } = useAuthScope();
  return useMutation({
    mutationFn: (id: string) => deleteScheduleBlock(mode, userId, id),
  });
}

export function useReorderScheduleBlocksMutation() {
  const { mode, userId } = useAuthScope();
  return useMutation({
    mutationFn: (orderedIds: string[]) => reorderScheduleBlocks(mode, userId, orderedIds),
  });
}

export function useUpdateProfileMutation() {
  const { mode, userId } = useAuthScope();
  return useMutation({
    mutationFn: (patch: Partial<LocalProfile>) => updateProfile(mode, userId, patch),
  });
}

export { invalidateWeeklyPlan };
