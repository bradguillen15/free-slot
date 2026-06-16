import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarViewHeader } from "@/components/calendar/CalendarViewHeader";
import { CalendarNav } from "@/components/calendar/CalendarNav";
import { useCalendarDays, type DayCellData } from "@/lib/calendarDays";
import { durationMinutes, fmtDuration, todayISO } from "@/lib/time";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/StatCard";

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

const MIN_PER_DAY = 24 * 60;

function MonthDayBar({ cell }: { cell: DayCellData }) {
  return (
    <div className="relative hidden sm:block w-full h-3 rounded-sm overflow-hidden bg-muted/30 mt-0.5">
      {cell.blocks.map((b, i) => (
        <span
          key={`b-${i}`}
          className="absolute top-0 h-full rounded-[1px] opacity-60"
          style={{
            left: `${(b.seg.startMin / MIN_PER_DAY) * 100}%`,
            width: `${Math.max(1, ((b.seg.endMin - b.seg.startMin) / MIN_PER_DAY) * 100)}%`,
            backgroundColor: b.color,
          }}
        />
      ))}
      {cell.logs.map((l, i) => (
        <span
          key={`l-${i}`}
          className="absolute top-0 h-full rounded-[1px]"
          style={{
            left: `${(l.seg.startMin / MIN_PER_DAY) * 100}%`,
            width: `${Math.max(1, ((l.seg.endMin - l.seg.startMin) / MIN_PER_DAY) * 100)}%`,
            backgroundColor: l.color,
          }}
        />
      ))}
    </div>
  );
}

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

  const dayCells = useCalendarDays(firstISO, lastISO);

  const cellMap = useMemo(
    () => Object.fromEntries(dayCells.map((c) => [c.iso, c])),
    [dayCells]
  );

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
    for (const cell of dayCells) {
      let prod = 0, unprod = 0;
      for (const l of cell.logs) {
        const dur = l.seg.endMin - l.seg.startMin;
        if (l.type === "unproductive") unprod += dur;
        else prod += dur;
      }
      if (prod + unprod > 0) {
        m[cell.iso] = { productive: prod, unproductive: unprod, total: prod + unprod };
      }
    }
    return m;
  }, [dayCells]);

  // Fallback total from raw log durations for stat cards (covers overnight wrapping)
  const logTotals = useMemo(() => {
    const m: Record<string, number> = {};
    for (const cell of dayCells) {
      let total = 0;
      // Re-derive from raw logs via durationMinutes (uses time.ts wrap logic)
      for (const _ of cell.logs) { total += _.seg.endMin - _.seg.startMin; }
      if (total > 0) m[cell.iso] = total;
    }
    return m;
  }, [dayCells]);

  const monthTotal = useMemo(
    () => Object.values(logTotals).reduce((s, v) => s + v, 0),
    [logTotals]
  );
  const monthProd = useMemo(
    () => Object.values(perDay).reduce((s, d) => s + d.productive, 0),
    [perDay]
  );
  const daysLogged = useMemo(
    () => Object.values(logTotals).filter((v) => v > 0).length,
    [logTotals]
  );
  const maxDay = useMemo(
    () => Math.max(60, ...Object.values(logTotals)),
    [logTotals]
  );

  const shift = (delta: number) => {
    const next = new Date(year, month0 + delta, 1);
    setYearMonth(ym(next.getFullYear(), next.getMonth()));
  };

  return (
    <>
      <CalendarViewHeader
        testId="page-month"
        label="Month view"
        title={`${MONTHS[month0]} ${year}`}
        actions={
          <CalendarNav
            onToday={() => setYearMonth(today.slice(0, 7))}
            onPrev={() => shift(-1)}
            onNext={() => shift(1)}
            prevLabel="Previous month"
            nextLabel="Next month"
          />
        }
      />

      <div className="grid grid-cols-2 gap-3 mb-5 sm:grid-cols-3">
        <StatCard label="Total logged" value={fmtDuration(monthTotal)} tone="primary" />
        <StatCard label="Productive" value={fmtDuration(monthProd)} tone="accent" />
        <StatCard label="Days logged" value={`${daysLogged} / ${lastDay}`} tone="muted" />
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
              return <div key={`blank-${i}`} className="min-h-[72px] rounded-xl bg-muted/20 sm:min-h-[90px]" />;
            }
            const cell = cellMap[c.iso];
            const dayTotal = logTotals[c.iso] ?? 0;
            const intensity = dayTotal > 0 ? Math.min(1, dayTotal / maxDay) : 0;
            const isToday = c.iso === today;
            return (
              <Link
                key={c.iso}
                to={`/app?date=${c.iso}`}
                aria-label={`Open day view for ${c.iso}`}
                className={cn(
                  "relative flex min-h-[72px] flex-col overflow-hidden rounded-xl border border-border bg-surface p-1 transition-colors hover:border-primary/40 sm:min-h-[90px]",
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
                  <span
                    className={cn(
                      "font-display text-sm font-semibold leading-none",
                      isToday && "text-primary"
                    )}
                  >
                    {c.day}
                  </span>
                  {dayTotal > 0 && (
                    <span className="text-[8px] font-mono-num text-muted-foreground sm:text-[9px]">
                      {fmtDuration(dayTotal)}
                    </span>
                  )}
                </div>
                {cell && <MonthDayBar cell={cell} />}
              </Link>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-primary/40" /> Planned</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-productive" /> Logged</span>
          <span className="ml-auto">Tap a cell to open that day</span>
        </div>
      </div>
    </>
  );
}
