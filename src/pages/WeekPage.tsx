import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays, Sparkles, Zap, CalendarRange } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addDaysISO, fmtDuration, fromMin, isoToWeekday, todayISO } from "@/lib/time";
import { fmtWeekRange, weekDays, weekStartISO } from "@/lib/week";
import { findFreeWindows, totalFreeMinutes, type GapWindow } from "@/lib/gaps";
import { WeekGrid, type DayCellData } from "@/components/week/WeekGrid";
import { QuickLogDialog, type Category } from "@/components/day/QuickLogDialog";
import type { ScheduleBlock, TimeLog } from "@/components/day/DayTimeline";
import { toMin } from "@/lib/time";
import { AIPlanPanel, type WeeklyPlan } from "@/components/week/AIPlanPanel";

const SHORT = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const FULL = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export default function WeekPage() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState<string>(weekStartISO());
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activities, setActivities] = useState<{ id: string; name: string; category_id: string | null }[]>([]);
  const [profile, setProfile] = useState<{ buffer_minutes: number; peak_hours: { start: string; end: string } | null } | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [aiPlan, setAiPlan] = useState<WeeklyPlan | null>(null);
  const [logCtx, setLogCtx] = useState<{ date: string; start: string; end: string }>({
    date: todayISO(), start: "09:00", end: "10:00",
  });

  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const today = todayISO();

  const load = useCallback(async () => {
    if (!user) return;
    const weekEnd = addDaysISO(weekStart, 6);
    const [b, l, c, p, a] = await Promise.all([
      supabase.from("schedule_blocks").select("*").eq("user_id", user.id),
      supabase.from("time_logs").select("*").eq("user_id", user.id).gte("date", weekStart).lte("date", weekEnd),
      supabase.from("categories").select("id,name,color,type").eq("user_id", user.id),
      supabase.from("profiles").select("buffer_minutes,peak_hours").eq("id", user.id).maybeSingle(),
      supabase.from("activities").select("id,name,category_id").eq("user_id", user.id).eq("is_active", true),
    ]);
    setBlocks((b.data ?? []) as ScheduleBlock[]);
    setLogs((l.data ?? []) as TimeLog[]);
    setCategories((c.data ?? []) as Category[]);
    setProfile((p.data ?? null) as any);
    setActivities((a.data ?? []) as any);
  }, [user, weekStart]);

  useEffect(() => { load(); }, [load]);

  const catMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  const dayCells: DayCellData[] = useMemo(() => {
    const buffer = profile?.buffer_minutes ?? 15;
    const peak = profile?.peak_hours ?? null;

    return days.map((iso) => {
      const weekday = isoToWeekday(iso);
      const dayBlocks = blocks.filter((b) => b.days_of_week?.includes(weekday));
      const dayLogs = logs.filter((l) => (l as any).date === iso);

      const gaps: GapWindow[] = findFreeWindows({
        blocks: dayBlocks,
        logs: dayLogs,
        weekday,
        bufferMinutes: buffer,
        minWindowMinutes: 30,
        peakStart: peak?.start,
        peakEnd: peak?.end,
      });

      const blockSegs = dayBlocks.flatMap((b) => {
        const s = toMin(b.start_time);
        const e = toMin(b.end_time);
        const ranges = e > s ? [[s, e]] : [[s, 24*60], [0, e]];
        return ranges.map(([a, c]) => ({
          seg: { startMin: a, endMin: c },
          name: b.name,
          color: b.color,
        }));
      });

      const logSegs = dayLogs.flatMap((l) => {
        const s = toMin(l.start_time);
        const e = toMin(l.end_time);
        const ranges = e > s ? [[s, e]] : [[s, 24*60], [0, e]];
        const cat = l.category_id ? catMap[l.category_id] : undefined;
        const color = cat?.color ?? (l.type === "productive" ? "hsl(var(--productive))" : "hsl(var(--unproductive))");
        return ranges.map(([a, c]) => ({
          seg: { startMin: a, endMin: c },
          name: cat?.name ?? l.type,
          color,
        }));
      });

      const aiSlots = (aiPlan?.slots ?? [])
        .filter((s) => s.day === iso)
        .map((s) => ({
          seg: { startMin: toMin(s.start), endMin: toMin(s.end) },
          name: s.activity_name,
          rationale: s.rationale,
        }));

      return {
        iso,
        weekday,
        label: FULL[(weekday + 6) % 7],
        short: SHORT[(weekday + 6) % 7],
        isToday: iso === today,
        blocks: blockSegs,
        logs: logSegs,
        gaps,
        aiSlots,
        totalFree: totalFreeMinutes(gaps),
      };
    });
  }, [days, blocks, logs, catMap, profile, today, aiPlan]);

  const flatGaps = useMemo(
    () => dayCells.flatMap((d) => d.gaps.map((g) => ({
      day: d.iso, start: fromMin(g.start), end: fromMin(g.end),
      durationMin: g.durationMin, isPeak: g.isPeak,
    }))),
    [dayCells]
  );

  const totalWeekFree = useMemo(
    () => dayCells.reduce((s, d) => s + d.totalFree, 0),
    [dayCells]
  );
  const peakFree = useMemo(
    () => dayCells.reduce((s, d) => s + d.gaps.filter((g) => g.isPeak).reduce((a, g) => a + g.durationMin, 0), 0),
    [dayCells]
  );

  const onGapClick = (iso: string, gap: GapWindow) => {
    setLogCtx({ date: iso, start: fromMin(gap.start), end: fromMin(Math.min(gap.start + 60, gap.end)) });
    setLogOpen(true);
  };
  const onSlotClick = (iso: string, startMin: number) => {
    const snapped = Math.floor(startMin / 30) * 30;
    setLogCtx({ date: iso, start: fromMin(snapped), end: fromMin(snapped + 60) });
    setLogOpen(true);
  };

  return (
    <AppLayout>
      <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Week view</div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">{fmtWeekRange(weekStart)}</h1>
          </motion.div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDaysISO(weekStart, -7))} aria-label="Previous week">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setWeekStart(weekStartISO())} className="gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" /> This week
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDaysISO(weekStart, 7))} aria-label="Next week">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Free-time summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
          <SummaryCard
            icon={<Sparkles className="h-4 w-4" />}
            label="Total free time"
            value={fmtDuration(totalWeekFree)}
            tone="primary"
          />
          <SummaryCard
            icon={<Zap className="h-4 w-4" />}
            label="Peak-hour free"
            value={fmtDuration(peakFree)}
            tone="accent"
          />
          <SummaryCard
            icon={<CalendarDays className="h-4 w-4" />}
            label="Avg per day"
            value={fmtDuration(Math.round(totalWeekFree / 7))}
            tone="muted"
          />
        </div>

        <AIPlanPanel
          weekStart={weekStart}
          gaps={flatGaps}
          activities={activities}
          categories={categories}
          onPlanChange={setAiPlan}
          onSlotAccepted={load}
        />

        <div className="flex items-center gap-3 px-1 mb-2 text-[10px] uppercase tracking-wider text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-primary/40" /> Planned</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-productive" /> Logged</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm border border-dashed border-primary/60 bg-primary/10" /> Free / peak</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm border border-primary/70 bg-primary/20" /> AI suggestion</span>
          <span className="ml-auto">Click a free slot to log it</span>
        </div>

        <WeekGrid days={dayCells} onGapClick={onGapClick} onSlotClick={onSlotClick} />

        <QuickLogDialog
          open={logOpen}
          onOpenChange={setLogOpen}
          date={logCtx.date}
          categories={categories}
          defaultStart={logCtx.start}
          defaultEnd={logCtx.end}
          onSaved={load}
        />
      </div>
    </AppLayout>
  );
}

function SummaryCard({
  icon, label, value, tone,
}: { icon: React.ReactNode; label: string; value: string; tone: "primary" | "accent" | "muted" }) {
  const ring = tone === "primary" ? "ring-primary/30" : tone === "accent" ? "ring-accent/30" : "ring-border";
  const bg = tone === "primary" ? "bg-primary/10 text-primary" : tone === "accent" ? "bg-accent/15 text-accent-foreground" : "bg-muted/50 text-muted-foreground";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-border bg-surface px-4 py-3 ring-1 ${ring}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`h-7 w-7 rounded-lg flex items-center justify-center ${bg}`}>{icon}</span>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
      <div className="font-display text-2xl font-semibold tracking-tight font-mono-num">{value}</div>
    </motion.div>
  );
}
