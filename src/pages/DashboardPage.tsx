import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, TrendingUp, Target, Sparkles, Activity, BarChart3, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { WeeklyReviewModal } from "@/components/dashboard/WeeklyReviewModal";
import { celebrateIfPersonalBest, getBestRatio } from "@/lib/celebrate";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addDaysISO, fmtDuration, toMin } from "@/lib/time";
import { fmtWeekRange, weekDays, weekStartISO } from "@/lib/week";

type LogRow = {
  date: string;
  start_time: string;
  end_time: string;
  type: "productive" | "unproductive";
  category_id: string | null;
};
type Cat = { id: string; name: string; color: string; type: "productive" | "unproductive" };
type AISlot = { day: string; start: string; end: string; activity_id: string; activity_name: string };
type Activity = { id: string; name: string };

function durMin(s: string, e: string) {
  const a = toMin(s); const b = toMin(e);
  return b > a ? b - a : (24 * 60 - a) + b;
}

const SHORT = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export default function DashboardPage() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(weekStartISO());
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [planSlots, setPlanSlots] = useState<AISlot[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewWeek, setReviewWeek] = useState<string>(weekStart);
  const [autoPromptedFor, setAutoPromptedFor] = useState<string | null>(null);

  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const weekEnd = useMemo(() => addDaysISO(weekStart, 6), [weekStart]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [l, c, p, a] = await Promise.all([
        supabase.from("time_logs").select("date,start_time,end_time,type,category_id")
          .eq("user_id", user.id).gte("date", weekStart).lte("date", weekEnd),
        supabase.from("categories").select("id,name,color,type").eq("user_id", user.id),
        supabase.from("weekly_plans").select("slots").eq("user_id", user.id).eq("week_start", weekStart).maybeSingle(),
        supabase.from("activities").select("id,name").eq("user_id", user.id),
      ]);
      setLogs((l.data ?? []) as LogRow[]);
      setCats((c.data ?? []) as Cat[]);
      setPlanSlots(((p.data as any)?.slots ?? []) as AISlot[]);
      setActivities((a.data ?? []) as Activity[]);
    })();
  }, [user, weekStart, weekEnd]);

  const catMap = useMemo(() => Object.fromEntries(cats.map((c) => [c.id, c])), [cats]);

  // Per-day stacked productive vs unproductive
  const perDay = useMemo(() => {
    return days.map((iso, i) => {
      const dayLogs = logs.filter((l) => l.date === iso);
      let prod = 0, unprod = 0;
      for (const log of dayLogs) {
        const m = durMin(log.start_time, log.end_time);
        if (log.type === "productive") prod += m; else unprod += m;
      }
      return { day: SHORT[i], iso, productive: Math.round(prod), unproductive: Math.round(unprod) };
    });
  }, [days, logs]);

  const totals = useMemo(() => {
    const prod = perDay.reduce((s, d) => s + d.productive, 0);
    const unprod = perDay.reduce((s, d) => s + d.unproductive, 0);
    const total = prod + unprod;
    return { prod, unprod, total, ratio: total ? Math.round((prod / total) * 100) : 0 };
  }, [perDay]);

  // Celebrate when productive ratio sets a new personal best (current week only)
  const isCurrentWeek = weekStart === weekStartISO();
  useEffect(() => {
    if (!isCurrentWeek) return;
    if (totals.total < 60) return;
    const prevBest = getBestRatio();
    if (celebrateIfPersonalBest(totals.ratio, totals.total)) {
      toast.success(`New personal best — ${totals.ratio}% productive!`, {
        description: `Previous best: ${prevBest}%. Keep it up.`,
        icon: "🎉",
      });
    }
  }, [totals.ratio, totals.total, isCurrentWeek]);

  // Auto-prompt review for last week if it's the configured review day and not yet reviewed
  useEffect(() => {
    if (!user || !isCurrentWeek) return;
    const lastWeek = addDaysISO(weekStart, -7);
    if (autoPromptedFor === lastWeek) return;
    const dismissedKey = `freeslot.review.dismissed.${lastWeek}`;
    if (typeof window !== "undefined" && localStorage.getItem(dismissedKey)) return;
    (async () => {
      const [profileRes, reviewRes] = await Promise.all([
        supabase.from("profiles").select("weekly_review_day").eq("id", user.id).maybeSingle(),
        supabase.from("weekly_reviews").select("id").eq("user_id", user.id).eq("week_start", lastWeek).maybeSingle(),
      ]);
      if (reviewRes.data) return; // already reviewed
      const reviewDay = (profileRes.data?.weekly_review_day ?? 0) as number; // 0=Sun
      const today = new Date().getDay();
      if (today !== reviewDay) return;
      setAutoPromptedFor(lastWeek);
      toast("Time for your weekly review", {
        description: "Reflect on last week and let AI summarize it for you.",
        icon: "📝",
        duration: 8000,
        action: {
          label: "Open",
          onClick: () => { setReviewWeek(lastWeek); setReviewOpen(true); },
        },
        onDismiss: () => localStorage.setItem(dismissedKey, "1"),
      });
    })();
  }, [user, isCurrentWeek, weekStart, autoPromptedFor]);

  // Category breakdown (top categories by minutes)
  const catBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of logs) {
      if (!log.category_id) continue;
      map.set(log.category_id, (map.get(log.category_id) ?? 0) + durMin(log.start_time, log.end_time));
    }
    return [...map.entries()]
      .map(([id, mins]) => {
        const c = catMap[id];
        return c ? { name: c.name, value: mins, color: c.color, type: c.type } : null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.value - a.value) as { name: string; value: number; color: string; type: string }[];
  }, [logs, catMap]);

  // Plan vs actual: AI-planned minutes per activity vs logged minutes (matched by activity name → category name fallback)
  const planVsActual = useMemo(() => {
    const planned = new Map<string, number>();
    for (const s of planSlots) {
      planned.set(s.activity_name, (planned.get(s.activity_name) ?? 0) + durMin(s.start, s.end));
    }
    const actualByCatName = new Map<string, number>();
    for (const log of logs) {
      const c = log.category_id ? catMap[log.category_id] : null;
      if (!c) continue;
      actualByCatName.set(c.name, (actualByCatName.get(c.name) ?? 0) + durMin(log.start_time, log.end_time));
    }
    const names = new Set([...planned.keys(), ...actualByCatName.keys()]);
    return [...names].map((name) => ({
      name,
      planned: Math.round(planned.get(name) ?? 0),
      actual: Math.round(actualByCatName.get(name) ?? 0),
    })).sort((a, b) => (b.planned + b.actual) - (a.planned + a.actual)).slice(0, 8);
  }, [planSlots, logs, catMap]);

  return (
    <AppLayout>
      <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Dashboard</div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">{fmtWeekRange(weekStart)}</h1>
          </motion.div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 mr-1"
              onClick={() => { setReviewWeek(weekStart); setReviewOpen(true); }}
            >
              <NotebookPen className="h-3.5 w-3.5" /> Review week
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDaysISO(weekStart, -7))} aria-label="Previous week">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setWeekStart(weekStartISO())}>This week</Button>
            <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDaysISO(weekStart, 7))} aria-label="Next week">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {totals.total === 0 && planSlots.length === 0 && (
          <div className="mb-6">
            <EmptyState
              icon={<BarChart3 className="h-5 w-5" />}
              title="Your dashboard is waiting for its first data point"
              description="Log a few sessions on the Day view, or generate an AI weekly plan, and your charts will come alive here."
              ctaLabel="Go to Day view"
              ctaTo="/app"
            />
          </div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Kpi icon={<Activity className="h-4 w-4" />} label="Total tracked" value={fmtDuration(totals.total)} tone="muted" />
          <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Productive" value={fmtDuration(totals.prod)} tone="primary" />
          <Kpi icon={<Target className="h-4 w-4" />} label="Productive ratio" value={`${totals.ratio}%`} tone="accent" />
          <Kpi icon={<Sparkles className="h-4 w-4" />} label="AI slots" value={String(planSlots.length)} tone="muted" />
        </div>

        {/* Productive ratio bar */}
        <Card title="Productive ratio">
          <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
            <span>{fmtDuration(totals.prod)} productive</span>
            <span>·</span>
            <span>{fmtDuration(totals.unprod)} unproductive</span>
          </div>
          <Progress value={totals.ratio} className="h-2" />
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {/* Per day chart */}
          <Card title="Productive vs unproductive per day">
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={perDay} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${Math.round(v / 60)}h`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => fmtDuration(v)}
                  />
                  <Bar dataKey="productive" stackId="a" fill="hsl(var(--productive))" radius={[4,4,0,0]} />
                  <Bar dataKey="unproductive" stackId="a" fill="hsl(var(--unproductive))" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Category breakdown pie */}
          <Card title="Time by category">
            {catBreakdown.length === 0 ? (
              <Empty message="No logged time yet this week." />
            ) : (
              <div className="grid grid-cols-[1fr_1.2fr] gap-4 items-center">
                <div className="h-56">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={catBreakdown} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                        {catBreakdown.map((c, i) => <Cell key={i} fill={c.color} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                        formatter={(v: number) => fmtDuration(v)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {catBreakdown.map((c) => (
                    <li key={c.name} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 truncate">
                        <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: c.color }} />
                        <span className="truncate">{c.name}</span>
                      </span>
                      <span className="font-mono-num text-muted-foreground">{fmtDuration(c.value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>

        {/* Plan vs actual */}
        <div className="mt-4">
          <Card title="AI plan vs logged">
            {planVsActual.length === 0 ? (
              <Empty message="Generate a weekly AI plan and log time to compare." />
            ) : (
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={planVsActual} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${Math.round(v / 60)}h`} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => fmtDuration(v)}
                    />
                    <Bar dataKey="planned" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                    <Bar dataKey="actual" fill="hsl(var(--productive))" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "primary" | "accent" | "muted" }) {
  const bg = tone === "primary" ? "bg-primary/10 text-primary" : tone === "accent" ? "bg-accent/15 text-accent-foreground" : "bg-muted/50 text-muted-foreground";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={`h-7 w-7 rounded-lg flex items-center justify-center ${bg}`}>{icon}</span>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
      <div className="font-display text-2xl font-semibold tracking-tight font-mono-num">{value}</div>
    </motion.div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{title}</div>
      {children}
    </motion.div>
  );
}

function Empty({ message }: { message: string }) {
  return <div className="text-sm text-muted-foreground py-8 text-center">{message}</div>;
}
