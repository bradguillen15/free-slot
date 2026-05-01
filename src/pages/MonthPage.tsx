import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useCategories, useTimeLogsInRange } from "@/lib/dataStore";
import { fmtDuration, todayISO, toMin } from "@/lib/time";
import { cn } from "@/lib/utils";

function pad(n: number) { return String(n).padStart(2, "0"); }
function ym(year: number, month0: number) { return `${year}-${pad(month0 + 1)}`; }
function isoDate(year: number, month0: number, day: number) {
  return `${year}-${pad(month0 + 1)}-${pad(day)}`;
}
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAY_SHORT = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export default function MonthPage() {
  const today = todayISO();
  const [yearMonth, setYearMonth] = useState<string>(today.slice(0, 7));
  const [year, month0] = useMemo(() => {
    const [y, m] = yearMonth.split("-").map(Number);
    return [y, m - 1] as const;
  }, [yearMonth]);

  const firstISO = isoDate(year, month0, 1);
  const lastDay = new Date(year, month0 + 1, 0).getDate();
  const lastISO = isoDate(year, month0, lastDay);

  const { data: logsRaw } = useTimeLogsInRange(firstISO, lastISO);
  const { data: categoriesRaw } = useCategories();
  const catMap = useMemo(
    () => Object.fromEntries((categoriesRaw ?? []).map((c: any) => [c.id, c])),
    [categoriesRaw]
  );

  // Build leading blanks so the grid starts on Monday
  const firstWeekday = new Date(year, month0, 1).getDay(); // 0=Sun..6=Sat
  const leading = (firstWeekday + 6) % 7; // Mon=0
  const cells = useMemo(() => {
    const arr: { iso?: string; day?: number }[] = [];
    for (let i = 0; i < leading; i++) arr.push({});
    for (let d = 1; d <= lastDay; d++) arr.push({ iso: isoDate(year, month0, d), day: d });
    while (arr.length % 7 !== 0) arr.push({});
    return arr;
  }, [leading, lastDay, year, month0]);

  // Aggregate per day
  const perDay = useMemo(() => {
    const m: Record<string, { productive: number; unproductive: number; total: number }> = {};
    for (const log of logsRaw ?? []) {
      const l: any = log;
      const dur = Math.max(0, toMin(l.end_time) - toMin(l.start_time));
      if (!m[l.date]) m[l.date] = { productive: 0, unproductive: 0, total: 0 };
      const cat = l.category_id ? catMap[l.category_id] : undefined;
      const t = (cat?.type ?? l.type) as "productive" | "unproductive";
      m[l.date][t] += dur;
      m[l.date].total += dur;
    }
    return m;
  }, [logsRaw, catMap]);

  const monthTotal = useMemo(
    () => Object.values(perDay).reduce((s, d) => s + d.total, 0),
    [perDay]
  );
  const monthProd = useMemo(
    () => Object.values(perDay).reduce((s, d) => s + d.productive, 0),
    [perDay]
  );
  const daysLogged = useMemo(
    () => Object.values(perDay).filter((d) => d.total > 0).length,
    [perDay]
  );
  const maxDay = useMemo(
    () => Math.max(60, ...Object.values(perDay).map((d) => d.total)),
    [perDay]
  );

  const shift = (delta: number) => {
    const next = new Date(year, month0 + delta, 1);
    setYearMonth(ym(next.getFullYear(), next.getMonth()));
  };

  return (
    <AppLayout>
      <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex justify-center md:justify-start">
            <ViewSwitcher />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Month view</div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                {MONTHS[month0]} {year}
              </h1>
            </motion.div>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setYearMonth(today.slice(0, 7))}
                className="gap-1.5"
              >
                <CalendarDays className="h-3.5 w-3.5" /> This month
              </Button>
              <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <Stat label="Total logged" value={fmtDuration(monthTotal)} tone="primary" />
          <Stat label="Productive" value={fmtDuration(monthProd)} tone="accent" />
          <Stat label="Days logged" value={`${daysLogged} / ${lastDay}`} tone="muted" />
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {WEEKDAY_SHORT.map((d) => (
            <div key={d} className="text-center text-[10px] uppercase tracking-wider text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((c, i) => {
            if (!c.iso) {
              return <div key={`blank-${i}`} className="aspect-square rounded-xl bg-muted/20" />;
            }
            const data = perDay[c.iso];
            const intensity = data ? Math.min(1, data.total / maxDay) : 0;
            const isToday = c.iso === today;
            return (
              <Link
                key={c.iso}
                to={`/app?date=${c.iso}`}
                className={cn(
                  "relative aspect-square rounded-xl border border-border bg-surface p-1.5 sm:p-2 flex flex-col overflow-hidden transition-colors hover:border-primary/40",
                  isToday && "border-primary ring-1 ring-primary/40"
                )}
              >
                {intensity > 0 && (
                  <span
                    className="absolute inset-0 -z-10 gradient-primary"
                    style={{ opacity: 0.06 + intensity * 0.18 }}
                  />
                )}
                <div className="flex items-start justify-between gap-1">
                  <span className={cn("font-display text-sm sm:text-base font-semibold", isToday && "text-primary")}>
                    {c.day}
                  </span>
                  {data && data.total > 0 && (
                    <span className="text-[9px] sm:text-[10px] font-mono-num text-muted-foreground">
                      {fmtDuration(data.total)}
                    </span>
                  )}
                </div>
                <div className="mt-auto flex items-center gap-1">
                  {data?.productive ? (
                    <span
                      className="h-1 rounded-full bg-productive"
                      style={{ width: `${Math.max(8, (data.productive / maxDay) * 100)}%` }}
                    />
                  ) : null}
                  {data?.unproductive ? (
                    <span
                      className="h-1 rounded-full bg-unproductive"
                      style={{ width: `${Math.max(8, (data.unproductive / maxDay) * 100)}%` }}
                    />
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-productive" /> Productive</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-unproductive" /> Unproductive</span>
          <span className="ml-auto">Tap a day to open it</span>
        </div>
      </div>
    </AppLayout>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "primary" | "accent" | "muted" }) {
  const ring = tone === "primary" ? "ring-primary/30" : tone === "accent" ? "ring-accent/30" : "ring-border";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-border bg-surface px-4 py-3 ring-1 ${ring}`}
    >
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="font-display text-2xl font-semibold tracking-tight font-mono-num">{value}</div>
    </motion.div>
  );
}
