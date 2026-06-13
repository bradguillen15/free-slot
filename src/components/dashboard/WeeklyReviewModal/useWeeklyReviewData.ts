import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { addDaysISO, durationMinutes as durMin } from "@/lib/time";

type Cat = { id: string; name: string; color: string };
type LogRow = { date: string; start_time: string; end_time: string; category_id: string | null };
type Slot = { activity_name: string; start: string; end: string };

/**
 * Loads and aggregates a week's planned-vs-actual review data (logs, categories, AI plan, and any
 * saved review), and exposes the `generate` action that calls the weekly-review edge function.
 * Owns all review state so WeeklyReviewModal stays presentational. Account-gated (cloud only).
 */
export function useWeeklyReviewData({ open, user, weekStart }: {
  open: boolean;
  user: { id: string } | null | undefined;
  weekStart: string;
}) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);
  const [planned, setPlanned] = useState<{ name: string; minutes: number }[]>([]);
  const [actual, setActual] = useState<{ name: string; minutes: number }[]>([]);
  const [ratio, setRatio] = useState(0);
  const [total, setTotal] = useState(0);
  const [existing, setExisting] = useState(false);

  const weekEnd = useMemo(() => addDaysISO(weekStart, 6), [weekStart]);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    setLoading(true);
    setInsights(null);
    (async () => {
      const [logsRes, catsRes, planRes, reviewRes] = await Promise.all([
        supabase.from("time_logs").select("date,start_time,end_time,type,category_id")
          .eq("user_id", user.id).gte("date", weekStart).lte("date", weekEnd),
        supabase.from("categories").select("id,name,color").eq("user_id", user.id),
        supabase.from("weekly_plans").select("slots").eq("user_id", user.id).eq("week_start", weekStart).maybeSingle(),
        supabase.from("weekly_reviews").select("insights,planned_vs_actual").eq("user_id", user.id).eq("week_start", weekStart).maybeSingle(),
      ]);
      if (cancelled) return;
      const logs = (logsRes.data ?? []) as (LogRow & { type: "productive" | "unproductive" })[];
      const cats = (catsRes.data ?? []) as Cat[];
      const catMap = Object.fromEntries(cats.map((c) => [c.id, c]));
      const slots = ((planRes.data as { slots?: Slot[] } | null)?.slots ?? []) as Slot[];

      const plannedMap = new Map<string, number>();
      slots.forEach((s) => plannedMap.set(s.activity_name, (plannedMap.get(s.activity_name) ?? 0) + durMin(s.start, s.end)));
      const actualMap = new Map<string, number>();
      let prod = 0, totalM = 0;
      logs.forEach((l) => {
        const m = durMin(l.start_time, l.end_time);
        totalM += m;
        if (l.type === "productive") prod += m;
        const c = l.category_id ? catMap[l.category_id] : null;
        if (c) actualMap.set(c.name, (actualMap.get(c.name) ?? 0) + m);
      });
      const plannedArr = [...plannedMap.entries()].map(([name, minutes]) => ({ name, minutes })).sort((a, b) => b.minutes - a.minutes);
      const actualArr = [...actualMap.entries()].map(([name, minutes]) => ({ name, minutes })).sort((a, b) => b.minutes - a.minutes);
      setPlanned(plannedArr);
      setActual(actualArr);
      setTotal(totalM);
      setRatio(totalM ? Math.round((prod / totalM) * 100) : 0);
      if (reviewRes.data?.insights) {
        setInsights(reviewRes.data.insights as string);
        setExisting(true);
      } else {
        setExisting(false);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, user, weekStart, weekEnd]);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("weekly-review", {
        body: {
          week_start: weekStart,
          planned, actual,
          productive_ratio: ratio,
          total_tracked: total,
        },
      });
      if (error) throw error;
      setInsights((data as { review?: { insights?: string } } | null)?.review?.insights ?? null);
      setExisting(true);
      toast.success("Weekly review saved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not generate review");
    } finally {
      setLoading(false);
    }
  };

  const merged = useMemo(() => {
    const names = new Set<string>([...planned.map((p) => p.name), ...actual.map((a) => a.name)]);
    return [...names].map((name) => ({
      name,
      planned: planned.find((p) => p.name === name)?.minutes ?? 0,
      actual: actual.find((a) => a.name === name)?.minutes ?? 0,
    })).sort((a, b) => (b.planned + b.actual) - (a.planned + a.actual)).slice(0, 8);
  }, [planned, actual]);

  return { loading, insights, ratio, total, existing, merged, generate };
}
