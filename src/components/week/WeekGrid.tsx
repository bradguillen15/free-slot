import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTimelineLogDrag } from "@/hooks/useTimelineLogDrag";
import { TimelineLogMobileDragHandle } from "@/components/calendar/TimelineLogMobileDragHandle";
import { cn } from "@/lib/utils";
import { MIN_PER_DAY, fmtDisplayTime, fmtDisplayTimeFromMin, fmtDuration } from "@/lib/time";
import { useTimeFormat } from "@/hooks/useTimeFormat";
import { computeLaneLayout } from "@/lib/daySegments";
import { Surface } from "@/components/Surface";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  barHeightFromDuration,
  timelineLogFillLayerClassName,
  timelinePlannedFillLayerClassName,
  timelineLabelRowClassName,
  timelineLogBarClassName,
  timelineLogLabelClassName,
  timelinePlannedBarClassName,
  timelinePlannedLabelClassName,
} from "@/lib/timelineBarStyles";
import type { GapWindow } from "@/lib/gaps";

const PX_PER_HOUR = 40;
const HOURS_START = 0;
const HOURS_END = 24;
const TOTAL_HOURS = HOURS_END - HOURS_START;
const TOTAL_HEIGHT = TOTAL_HOURS * PX_PER_HOUR;
const SNAP_MIN = 15;
const DRAG_CANCEL_PX = 4;
const HOUR_RAIL_PX = 48;
/** Desktop week grid min width (48px rail + 7 × ~96px columns). */
export const WEEK_GRID_MIN_WIDTH_PX = 720;
/** Mobile day columns are 20px wider than the desktop minimum (~96px → 116px). */
export const MOBILE_DAY_COL_PX = 116;
export const MOBILE_WEEK_GRID_MIN_WIDTH_PX = HOUR_RAIL_PX + MOBILE_DAY_COL_PX * 7;

type Seg = { startMin: number; endMin: number };

function clamp(seg: Seg): Seg | null {
  const a = Math.max(seg.startMin, HOURS_START * 60);
  const b = Math.min(seg.endMin, HOURS_END * 60);
  if (b <= a) return null;
  return { startMin: a, endMin: b };
}

function topFor(min: number) {
  return ((min - HOURS_START * 60) / 60) * PX_PER_HOUR;
}

function heightFor(seg: Seg) {
  return ((seg.endMin - seg.startMin) / 60) * PX_PER_HOUR;
}

// Types are canonical in @/lib/calendarDays; imported for internal use and re-exported for back-compat.
import type { AISlotSeg, DayCellBlock, DayCellLog, DayCellData } from "@/lib/calendarDays";
export type { AISlotSeg, DayCellBlock, DayCellLog, DayCellData };

