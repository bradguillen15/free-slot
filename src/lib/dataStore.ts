// Unified data adapter — same shape whether the user is signed in (cloud) or in guest mode (localStorage).
// Hooks read from this so pages don't care about auth state.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import * as L from "@/lib/localStore";

export type Mode = "cloud" | "guest";

export function useMode(): Mode {
  const { user, loading } = useAuth();
  if (loading) return "guest"; // optimistic — flips on auth
  return user ? "cloud" : "guest";
}

// React to localStorage writes inside this tab AND across tabs.
function useGuestRefresh(active: boolean) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const bump = () => setTick((t) => t + 1);
    window.addEventListener("freeslot:guest-change", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("freeslot:guest-change", bump);
      window.removeEventListener("storage", bump);
    };
  }, [active]);
  return tick;
}

// ---------- Categories ----------
export function useCategories() {
  const { user } = useAuth();
  const mode: Mode = user ? "cloud" : "guest";
  const tick = useGuestRefresh(mode === "guest");
  const [data, setData] = useState<L.LocalCategory[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (mode === "guest") {
      L.ensureBootstrap();
      setData(L.listCategories());
      return;
    }
    const { data: rows, error: err } = await supabase
      .from("categories")
      .select("id,name,color,type,is_default,created_at")
      .eq("user_id", user!.id)
      .order("name");
    if (err) {
      // Keep last known data instead of clobbering it with [].
      console.error("useCategories refresh failed:", err.message);
      setError(err.message);
      return;
    }
    setError(null);
    setData((rows ?? []) as unknown as L.LocalCategory[]);
  }, [mode, user]);

  useEffect(() => { refresh(); }, [refresh, tick]);
  return { data, error, refresh, mode };
}

// ---------- Activities ----------
export function useActivities() {
  const { user } = useAuth();
  const mode: Mode = user ? "cloud" : "guest";
  const tick = useGuestRefresh(mode === "guest");
  const [data, setData] = useState<L.LocalActivity[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (mode === "guest") {
      L.ensureBootstrap();
      setData(L.listActivities());
      return;
    }
    const { data: rows, error: err } = await supabase
      .from("activities")
      .select("id,name,category_id,target_hours_per_week,is_active,created_at")
      .eq("user_id", user!.id)
      .order("created_at");
    if (err) {
      console.error("useActivities refresh failed:", err.message);
      setError(err.message);
      return;
    }
    setError(null);
    setData((rows ?? []) as unknown as L.LocalActivity[]);
  }, [mode, user]);

  useEffect(() => { refresh(); }, [refresh, tick]);
  return { data, error, refresh, mode };
}

// ---------- Schedule blocks ----------
export function useScheduleBlocks() {
  const { user } = useAuth();
  const mode: Mode = user ? "cloud" : "guest";
  const tick = useGuestRefresh(mode === "guest");
  const [data, setData] = useState<L.LocalScheduleBlock[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (mode === "guest") {
      L.ensureBootstrap();
      setData(L.listScheduleBlocks());
      return;
    }
    const { data: rows, error: err } = await supabase
      .from("schedule_blocks")
      .select("*")
      .eq("user_id", user!.id);
    if (err) {
      console.error("useScheduleBlocks refresh failed:", err.message);
      setError(err.message);
      return;
    }
    setError(null);
    setData((rows ?? []) as unknown as L.LocalScheduleBlock[]);
  }, [mode, user]);

  useEffect(() => { refresh(); }, [refresh, tick]);
  return { data, error, refresh, mode };
}

// ---------- Time logs in date range ----------
export function useTimeLogsInRange(startISO: string, endISO: string) {
  const { user } = useAuth();
  const mode: Mode = user ? "cloud" : "guest";
  const tick = useGuestRefresh(mode === "guest");
  const [data, setData] = useState<L.LocalTimeLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Monotonic sequence so a slow stale response can't overwrite a newer range's data.
  const reqSeq = useRef(0);

  const refresh = useCallback(async () => {
    const seq = ++reqSeq.current;
    if (mode === "guest") {
      L.ensureBootstrap();
      setData(L.listLogsInRange(startISO, endISO));
      return;
    }
    const { data: rows, error: err } = await supabase
      .from("time_logs")
      .select("*")
      .eq("user_id", user!.id)
      .gte("date", startISO)
      .lte("date", endISO)
      .order("date");
    if (seq !== reqSeq.current) return; // a newer refresh superseded this one
    if (err) {
      console.error("useTimeLogsInRange refresh failed:", err.message);
      setError(err.message);
      return;
    }
    setError(null);
    setData((rows ?? []) as unknown as L.LocalTimeLog[]);
  }, [mode, user, startISO, endISO]);

  useEffect(() => { refresh(); }, [refresh, tick]);
  return { data, setData, error, refresh, mode };
}

