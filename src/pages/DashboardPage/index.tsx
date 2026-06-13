import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, TrendingUp, Target, Sparkles, Activity, BarChart3, NotebookPen, CalendarDays, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/EmptyState";
import { WeeklyReviewModal } from "@/components/dashboard/WeeklyReviewModal";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { addDaysISO, fmtDuration } from "@/lib/time";
import { fmtWeekRange, weekStartISO } from "@/lib/week";
import { StatCard } from "@/components/StatCard";
import { Surface } from "@/components/Surface";
import { useDashboardStats } from "./useDashboardStats";
import { useWeeklyReviewPrompt } from "./useWeeklyReviewPrompt";

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isGuest = !user;
  const [weekStart, setWeekStart] = useState(weekStartISO());
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewWeek, setReviewWeek] = useState<string>(weekStart);

  const isCurrentWeek = weekStart === weekStartISO();

  const { perDay, totals, daysLogged, catBreakdown, planVsActual, planSlotsCount } = useDashboardStats(weekStart);

  useWeeklyReviewPrompt({
    weekStart,
    isCurrentWeek,
    ratio: totals.ratio,
    total: totals.total,
    user,
    openReview: (week) => { setReviewWeek(week); setReviewOpen(true); },
  });

  const showEmptyState = isGuest
    ? totals.total === 0
    : totals.total === 0 && planSlotsCount === 0;

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
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <StatCard icon={<Activity className="h-4 w-4" />} label={t("dashboard.kpi.totalTracked")} value={fmtDuration(totals.total)} tone="muted" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <StatCard icon={<TrendingUp className="h-4 w-4" />} label={t("dashboard.kpi.productive")} value={fmtDuration(totals.prod)} tone="primary" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <StatCard icon={<Target className="h-4 w-4" />} label={t("dashboard.kpi.productiveRatio")} value={`${totals.ratio}%`} tone="accent" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            {isGuest ? (
              <StatCard icon={<CalendarDays className="h-4 w-4" />} label={t("dashboard.kpi.daysLogged")} value={String(daysLogged)} tone="muted" />
            ) : (
              <StatCard icon={<Sparkles className="h-4 w-4" />} label={t("dashboard.kpi.aiSlots")} value={String(planSlotsCount)} tone="muted" />
            )}
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <Surface padding="md">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{t("dashboard.cards.productiveRatio")}</div>
          <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
            <span>{fmtDuration(totals.prod)} {t("dashboard.kpi.productive").toLowerCase()}</span>
            <span>·</span>
            <span>{fmtDuration(totals.unprod)} unproductive</span>
          </div>
          <Progress value={totals.ratio} className="h-2" />
        </Surface>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <Surface padding="md">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{t("dashboard.cards.perDay")}</div>
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
          </Surface>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <Surface padding="md">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{t("dashboard.cards.byCategory")}</div>
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
          </Surface>
          </motion.div>
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
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <Surface padding="md">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{t("dashboard.cards.planVsLogged")}</div>
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
            </Surface>
            </motion.div>
          )}
        </div>

        {!isGuest && (
          <WeeklyReviewModal open={reviewOpen} onOpenChange={setReviewOpen} weekStart={reviewWeek} />
        )}
    </div>
  );
}


function Empty({ message }: { message: string }) {
  return <div className="text-sm text-muted-foreground py-8 text-center">{message}</div>;
}
