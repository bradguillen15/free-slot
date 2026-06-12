import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarViewHeader } from "@/components/calendar/CalendarViewHeader";
import { QuickLogDialog, type Category } from "@/components/day/QuickLogDialog";
import { useVisibleCategories, pickerCategories, useTimeLogsInRange } from "@/lib/dataStore";
import { durationMinutes, fmtDuration, fromMin, todayISO } from "@/lib/time";
import { cn } from "@/lib/utils";
import { toneClasses, type StatTone } from "@/lib/toneClasses";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function ym(year: number, month0: number) {
  return `${year}-${pad(month0 + 1)}`;
}
function isoDate(year: number, month0: number, day: number) {
  return `${year}-${pad(month0 + 1)}-${pad(day)}`;
}
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Six-hour slices of the day (minutes from midnight). Click opens quick log with that window. */
const SIX_HOUR_MIN = 6 * 60;
const DAY_QUARTERS: { startMin: number; label: string }[] = [
  { startMin: 0, label: "12–6a" },
  { startMin: 360, label: "6a–12p" },
  { startMin: 720, label: "12p–6p" },
  { startMin: 1080, label: "6p–12a" },
];

export default function MonthPage() {
  const today = todayISO();
  const [yearMonth, setYearMonth] = useState<string>(today.slice(0, 7));
  const [logOpen, setLogOpen] = useState(false);
  const [logDate, setLogDate] = useState(today);
  const [logDefaults, setLogDefaults] = useState<{ start: string; end: string }>({
    start: "09:00",
    end: "10:00",
  });

  const [year, month0] = useMemo(() => {
    const [y, m] = yearMonth.split("-").map(Number);
    return [y, m - 1] as const;
  }, [yearMonth]);

  const firstISO = isoDate(year, month0, 1);
  const lastDay = new Date(year, month0 + 1, 0).getDate();
  const lastISO = isoDate(year, month0, lastDay);

  const { data: logsRaw, refresh: refreshLogs } = useTimeLogsInRange(firstISO, lastISO);
  const { data: visibleCategoriesRaw, all: allCategoriesRaw, refresh: refreshCats } = useVisibleCategories();
  const logPickerCategories = useMemo(
    () => pickerCategories(
      (visibleCategoriesRaw ?? []) as unknown as Category[],
      (allCategoriesRaw ?? []) as unknown as Category[],
      undefined
    ),
    [visibleCategoriesRaw, allCategoriesRaw]
  );
  const openQuickLogForQuarter = useCallback((iso: string, quarterStartMin: number) => {
    const quarterEndMin = quarterStartMin + SIX_HOUR_MIN;
    const defaultEndMin = Math.min(quarterStartMin + 60, quarterEndMin);
    setLogDate(iso);
    setLogDefaults({
      start: fromMin(quarterStartMin),
      end: fromMin(defaultEndMin),
    });
    setLogOpen(true);
  }, []);

  // Build leading blanks so the grid starts on Monday
  const firstWeekday = new Date(year, month0, 1).getDay();
  const leading = (firstWeekday + 6) % 7;
  const cells = useMemo(() => {
    const arr: { iso?: string; day?: number }[] = [];
    for (let i = 0; i < leading; i++) arr.push({});
    for (let d = 1; d <= lastDay; d++) arr.push({ iso: isoDate(year, month0, d), day: d });
    while (arr.length % 7 !== 0) arr.push({});
    return arr;
  }, [leading, lastDay, year, month0]);

  const perDay = useMemo(() => {
    const m: Record<string, { productive: number; unproductive: number; total: number }> = {};
    for (const log of logsRaw ?? []) {
      const l = log as { date: string; end_time: string; start_time: string; category_id: string | null; type: string };
      // Same conventions as Dashboard/DaySummary: overnight logs wrap past
      // midnight, and the log's STORED type wins over the category's current type.
      const dur = durationMinutes(l.start_time, l.end_time);
      if (!m[l.date]) m[l.date] = { productive: 0, unproductive: 0, total: 0 };
      const t = l.type as "productive" | "unproductive";
      m[l.date][t] += dur;
      m[l.date].total += dur;
    }
    return m;
  }, [logsRaw]);

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
    <>
      <CalendarViewHeader
        label="Month view"
        title={`${MONTHS[month0]} ${year}`}
        actions={
          <>
            <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setYearMonth(today.slice(0, 7))} className="gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" /> This month
            </Button>
            <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-3 gap-3 mb-5">
          <Stat label="Total logged" value={fmtDuration(monthTotal)} tone="primary" />
          <Stat label="Productive" value={fmtDuration(monthProd)} tone="accent" />
          <Stat label="Days logged" value={`${daysLogged} / ${lastDay}`} tone="muted" />
        </div>

        <div>
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {WEEKDAY_SHORT.map((d) => (
              <div key={d} className="text-center text-[10px] uppercase tracking-wider text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((c, i) => {
              if (!c.iso) {
                return <div key={`blank-${i}`} className="min-h-[130px] rounded-xl bg-muted/20 sm:min-h-[140px]" />;
              }
              const data = perDay[c.iso];
              const intensity = data ? Math.min(1, data.total / maxDay) : 0;
              const isToday = c.iso === today;
              return (
                <div
                  key={c.iso}
                  className={cn(
                    "relative flex min-h-[130px] flex-col gap-1 overflow-hidden rounded-xl border border-border bg-surface p-1 sm:min-h-[140px]",
                    isToday && "border-primary ring-1 ring-primary/40"
                  )}
                >
                  {intensity > 0 && (
                    <span
                      className="absolute inset-0 -z-10 rounded-xl gradient-primary"
                      style={{ opacity: 0.06 + intensity * 0.18 }}
                    />
                  )}
                  <div className="flex shrink-0 items-start justify-between gap-0.5">
                    <Link
                      to={`/app?date=${c.iso}`}
                      className={cn(
                        "font-display text-sm font-semibold leading-none rounded hover:text-primary transition-colors",
                        isToday && "text-primary"
                      )}
                      aria-label={`Open day view for ${c.iso}`}
                    >
                      {c.day}
                    </Link>
                    {data && data.total > 0 && (
                      <span className="text-[8px] font-mono-num text-muted-foreground sm:text-[9px]">
                        {fmtDuration(data.total)}
                      </span>
                    )}
                  </div>
                  <div className="grid min-h-0 flex-1 grid-rows-4 gap-px">
                    {DAY_QUARTERS.map((q) => (
                      <button
                        key={q.startMin}
                        type="button"
                        onClick={() => openQuickLogForQuarter(c.iso!, q.startMin)}
                        className="rounded-md bg-muted/25 px-0.5 text-[7px] font-mono-num leading-tight text-muted-foreground transition-colors hover:bg-primary/15 hover:text-foreground sm:text-[8px]"
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-productive" /> Productive</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-unproductive" /> Unproductive</span>
            <span className="ml-auto">Tap day number for day view · tap a 6h block to quick-log</span>
          </div>
        </div>

      <QuickLogDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        date={logDate}
        categories={logPickerCategories}
        defaultStart={logDefaults.start}
        defaultEnd={logDefaults.end}
        onOptimisticInsert={() => {}}
        onSaved={refreshLogs}
        onCategoriesRefresh={refreshCats}
      />
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: StatTone }) {
  const { ring } = toneClasses(tone);
  return (
    <div className={`rounded-2xl border border-border bg-surface px-4 py-3 ring-1 ${ring}`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="font-display text-2xl font-semibold tracking-tight font-mono-num">{value}</div>
    </div>
  );
}