export function WeekGrid({
  days,
  onGapClick,
  onSlotClick,
  onBlockClick,
  onLogClick,
  onLogReschedule,
  notedDates,
}: {
  days: DayCellData[];
  onGapClick: (iso: string, gap: GapWindow) => void;
  onSlotClick: (iso: string, startMin: number) => void;
  onBlockClick?: (iso: string, block: DayCellBlock) => void;
  onLogClick?: (iso: string, log: DayCellLog) => void;
  onLogReschedule?: (logId: string, newDate: string, newStartMin: number, newEndMin: number) => void;
  notedDates?: Set<string>;
}) {
  const { t } = useTranslation();
  const timeFormat = useTimeFormat();
  const isMobile = useIsMobile();
  const dayColumns = isMobile
    ? `repeat(7, ${MOBILE_DAY_COL_PX}px)`
    : "repeat(7, 1fr)";
  const gridColumns = `${HOUR_RAIL_PX}px ${dayColumns}`;
  const gridMinWidth = isMobile ? MOBILE_WEEK_GRID_MIN_WIDTH_PX : WEEK_GRID_MIN_WIDTH_PX;
  const hours = useMemo(
    () => Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => HOURS_START + i),
    []
  );
  const logLaneMaps = useMemo(() => {
    return new Map(
      days.map((day) => [
        day.iso,
        computeLaneLayout(
          day.logs.flatMap((log, index) => {
            const segment = clamp(log.seg);
            return segment
              ? [{ id: `${log.id ?? "log"}-${index}`, startMin: segment.startMin, endMin: segment.endMin }]
              : [];
          })
        ),
      ])
    );
  }, [days]);
  const gridBodyRef = useRef<HTMLDivElement>(null);

  return (
    <TooltipProvider delayDuration={150}>
    <Surface data-testid="week-grid" className="overflow-hidden" style={{ minWidth: gridMinWidth }}>
      {/* Day headers */}
      <div className="grid" style={{ gridTemplateColumns: gridColumns }}>
        <div />
        {days.map((d) => (
          <Link
            key={d.iso}
            to={`/app?date=${d.iso}`}
            className={cn(
              "px-2 py-3 text-center border-l border-border/40 transition-colors hover:bg-muted/30",
              d.isToday && "bg-primary/[0.06] border border-primary ring-1 ring-primary/40 rounded-lg"
            )}
            aria-label={t("calendar.openDayView", { label: d.label })}
          >
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.short}</div>
            <div className={cn("font-display text-lg font-semibold mt-0.5", d.isToday && "text-primary")}>
              {Number(d.iso.split("-")[2])}
            </div>
            {notedDates?.has(d.iso) && (
              <div className="mx-auto mt-1 h-1 w-1 rounded-full bg-primary" aria-label={t("calendar.hasNote")} />
            )}
            <div className="text-[10px] text-muted-foreground font-mono-num mt-0.5">
              {fmtDuration(d.totalFree)} free
            </div>
          </Link>
        ))}
      </div>

      {/* Grid body */}
      <div
        ref={gridBodyRef}
        className="relative grid border-t border-border/40"
        style={{ gridTemplateColumns: gridColumns, height: TOTAL_HEIGHT }}
      >
        {/* Hour rail */}
        <div className="relative">
          {hours.filter((h) => h < HOURS_END).map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0 pl-2 text-[9px] uppercase tracking-wider text-muted-foreground font-mono-num -mt-1.5"
              style={{ top: (h - HOURS_START) * PX_PER_HOUR }}
            >
              {fmtDisplayTime(`${String(h).padStart(2, "0")}:00`, timeFormat)}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((d) => (
          <div
            key={d.iso}
            className={cn(
              "relative border-l border-border/40",
              d.isToday && "bg-primary/[0.06] border-l border-r border-primary"
            )}
          >
            {/* Hour grid lines */}
            {hours.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-border/30"
                style={{ top: (h - HOURS_START) * PX_PER_HOUR }}
              />
            ))}

            {/* Click overlay (per-hour) */}
            {hours.slice(0, -1).map((h) => (
              <button
                key={h}
                type="button"
                aria-label={t("calendar.logSlot", { day: d.short, hour: h })}
                onClick={() => onSlotClick(d.iso, h * 60)}
                className="absolute left-0 right-0 hover:bg-primary/[0.05] transition-colors z-[5]"
                style={{ top: (h - HOURS_START) * PX_PER_HOUR, height: PX_PER_HOUR }}
              />
            ))}

            {/* Gap markers (z-6, above hour buttons) */}
            {d.gaps.map((g, i) => {
              const c = clamp({ startMin: g.start, endMin: g.end });
              if (!c) return null;
              const compact = heightFor(c) < 30;
              return (
                <button
                  type="button"
                  key={`gap-${g.start}-${i}`}
                  onClick={() => onGapClick(d.iso, g)}
                  className={cn(
                    "absolute left-0.5 right-0.5 rounded-md border border-dashed border-border/60 bg-muted/30 text-left px-1.5 transition-colors hover:bg-muted/50 z-[6] overflow-hidden",
                    compact && "flex items-center"
                  )}
                  style={{ top: topFor(c.startMin), height: heightFor(c) }}
                  title={`${fmtDisplayTimeFromMin(g.start, timeFormat)}–${fmtDisplayTimeFromMin(g.end, timeFormat)} · ${fmtDuration(g.durationMin)}`}
                >
                  {compact ? (
                    <div className="truncate text-[9px] font-mono-num text-muted-foreground leading-none">
                      {t("calendar.free")} · {fmtDuration(g.durationMin)}
                    </div>
                  ) : (
                    <>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                        {t("calendar.free")}
                      </div>
                      <div className="text-[10px] font-mono-num text-foreground/80">
                        {fmtDuration(g.durationMin)}
                      </div>
                    </>
                  )}
                </button>
              );
            })}

            {/* Schedule blocks — full width, z-10 */}
            {d.blocks.map((b, i) => {
              const c = clamp(b.seg);
              if (!c) return null;
              const barHeight = barHeightFromDuration(heightFor(c));
              return (
                <motion.div
                  key={`${b.id ?? "b"}-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.01 }}
                  className={cn(
                    "absolute left-1 right-1 z-[10]",
                    timelinePlannedBarClassName,
                    onBlockClick ? "cursor-pointer pointer-events-auto" : "pointer-events-none"
                  )}
                  style={{
                    top: topFor(c.startMin),
                    height: barHeight,
                    borderLeftColor: b.color,
                    zIndex: 10 + i,
                  }}
                  onClick={onBlockClick ? (e) => { e.stopPropagation(); onBlockClick(d.iso, b); } : undefined}
                  title={`${b.name} · ${fmtDisplayTimeFromMin(c.startMin, timeFormat)}–${fmtDisplayTimeFromMin(c.endMin, timeFormat)}`}
                >
                  <div className={timelinePlannedFillLayerClassName} style={{ backgroundColor: b.color }} />
                  <div className={timelineLabelRowClassName}>
                    <span className={timelinePlannedLabelClassName}>{b.name}</span>
                  </div>
                </motion.div>
              );
            })}

            {/* Time logs — full width, z-20 (on top of blocks) */}
            {d.logs.map((l, i) => {
              const { lane = 0, groupWidth = 1 } = logLaneMaps.get(d.iso)?.get(`${l.id ?? "log"}-${i}`) ?? {};
              return (
                <WeekLogBar
                  key={`${l.id ?? "l"}-${i}`}
                  log={l}
                  dayISO={d.iso}
                  days={days}
                  gridBodyRef={gridBodyRef}
                  lane={lane}
                  groupWidth={groupWidth}
                  draggable={!!onLogReschedule && !!l.category_id && !l.spansMidnight}
                  onReschedule={onLogReschedule}
                  onClick={onLogClick ? () => onLogClick(d.iso, l) : undefined}
                />
              );
            })}

            {/* AI suggested slots (z-25, dashed primary) */}
            {(d.aiSlots ?? []).map((s, i) => {
              const c = clamp(s.seg);
              if (!c) return null;
              const aiCompact = heightFor(c) < 30;
              const block = (
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={cn(
                    "absolute left-[18%] right-[18%] rounded-md px-1.5 border border-primary/70 bg-primary/[0.18] backdrop-blur-sm shadow-glow cursor-help z-[25] overflow-hidden",
                    aiCompact ? "py-0 flex items-center" : "py-0.5"
                  )}
                  style={{ top: topFor(c.startMin), height: heightFor(c) }}
                >
                  {aiCompact ? (
                    <div className="truncate text-[9px] font-semibold text-foreground leading-none">{t("calendar.aiShort")} · {s.name}</div>
                  ) : (
                    <>
                      <div className="text-[9px] uppercase tracking-wider text-primary/90">{t("calendar.aiShort")}</div>
                      <div className="text-[10px] font-semibold truncate text-foreground">{s.name}</div>
                    </>
                  )}
                </motion.div>
              );
              return s.rationale ? (
                <Tooltip key={`ai-${i}`}>
                  <TooltipTrigger asChild>{block}</TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs text-xs">
                    <div className="font-semibold mb-1">{s.name}</div>
                    {s.rationale}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div key={`ai-${i}`}>{block}</div>
              );
            })}
          </div>
        ))}
      </div>
    </Surface>
    </TooltipProvider>
  );
}

function snapMin(m: number): number {
  return Math.round(m / SNAP_MIN) * SNAP_MIN;
}

function WeekLogBar({
  log, dayISO, days, gridBodyRef, lane, groupWidth, draggable, onReschedule, onClick,
}: {
  log: DayCellLog;
  dayISO: string;
  days: DayCellData[];
  gridBodyRef: React.RefObject<HTMLDivElement>;
  lane: number;
  groupWidth: number;
  draggable: boolean;
  onReschedule?: (logId: string, newDate: string, newStartMin: number, newEndMin: number) => void;
  onClick?: () => void;
}) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const allowBarDrag = draggable && !isMobile;
  const barRef = useRef<HTMLDivElement>(null);
  const c = clamp(log.seg);

  const {
    offset,
    isDragging,
    startHandleDrag,
    barPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  } = useTimelineLogDrag({
    enabled: draggable && !!onReschedule && !!c,
    allowBarDrag,
    captureTargetRef: barRef,
    onTap: onClick,
    onComplete: (e, start) => {
      if (!onReschedule || !log.id || !c) return;
      const origStart = c.startMin;
      const origEnd = c.endMin;
      const dur = origEnd - origStart;
      const deltaMin = snapMin(Math.round(((e.clientY - start.y) / PX_PER_HOUR) * 60));
      let newStart = snapMin(origStart + deltaMin);
      let newEnd = newStart + dur;
      if (newStart < 0) { newEnd -= newStart; newStart = 0; }
      if (newEnd > MIN_PER_DAY) {
        const over = newEnd - MIN_PER_DAY;
        newStart = Math.max(0, newStart - over);
        newEnd = MIN_PER_DAY;
      }

      let newDate = dayISO;
      if (gridBodyRef.current) {
        const rect = gridBodyRef.current.getBoundingClientRect();
        const availWidth = rect.width - HOUR_RAIL_PX;
        if (availWidth > 0) {
          const colWidth = availWidth / days.length;
          const colIdx = Math.floor((e.clientX - rect.left - HOUR_RAIL_PX) / colWidth);
          const clamped = Math.max(0, Math.min(days.length - 1, colIdx));
          newDate = days[clamped].iso;
        }
      }

      if (newDate !== dayISO || newStart !== origStart || newEnd !== origEnd) {
        onReschedule(log.id, newDate, newStart, newEnd);
      }
    },
  });

  if (!c) return null;

  const top = topFor(c.startMin);
  const durationPx = heightFor(c);
  const barHeight = barHeightFromDuration(durationPx);
  const compact = barHeight < 36;
  const laneWidth = 100 / groupWidth;

  const mobileDragHandle = draggable && isMobile ? (
    <TimelineLogMobileDragHandle compact={compact} onPointerDown={startHandleDrag} />
  ) : null;

  return (
    <motion.div
      ref={barRef}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1, x: offset.dx, y: offset.dy }}
      transition={{ opacity: {}, scale: {}, x: { duration: 0 }, y: { duration: 0 } }}
      className={cn(
        timelineLogBarClassName,
        "z-[20] select-none",
        allowBarDrag && "cursor-grab touch-none active:cursor-grabbing",
        isDragging && allowBarDrag && "cursor-grabbing",
        !draggable && onClick && "cursor-pointer",
        isMobile && draggable && onClick && "cursor-pointer",
        !draggable && !onClick && "pointer-events-none",
      )}
      style={{
        top,
        height: barHeight,
        left: `calc(${lane * laneWidth}% + 3px)`,
        width: `calc(${laneWidth}% - 6px)`,
        zIndex: 20 + lane,
      }}
      aria-label={t("calendar.logAria", { name: log.name })}
      title={log.name}
      onPointerDown={barPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={isMobile && onClick ? (e) => { e.stopPropagation(); onClick(); } : !draggable && onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
    >
      <div className={timelineLogFillLayerClassName} style={{ backgroundColor: log.color }} />
      <div className={cn(timelineLabelRowClassName, "gap-0.5")}>
        <span className={cn(timelineLogLabelClassName, "min-w-0 flex-1")}>{log.name}</span>
        {mobileDragHandle}
      </div>
    </motion.div>
  );
}
