import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, TrendingUp, Target, Sparkles, Activity, BarChart3, NotebookPen, CalendarDays, Lock } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/EmptyState";
import { WeeklyReviewModal } from "@/components/dashboard/WeeklyReviewModal";
import { celebrateIfPersonalBest, getBestRatio } from "@/lib/celebrate";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCategories, useTimeLogsInRange } from "@/lib/dataStore";
import { addDaysISO, durationMinutes as durMin, fmtDuration } from "@/lib/time";
import { fmtWeekRange, weekDays, weekStartISO } from "@/lib/week";
import { toneClasses, type StatTone } from "@/lib/toneClasses";

type AISlot = { day: string; start: string; end: string; activity_id: string; activity_name: string };

const SHORT = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isGuest = !user;
  const [weekStart, setWeekStart] = useState(weekStartISO());
  const [planSlots, setPlanSlots] = useState<AISlot[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewWeek, setReviewWeek] = useState<string>(weekStart);
  const [autoPromptedFor, setAutoPromptedFor] = useState<string | null>(null);

  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const weekEnd = useMemo(() => addDaysISO(weekStart, 6), [weekStart]);

  const { data: logs } = useTimeLogsInRange(weekStart, weekEnd);
  const { data: cats } = useCategories();

  useEffect(() => {
    if (!user) {
      setPlanSlots([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("weekly_plans")
        .select("slots")
        .eq("user_id", user.id)
        .eq("week_start", weekStart)
        .maybeSingle();
      if (cancelled) return;
      setPlanSlots(((data as { slots?: AISlot[] } | null)?.slots ?? []) as AISlot[]);
    })();
    return () => { cancelled = true; };
  }, [user, weekStart]);

  const catMap = useMemo(() => Object.fromEntries(cats.map((c) => [c.id, c])), [cats]);

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

  const daysLogged = useMemo(() => new Set(logs.map((l) => l.date)).size, [logs]);

  const isCurrentWeek = weekStart === weekStartISO();
  useEffect(() => {
    if (!isCurrentWeek) return;
    if (totals.total < 60) return;
    const prevBest = getBestRatio();
    if (celebrateIfPersonalBest(totals.ratio, totals.total)) {
      toast.success(t("dashboard.personalBest", { ratio: totals.ratio }), {
        description: t("dashboard.personalBestDesc", { prev: prevBest }),
        icon: "🎉",
      });
    }
  }, [totals.ratio, totals.total, isCurrentWeek, t]);

  useEffect(() => {
    if (!user || !isCurrentWeek) return;
    const lastWeek = addDaysISO(weekStart, -7);
    if (autoPromptedFor === lastWeek) return;
    const dismissedKey = `freeslot.review.dismissed.${lastWeek}`;
    if (typeof window !== "undefined" && localStorage.getItem(dismissedKey)) return;
    let cancelled = false;
    (async () => {
      const [profileRes, reviewRes] = await Promise.all([
        supabase.from("profiles").select("weekly_review_day").eq("id", user.id).maybeSingle(),
        supabase.from("weekly_reviews").select("id").eq("user_id", user.id).eq("week_start", lastWeek).maybeSingle(),
      ]);
      if (cancelled) return;
      if (reviewRes.data) return;
      const reviewDay = (profileRes.data?.weekly_review_day ?? 0) as number;
      const today = new Date().getDay();
      if (today !== reviewDay) return;
      setAutoPromptedFor(lastWeek);
      toast(t("dashboard.reviewPrompt.title"), {
        description: t("dashboard.reviewPrompt.description"),
        icon: "📝",
        duration: 8000,
        action: {
          label: t("dashboard.reviewPrompt.open"),
          onClick: () => { setReviewWeek(lastWeek); setReviewOpen(true); },
        },
        onDismiss: () => localStorage.setItem(dismissedKey, "1"),
      });
    })();
    return () => { cancelled = true; };
  }, [user, isCurrentWeek, weekStart, autoPromptedFor, t]);

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
      .filter((x): x is { name: string; value: number; color: string; type: "productive" | "unproductive" } => x !== null)
      .sort((a, b) => b.value - a.value);
  }, [logs, catMap]);

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

  const showEmptyState = isGuest
    ? totals.total === 0
    : totals.total === 0 && planSlots.length === 0;

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">{t("dashboard.title")}</div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">{fmtWeekRange(weekStart)}</h1>
          </motion.div>
          <div className="flex items-center gap-1.5">
            {!isGuest && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 mr-1"
                onClick={() => { setReviewWeek(weekStart); setReviewOpen(true); }}
              >
                <NotebookPen className="h-3.5 w-3.5" /> {t("dashboard.reviewWeek")}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDaysISO(weekStart, -7))} aria-label={t("dashboard.prevWeek")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setWeekStart(weekStartISO())}>{t("dashboard.thisWeek")}</Button>
            <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDaysISO(weekStart, 7))} aria-label={t("dashboard.nextWeek")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showEmptyState && (
          <div className="mb-6">
            <EmptyState
              icon={<BarChart3 className="h-5 w-5" />}
              title={t("dashboard.empty.title")}
              description={isGuest ? t("dashboard.empty.descriptionGuest") : t("dashboard.empty.descriptionSignedIn")}
              ctaLabel={t("dashboard.empty.cta")}
              ctaTo="/app"
            />
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Kpi icon={<Activity className="h-4 w-4" />} label={t("dashboard.kpi.totalTracked")} value={fmtDuration(totals.total)} tone="muted" />
          <Kpi icon={<TrendingUp className="h-4 w-4" />} label={t("dashboard.kpi.productive")} value={fmtDuration(totals.prod)} tone="primary" />
          <Kpi icon={<Target className="h-4 w-4" />} label={t("dashboard.kpi.productiveRatio")} value={`${totals.ratio}%`} tone="accent" />
          {isGuest ? (
            <Kpi icon={<CalendarDays className="h-4 w-4" />} label={t("dashboard.kpi.daysLogged")} value={String(daysLogged)} tone="muted" />
          ) : (
            <Kpi icon={<Sparkles className="h-4 w-4" />} label={t("dashboard.kpi.aiSlots")} value={String(planSlots.length)} tone="muted" />
          )}
        </div>

        <Card title={t("dashboard.cards.productiveRatio")}>
          <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
            <span>{fmtDuration(totals.prod)} {t("dashboard.kpi.productive").toLowerCase()}</span>
            <span>·</span>
            <span>{fmtDuration(totals.unprod)} unproductive</span>
          </div>
          <Progress value={totals.ratio} className="h-2" />
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <Card title={t("dashboard.cards.perDay")}>
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

          <Card title={t("dashboard.cards.byCategory")}>
            {catBreakdown.length === 0 ? (
              <Empty message={t("dashboard.cards.noLoggedTime")} />
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

        <div className="mt-4">
          {isGuest ? (
            <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/[0.05] p-4 flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Lock className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{t("dashboard.aiUpsell.title")}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{t("dashboard.aiUpsell.description")}</p>
              </div>
              <Button asChild size="sm" className="gradient-primary shadow-glow">
                <Link to="/auth">{t("dashboard.aiUpsell.cta")}</Link>
              </Button>
            </div>
          ) : (
            <Card title={t("dashboard.cards.planVsLogged")}>
              {planVsActual.length === 0 ? (
                <Empty message={t("dashboard.cards.noPlanCompare")} />
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
          )}
        </div>

        {!isGuest && (
          <WeeklyReviewModal open={reviewOpen} onOpenChange={setReviewOpen} weekStart={reviewWeek} />
        )}
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: StatTone }) {
  const { bg } = toneClasses(tone);
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
