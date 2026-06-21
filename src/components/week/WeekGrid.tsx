import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MIN_PER_DAY, fmtDuration, fmtTimeLabel, fromMin } from "@/lib/time";
import { Surface } from "@/components/Surface";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { GapWindow } from "@/lib/gaps";

const PX_PER_HOUR = 32;
const HOURS_START = 0;
const HOURS_END = 24;
const TOTAL_HOURS = HOURS_END - HOURS_START;
const TOTAL_HEIGHT = TOTAL_HOURS * PX_PER_HOUR;
const SNAP_MIN = 15;
const DRAG_CANCEL_PX = 4;
const HOUR_RAIL_PX = 48;

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
  const hours = useMemo(
    () => Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => HOURS_START + i),
    []
  );
  const gridBodyRef = useRef<HTMLDivElement>(null);

  return (
    <TooltipProvider delayDuration={150}>
    <Surface className="overflow-hidden">
      {/* Day headers */}
      <div className="grid" style={{ gridTemplateColumns: `48px repeat(7, 1fr)` }}>
        <div />
        {days.map((d) => (
          <Link
            key={d.iso}
            to={`/app?date=${d.iso}`}
            className={cn(
              "px-2 py-3 text-center border-l border-border/40 transition-colors hover:bg-muted/30",
              d.isToday && "bg-primary/[0.06] border border-primary ring-1 ring-primary/40 rounded-lg"
            )}
            aria-label={`Open day view for ${d.label}`}
          >
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.short}</div>
            <div className={cn("font-display text-lg font-semibold mt-0.5", d.isToday && "text-primary")}>
              {Number(d.iso.split("-")[2])}
            </div>
            {notedDates?.has(d.iso) && (
              <div className="mx-auto mt-1 h-1 w-1 rounded-full bg-primary" aria-label="Has note" />
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
        style={{ gridTemplateColumns: `48px repeat(7, 1fr)`, height: TOTAL_HEIGHT }}
      >
        {/* Hour rail */}
        <div className="relative">
          {hours.filter((h) => h < HOURS_END).map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0 pl-2 text-[9px] uppercase tracking-wider text-muted-foreground font-mono-num -mt-1.5"
              style={{ top: (h - HOURS_START) * PX_PER_HOUR }}
            >
              {fmtTimeLabel(`${String(h).padStart(2, "0")}:00`)}
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
                aria-label={`Log ${d.short} ${h}:00`}
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
                  title={`${fromMin(g.start)}–${fromMin(g.end)} · ${fmtDuration(g.durationMin)}`}
                >
                  {compact ? (
                    <div className="truncate text-[9px] font-mono-num text-muted-foreground leading-none">
                      Free · {fmtDuration(g.durationMin)}
                    </div>
                  ) : (
                    <>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                        Free
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
              return (
                <motion.div
                  key={`${b.id ?? "b"}-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.01 }}
                  className={cn(
                    "absolute left-0.5 right-0.5 rounded-sm px-1 overflow-hidden border-l-2 z-[10]",
                    onBlockClick ? "cursor-pointer hover:brightness-95 transition-[filter]" : "pointer-events-none"
                  )}
                  style={{
                    top: topFor(c.startMin),
                    height: Math.max(heightFor(c), 10),
                    backgroundColor: `${b.color}33`,
                    borderLeftColor: b.color,
                  }}
                  onClick={onBlockClick ? (e) => { e.stopPropagation(); onBlockClick(d.iso, b); } : undefined}
                >
                  <div className="text-[10px] font-medium truncate text-foreground/85">{b.name}</div>
                </motion.div>
              );
            })}

            {/* Time logs — full width, z-20 (on top of blocks) */}
            {d.logs.map((l, i) => (
              <WeekLogBar
                key={`${l.id ?? "l"}-${i}`}
                log={l}
                dayISO={d.iso}
                days={days}
                gridBodyRef={gridBodyRef}
                draggable={!!onLogReschedule && !!l.category_id && !l.spansMidnight}
                onReschedule={onLogReschedule}
                onClick={onLogClick ? () => onLogClick(d.iso, l) : undefined}
              />
            ))}

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
                    <div className="truncate text-[9px] font-semibold text-foreground leading-none">AI · {s.name}</div>
                  ) : (
                    <>
                      <div className="text-[9px] uppercase tracking-wider text-primary/90">AI</div>
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
  log, dayISO, days, gridBodyRef, draggable, onReschedule, onClick,
}: {
  log: DayCellLog;
  dayISO: string;
  days: DayCellData[];
  gridBodyRef: React.RefObject<HTMLDivElement>;
  draggable: boolean;
  onReschedule?: (logId: string, newDate: string, newStartMin: number, newEndMin: number) => void;
  onClick?: () => void;
}) {
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });
  const dragRef = useRef<{
    startX: number; startY: number;
    origStart: number; origEnd: number;
    moved: boolean;
  } | null>(null);

  const c = clamp(log.seg);
  if (!c) return null;

  const top = topFor(c.startMin);
  const height = Math.max(heightFor(c), 10);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!draggable || !onReschedule) return;
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origStart: c.startMin, origEnd: c.endMin, moved: false };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* jsdom */ }
    setDragOffset({ dx: 0, dy: 0 });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > DRAG_CANCEL_PX || Math.abs(dy) > DRAG_CANCEL_PX) dragRef.current.moved = true;
    setDragOffset({ dx, dy });
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragRef.current || !onReschedule) {
      dragRef.current = null;
      setDragOffset({ dx: 0, dy: 0 });
      return;
    }
    const { startX, startY, origStart, origEnd, moved } = dragRef.current;
    dragRef.current = null;
    setDragOffset({ dx: 0, dy: 0 });
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }

    if (!moved) {
      onClick?.();
      return;
    }

    const dur = origEnd - origStart;
    const deltaMin = snapMin(Math.round(((e.clientY - startY) / PX_PER_HOUR) * 60));
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

    if (log.id) onReschedule(log.id, newDate, newStart, newEnd);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1, x: dragOffset.dx, y: dragOffset.dy }}
      transition={{ opacity: {}, scale: {}, x: { duration: 0 }, y: { duration: 0 } }}
      className={cn(
        "absolute left-0.5 right-0.5 rounded-sm px-1 overflow-hidden shadow-soft z-[20] select-none",
        draggable
          ? "cursor-grab touch-none active:cursor-grabbing"
          : onClick
          ? "cursor-pointer hover:brightness-90 transition-[filter]"
          : "pointer-events-none"
      )}
      style={{ top, height, backgroundColor: log.color }}
      aria-label={`Log: ${log.name}`}
      onPointerDown={draggable ? onPointerDown : undefined}
      onPointerMove={draggable ? onPointerMove : undefined}
      onPointerUp={draggable ? endDrag : undefined}
      onPointerCancel={draggable ? endDrag : undefined}
      onClick={!draggable && onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
    >
      <div className="text-[9px] font-semibold truncate text-white">{log.name}</div>
    </motion.div>
  );
}