// ---------- Profile ----------
export function useProfile() {
  const { user } = useAuth();
  const mode: Mode = user ? "cloud" : "guest";
  const tick = useGuestRefresh(mode === "guest");
  const [data, setData] = useState<L.LocalProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (mode === "guest") {
      L.ensureBootstrap();
      setData(L.getProfile());
      return;
    }
    const { data: row, error: err } = await supabase
      .from("profiles")
      .select("buffer_minutes,peak_hours,include_weekends,weekly_review_day,onboarding_completed")
      .eq("id", user!.id)
      .maybeSingle();
    if (err) {
      console.error("useProfile refresh failed:", err.message);
      setError(err.message);
      return;
    }
    setError(null);
    setData((row as unknown as L.LocalProfile) ?? null);
  }, [mode, user]);

  useEffect(() => { refresh(); }, [refresh, tick]);
  return { data, error, refresh, mode };
}

// ---------- Mutations ----------
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
  }
) {
  if (mode === "guest") {
    return L.insertLog(input);
  }
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
  return data;
}

export async function deleteTimeLog(mode: Mode, userId: string | null, id: string) {
  if (mode === "guest") return L.deleteLog(id);
  const { error } = await supabase.from("time_logs").delete().eq("id", id).eq("user_id", userId!);
  if (error) throw error;
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
  }
) {
  if (mode === "guest") return L.updateLog(id, input);
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
  return data;
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
  }
) {
  if (mode === "guest") return L.upsertActivity(input);
  if (input.id) {
    const { data, error } = await supabase.from("activities").update({
      name: input.name,
      category_id: input.category_id,
      target_hours_per_week: input.target_hours_per_week,
      is_active: input.is_active,
    }).eq("id", input.id).eq("user_id", userId!).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("activities").insert({
    user_id: userId!,
    name: input.name,
    category_id: input.category_id,
    target_hours_per_week: input.target_hours_per_week,
    is_active: input.is_active,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteActivity(mode: Mode, userId: string | null, id: string) {
  if (mode === "guest") return L.deleteActivity(id);
  const { error } = await supabase.from("activities").delete().eq("id", id).eq("user_id", userId!);
  if (error) throw error;
}

export async function upsertScheduleBlock(
  mode: Mode,
  userId: string | null,
  input: Partial<L.LocalScheduleBlock> & { name: string; start_time: string; end_time: string; days_of_week: number[]; type: "fixed" | "waste_expected"; color: string }
) {
  if (mode === "guest") return L.upsertScheduleBlock(input);
  if (input.id) {
    const { data, error } = await supabase.from("schedule_blocks").update({
      name: input.name, start_time: input.start_time, end_time: input.end_time,
      days_of_week: input.days_of_week, color: input.color, type: input.type,
      category_id: input.category_id ?? null,
    }).eq("id", input.id).eq("user_id", userId!).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("schedule_blocks").insert({
    user_id: userId!,
    name: input.name, start_time: input.start_time, end_time: input.end_time,
    days_of_week: input.days_of_week, color: input.color, type: input.type,
    category_id: input.category_id ?? null,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteScheduleBlock(mode: Mode, userId: string | null, id: string) {
  if (mode === "guest") return L.deleteScheduleBlock(id);
  const { error } = await supabase.from("schedule_blocks").delete().eq("id", id).eq("user_id", userId!);
  if (error) throw error;
}

export async function upsertCategory(
  mode: Mode,
  userId: string | null,
  input: { id?: string; name?: string; color?: string; type?: "productive" | "unproductive" }
) {
  if (mode === "guest") return L.upsertCategory(input);
  if (input.id) {
    const patch: { name?: string; color?: string; type?: "productive" | "unproductive" } = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.color !== undefined) patch.color = input.color;
    if (input.type !== undefined) patch.type = input.type;
    const { data, error } = await supabase
      .from("categories")
      .update(patch)
      .eq("id", input.id)
      .eq("user_id", userId!)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: userId!,
      name: input.name ?? "Untitled",
      color: input.color ?? "#3b82f6",
      type: input.type ?? "productive",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(mode: Mode, userId: string | null, id: string) {
  if (mode === "guest") return L.deleteCategory(id);
  const { error } = await supabase.from("categories").delete().eq("id", id).eq("user_id", userId!);
  if (error) throw error;
}

export async function updateProfile(
  mode: Mode,
  userId: string | null,
  patch: Partial<L.LocalProfile>
) {
  if (mode === "guest") return L.updateProfile(patch);
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId!);
  if (error) throw error;
}
