import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addDaysISO, durationMinutes as durMin, fmtDuration } from "@/lib/time";
import { fmtWeekRange } from "@/lib/week";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  weekStart: string;
};

type Cat = { id: string; name: string; color: string };
type LogRow = { date: string; start_time: string; end_time: string; category_id: string | null };
type Slot = { activity_name: string; start: string; end: string };

export function WeeklyReviewModal({ open, onOpenChange, weekStart }: Props) {
  const { user } = useAuth();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Weekly review
          </DialogTitle>
          <DialogDescription>{fmtWeekRange(weekStart)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Tracked" value={fmtDuration(total)} />
            <Stat label="Productive" value={`${ratio}%`} />
            <Stat label="Activities" value={String(merged.length)} />
          </div>

          {merged.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Plan vs actual
              </div>
              <ul className="space-y-2">
                {merged.map((m) => {
                  const max = Math.max(m.planned, m.actual, 1);
                  return (
                    <li key={m.name} className="text-xs">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="truncate">{m.name}</span>
                        <span className="font-mono-num text-muted-foreground">
                          {fmtDuration(m.actual)} / {fmtDuration(m.planned)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden flex gap-px">
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${(m.planned / max) * 50}%` }}
                          className="bg-primary/60 h-full"
                        />
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${(m.actual / max) * 50}%` }}
                          className="bg-productive h-full"
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-border bg-surface p-3 min-h-[88px]">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> AI reflection
            </div>
            {insights ? (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm leading-relaxed">
                {insights}
              </motion.p>
            ) : loading ? (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                Generate a thoughtful summary of what worked and what to try next week.
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={generate} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : existing ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            {existing ? "Regenerate" : "Generate review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-lg font-semibold font-mono-num">{value}</div>
    </div>
  );
}
