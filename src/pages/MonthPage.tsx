import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarViewHeader } from "@/components/calendar/CalendarViewHeader";
import { CalendarNav } from "@/components/calendar/CalendarNav";
import { useCalendarDays, type DayCellData } from "@/lib/calendarDays";
import { fmtDuration, fromMin, todayISO } from "@/lib/time";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/StatCard";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function ym(year: number, month0: number) {
  return `${year}-${pad(month0 + 1)}`;
}
function isoDate(year: number, month0: number, day: number) {
  return `${year}-${pad(month0 + 1)}-${pad(day)}`;
}
const MIN_PER_DAY = 24 * 60;

function MonthDayStrip({ cell }: { cell: DayCellData }) {
  return (
    <div className="absolute left-1 right-1 top-[22px] bottom-1 rounded-sm overflow-hidden bg-muted/20">
      {cell.blocks.map((b, i) => (
        <Tooltip key={`b-${i}`}>
          <TooltipTrigger asChild>
            <span
              className="absolute left-0 w-full rounded-[1px] opacity-50"
              style={{
                top: `${(b.seg.startMin / MIN_PER_DAY) * 100}%`,
                height: `max(3px, ${((b.seg.endMin - b.seg.startMin) / MIN_PER_DAY) * 100}%)`,
                backgroundColor: b.color,
              }}
            />
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-surface border-border">
            <div className="text-xs font-medium">{b.name}</div>
            <div className="text-[10px] text-muted-foreground font-mono-num">
              {fromMin(b.seg.startMin)} – {fromMin(b.seg.endMin)}
            </div>
          </TooltipContent>
        </Tooltip>
      ))}
      {cell.logs.map((l, i) => (
        <Tooltip key={`l-${i}`}>
          <TooltipTrigger asChild>
            <span
              className="absolute left-0 w-full rounded-[1px] opacity-90"
              style={{
                top: `${(l.seg.startMin / MIN_PER_DAY) * 100}%`,
                height: `max(3px, ${((l.seg.endMin - l.seg.startMin) / MIN_PER_DAY) * 100}%)`,
                backgroundColor: l.color,
              }}
            />
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-surface border-border">
            <div className="text-xs font-medium">{l.name}</div>
            <div className="text-[10px] text-muted-foreground font-mono-num">
              {fromMin(l.seg.startMin)} – {fromMin(l.seg.endMin)}
            </div>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

export default function MonthPage() {
  const { t } = useTranslation();
  const monthNames = t("month.monthNames", { returnObjects: true }) as string[];
  const weekdayShort = t("month.weekdayShort", { returnObjects: true }) as string[];
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

  const firstWeekday = new Date(year, month0, 1).getDay();
  const leading = (firstWeekday + 6) % 7;
  const cells = useMemo(() => {
    const arr: { iso?: string; day?: number }[] = [];
    for (let i = 0; i < leading; i++) arr.push({});
    for (let d = 1; d <= lastDay; d++) arr.push({ iso: isoDate(year, month0, d), day: d });
    while (arr.length % 7 !== 0) arr.push({});
    return arr;
  }, [leading, lastDay, year, month0]);

  const logTotals = useMemo(() => {
    const m: Record<string, number> = {};
    for (const cell of dayCells) {
      let total = 0;
      for (const l of cell.logs) { total += l.seg.endMin - l.seg.startMin; }
      if (total > 0) m[cell.iso] = total;
    }
    return m;
  }, [dayCells]);

  const monthTotal = useMemo(
    () => Object.values(logTotals).reduce((s, v) => s + v, 0),
    [logTotals]
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
    <TooltipProvider delayDuration={300}>
      <CalendarViewHeader
        testId="page-month"
        label={t("calendar.monthView")}
        title={`${monthNames[month0]} ${year}`}
        actions={
          <CalendarNav
            onToday={() => setYearMonth(today.slice(0, 7))}
            onPrev={() => shift(-1)}
            onNext={() => shift(1)}
            todayLabel={t("calendar.today")}
            prevLabel={t("calendar.prevMonth")}
            nextLabel={t("calendar.nextMonth")}
          />
        }
      />

      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard label={t("month.totalLogged")} value={fmtDuration(monthTotal)} tone="primary" />
        <StatCard label={t("month.daysLogged")} value={`${daysLogged} / ${lastDay}`} tone="muted" />
      </div>

      <div>
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {weekdayShort.map((d) => (
            <div key={d} className="text-center text-[10px] uppercase tracking-wider text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((c, i) => {
            if (!c.iso) {
              return <div key={`blank-${i}`} className="aspect-square rounded-xl bg-muted/20" />;
            }
            const cell = cellMap[c.iso];
            const dayTotal = logTotals[c.iso] ?? 0;
            const intensity = dayTotal > 0 ? Math.min(1, dayTotal / maxDay) : 0;
            const isToday = c.iso === today;

            return (
              <Link
                key={c.iso}
                to={`/app?date=${c.iso}`}
                aria-label={t("calendar.openDayView", { label: c.iso })}
                className={cn(
                  "relative flex aspect-square flex-col overflow-visible rounded-xl border p-1 transition-colors hover:border-primary/40",
                  isToday
                    ? "border-primary ring-1 ring-primary/40 bg-primary/[0.06]"
                    : "border-border bg-surface"
                )}
              >
                {intensity > 0 && (
                  <span
                    className="absolute inset-0 -z-10 rounded-xl gradient-primary"
                    style={{ opacity: 0.06 + intensity * 0.18 }}
                  />
                )}
                <div className="flex shrink-0 items-start justify-between gap-0.5 z-10">
                  <span
                    className={cn(
                      "font-display text-[11px] font-semibold leading-none",
                      isToday && "text-primary"
                    )}
                  >
                    {c.day}
                  </span>
                  {dayTotal > 0 && (
                    <span className="text-[8px] font-mono-num text-muted-foreground hidden sm:block">
                      {fmtDuration(dayTotal)}
                    </span>
                  )}
                </div>
                {/* Strip is clipped to the cell via overflow-hidden on the inner container */}
                {cell && (
                  <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                    <MonthDayStrip cell={cell} />
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        <div className="mt-4 text-right text-[10px] uppercase tracking-wider text-muted-foreground">
          {t("calendar.tapCellToOpen")}
        </div>
      </div>
    </TooltipProvider>
  );
}
