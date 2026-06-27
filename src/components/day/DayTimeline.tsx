import { motion } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StickyNote } from "lucide-react";
import { MIN_PER_DAY, fmtDuration, fmtDisplayTime, toMin } from "@/lib/time";
import { useTimeFormat } from "@/hooks/useTimeFormat";
import { cn } from "@/lib/utils";
import { computeLaneLayout, segmentsForLogOnDay, visibleBlockSegments, type Segment } from "@/lib/daySegments";
import {
  barHeightFromDuration,
  isCompactBar,
  timelineLogFillLayerClassName,
  timelinePlannedFillLayerClassName,
  timelineLabelRowClassName,
  timelineLabelStackClassName,
  timelineLogBarClassName,
  timelineLogLabelClassName,
  timelinePlannedBarClassName,
  timelinePlannedLabelClassName,
} from "@/lib/timelineBarStyles";
import type { Category } from "./QuickLogDialog";

export type ScheduleBlock = {
  id: string;
  name: string;
  color: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  type: "fixed" | "waste_expected"; // matches the block_type DB enum
  category_id?: string | null;
};

export type TimeLog = {
  id: string;
  date?: string;
  category_id: string | null;
  type: "productive" | "unproductive" | "essential";
  start_time: string;
  end_time: string;
  title?: string | null;
  notes: string | null;
  note_json?: object | null;
};

const PX_PER_HOUR = 56;
const TOTAL_HEIGHT = PX_PER_HOUR * 24;
const SNAP_MIN = 15;
const LONG_PRESS_MS = 500;
const DRAG_CANCEL_PX = 4;

function snapMin(m: number): number {
  return Math.round(m / SNAP_MIN) * SNAP_MIN;
}

type ContextMenu = { x: number; y: number; startMin: number } | null;

export function DayTimeline({
  blocks, logs, categories, onSlotClick, currentMinute, onLogReschedule,
  onBlockClick, onLogClick, date,
}: {
  blocks: ScheduleBlock[];
  logs: TimeLog[];
  categories: Category[];
  onSlotClick: (startMin: number) => void;
  currentMinute: number | null;
  /** The ISO date this timeline is showing — passed through to `onLogReschedule`. */
  date?: string;
  onLogReschedule?: (logId: string, newDate: string, newStartMin: number, newEndMin: number) => void;
  onBlockClick?: (block: ScheduleBlock) => void;
  onLogClick?: (log: TimeLog) => void;
}) {
  const timeFormat = useTimeFormat();
  const catMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  // Actual logs use collision lanes; schedule blocks stay full-width background guides.
  const laneMap = useMemo(() => {
    const items: { startMin: number; endMin: number; id: string }[] = [];
    logs.forEach((l) => {
      const segs = date ? segmentsForLogOnDay(l, date) : segmentsForLogOnDay(l, l.date ?? "");
      segs.forEach((seg, i) => {
        items.push({ startMin: seg.startMin, endMin: seg.endMin, id: `l-${l.id}-${i}` });
      });
    });
    return computeLaneLayout(items);
  }, [logs, date]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
  const [hoverHour, setHoverHour] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressOriginRef = useRef<{ x: number; y: number; startMin: number } | null>(null);

  const minuteAtClientY = useCallback((clientY: number) => {
    const el = gridRef.current;
    if (!el) return 0;
    const y = clientY - el.getBoundingClientRect().top;
    const hour = Math.min(23, Math.max(0, Math.floor(y / PX_PER_HOUR)));
    return hour * 60;
  }, []);

  const hourAtClientY = useCallback((clientY: number) => {
    const el = gridRef.current;
    if (!el) return 0;
    const y = clientY - el.getBoundingClientRect().top;
    return Math.min(23, Math.max(0, Math.floor(y / PX_PER_HOUR)));
  }, []);

  const isBarTarget = useCallback((target: EventTarget | null) => {
    return !!(target as HTMLElement | null)?.closest("[data-timeline-block], [data-timeline-log]");
  }, []);

  const openContextMenu = useCallback((x: number, y: number, startMin: number) => {
    setContextMenu({ x, y, startMin });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleHourPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 || isBarTarget(e.target)) return;
      const startMin = minuteAtClientY(e.clientY);
      longPressOriginRef.current = { x: e.clientX, y: e.clientY, startMin };
      longPressRef.current = setTimeout(() => {
        if (longPressOriginRef.current) {
          openContextMenu(
            longPressOriginRef.current.x,
            longPressOriginRef.current.y,
            longPressOriginRef.current.startMin
          );
        }
      }, LONG_PRESS_MS);
    },
    [openContextMenu, isBarTarget, minuteAtClientY]
  );

  const handleHourPointerMove = useCallback((e: React.PointerEvent) => {
    if (!longPressOriginRef.current) return;
    const dx = Math.abs(e.clientX - longPressOriginRef.current.x);
    const dy = Math.abs(e.clientY - longPressOriginRef.current.y);
    if (dx > DRAG_CANCEL_PX || dy > DRAG_CANCEL_PX) {
      if (longPressRef.current) clearTimeout(longPressRef.current);
      longPressRef.current = null;
      longPressOriginRef.current = null;
    }
  }, []);

  const handleHourPointerUp = useCallback(() => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    longPressRef.current = null;
    longPressOriginRef.current = null;
  }, []);

  const handleGridClick = useCallback(
    (e: React.MouseEvent) => {
      if (contextMenu) {
        closeContextMenu();
        return;
      }
      if (isBarTarget(e.target)) return;
      closeContextMenu();
      onSlotClick(minuteAtClientY(e.clientY));
    },
    [contextMenu, closeContextMenu, isBarTarget, minuteAtClientY, onSlotClick]
  );

  const handleGridContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (isBarTarget(e.target)) return;
      e.preventDefault();
      openContextMenu(e.clientX, e.clientY, minuteAtClientY(e.clientY));
    },
    [isBarTarget, minuteAtClientY, openContextMenu]
  );

  const handleGridMouseMove = useCallback(
    (e: React.MouseEvent) => {
      setHoverHour(hourAtClientY(e.clientY));
    },
    [hourAtClientY]
  );

  return (
    <div
      className="relative rounded-2xl border border-border bg-surface overflow-hidden"
      onClick={contextMenu ? closeContextMenu : undefined}
    >
      <div
        ref={gridRef}
        className="relative cursor-pointer"
        style={{ height: TOTAL_HEIGHT }}
        onClick={handleGridClick}
        onContextMenu={handleGridContextMenu}
        onMouseMove={handleGridMouseMove}
        onMouseLeave={() => setHoverHour(null)}
        onPointerDown={handleHourPointerDown}
        onPointerMove={handleHourPointerMove}
        onPointerUp={handleHourPointerUp}
        onPointerCancel={handleHourPointerUp}
      >
        {/* Hour grid lines */}
        {hours.map((h) => (
          <div
            key={`line-${h}`}
            className="absolute left-0 right-0 border-t border-border/40 pointer-events-none"
            style={{ top: h * PX_PER_HOUR }}
          />
        ))}

        {/* Full-row hover for the active hour */}
        {hoverHour !== null && !contextMenu && (
          <div
            className="absolute left-0 right-0 bg-primary/[0.05] pointer-events-none z-[4]"
            style={{ top: hoverHour * PX_PER_HOUR, height: PX_PER_HOUR }}
          />
        )}

        {/* Hour labels — always visible, never intercept clicks */}
        {hours.map((h) => (
          <div
            key={`label-${h}`}
            className="absolute left-0 w-16 pl-3 -mt-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-mono-num pointer-events-none select-none z-[35]"
            style={{ top: h * PX_PER_HOUR }}
          >
            {fmtDisplayTime(`${String(h).padStart(2, "0")}:00`, timeFormat)}
          </div>
        ))}

        {/* Schedule blocks — z-10. Clipped against logged time so the
            planned guide only shows where nothing has been logged yet. */}
        <div className="absolute inset-y-0 left-16 right-0 z-[10] pointer-events-none">
          {blocks.flatMap((b) =>
            visibleBlockSegments(b, logs, date).map((seg, i) => {
              const key = `${b.id}-${i}`;
              return (
                <BlockBar
                  key={key}
                  seg={seg}
                  color={b.color}
                  name={b.name}
                  lane={0}
                  groupWidth={1}
                  onClick={onBlockClick ? () => onBlockClick(b) : undefined}
                />
              );
            })
          )}
        </div>

        {/* Time logs — z-20 (on top of blocks).
            Lane position is computed from the shared collision layout. */}
        <div className="absolute inset-y-0 left-16 right-0 z-[20] pointer-events-none">
          {logs.flatMap((l, idx) => {
            const cat = l.category_id ? catMap[l.category_id] : undefined;
            const color = cat?.color ?? (l.type === "productive" ? "hsl(var(--productive))" : l.type === "unproductive" ? "hsl(var(--unproductive))" : "hsl(var(--muted-foreground))");
            const segs = date ? segmentsForLogOnDay(l, date) : segmentsForLogOnDay(l, l.date ?? "");
            return segs.map((seg, i) => {
              const { lane = 0, groupWidth = 1 } = laneMap.get(`l-${l.id}-${i}`) ?? {};
              return (
                <LogBar
                  key={`${l.id}-${i}`}
                  log={l}
                  seg={seg}
                  color={color}
                  name={l.title || (cat?.name ?? l.type)}
                  index={idx}
                  lane={lane}
                  groupWidth={groupWidth}
                  draggable={!!onLogReschedule && toMin(l.end_time) > toMin(l.start_time) && !!l.category_id}
                  onReschedule={onLogReschedule && date
                    ? (logId, start, end) => onLogReschedule(logId, date, start, end)
                    : undefined}
                  onClick={onLogClick ? () => onLogClick(l) : undefined}
                />
              );
            });
          })}
        </div>

        {/* Now indicator */}
        {currentMinute !== null && (
          <div
            className="absolute left-16 right-2 z-30 pointer-events-none"
            style={{ top: (currentMinute / 60) * PX_PER_HOUR }}
          >
            <div className="relative flex items-center">
              <div className="h-2 w-2 rounded-full bg-primary shadow-glow" />
              <div className="flex-1 h-px bg-primary/70" />
            </div>
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenuPopover
          x={contextMenu.x}
          y={contextMenu.y}
          onLog={() => { closeContextMenu(); onSlotClick(contextMenu.startMin); }}
          onAddBlock={() => {
            closeContextMenu();
            // Bubble up via a custom event so CalendarPage can open ScheduleBlockDialog
            const el = document.getElementById("day-timeline-root");
            el?.dispatchEvent(
              new CustomEvent("add-block-here", {
                detail: { startMin: contextMenu.startMin },
                bubbles: true,
              })
            );
          }}
        />
      )}
    </div>
  );
}

function BlockBar({
  seg, color, name, lane, groupWidth, onClick,
}: {
  seg: Segment;
  color: string;
  name: string;
  lane: number;
  groupWidth: number;
  onClick?: () => void;
}) {
  const { t } = useTranslation();
  const top = (seg.startMin / 60) * PX_PER_HOUR;
  const durationPx = ((seg.endMin - seg.startMin) / 60) * PX_PER_HOUR;
  const barHeight = barHeightFromDuration(durationPx);
  const compact = isCompactBar(barHeight);
  const pct = 100 / groupWidth;
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      data-timeline-block=""
      className={cn(
        timelinePlannedBarClassName,
        onClick ? "cursor-pointer pointer-events-auto" : "pointer-events-none"
      )}
      style={{
        top,
        height: barHeight,
        left: `calc(${lane * pct}% + 3px)`,
        width: `calc(${pct}% - 6px)`,
        borderLeftColor: color,
        zIndex: 10,
      }}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
      title={`${name} · ${t("day.planned")}`}
    >
      <div className={timelinePlannedFillLayerClassName} style={{ backgroundColor: color }} />
      {compact ? (
        <div className={timelineLabelRowClassName}>
          <span className={timelinePlannedLabelClassName}>{name}</span>
        </div>
      ) : (
        <div className={timelineLabelStackClassName}>
          <span className="truncate text-[11px] font-medium text-foreground/95">{name}</span>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{t("day.planned")}</span>
        </div>
      )}
    </motion.div>
  );
}

function LogBar({
  log, seg, color, name, index, lane, groupWidth, draggable, onReschedule, onClick,
}: {
  log: TimeLog;
  seg: Segment;
  color: string;
  name: string;
  index: number;
  lane: number;
  groupWidth: number;
  draggable: boolean;
  onReschedule?: (logId: string, newStartMin: number, newEndMin: number) => void;
  onClick?: () => void;
}) {
  const { t } = useTranslation();
  const top = (seg.startMin / 60) * PX_PER_HOUR;
  const durationPx = ((seg.endMin - seg.startMin) / 60) * PX_PER_HOUR;
  const barHeight = barHeightFromDuration(durationPx);
  const durationMin = seg.endMin - seg.startMin;
  const compact = isCompactBar(barHeight);
  const pct = 100 / groupWidth;
  const [dragDy, setDragDy] = useState(0);
  const dragRef = useRef<{ startY: number; origStart: number; origEnd: number; moved: boolean } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!draggable || !onReschedule) return;
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = { startY: e.clientY, origStart: seg.startMin, origEnd: seg.endMin, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragDy(0);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dy) > DRAG_CANCEL_PX) dragRef.current.moved = true;
    setDragDy(dy);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragRef.current || !onReschedule) {
      dragRef.current = null;
      setDragDy(0);
      return;
    }
    const { startY, origStart, origEnd, moved } = dragRef.current;
    dragRef.current = null;
    setDragDy(0);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }

    if (!moved) {
      // Treat as a click
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
    if (newStart !== origStart || newEnd !== origEnd) {
      onReschedule(log.id, newStart, newEnd);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 4 }}
      animate={{ opacity: 1, x: 0, y: dragDy }}
      data-timeline-log=""
      transition={{
        opacity: { delay: index * 0.02 },
        x: { delay: index * 0.02 },
        y: { duration: 0 },
      }}
      className={cn(
        timelineLogBarClassName,
        "select-none pointer-events-auto",
        draggable ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-pointer"
      )}
      style={{
        top,
        height: barHeight,
        left: `calc(${lane * pct}% + 3px)`,
        width: `calc(${pct}% - 6px)`,
        zIndex: 20 + lane,
      }}
      onPointerDown={draggable ? onPointerDown : undefined}
      onPointerMove={draggable ? onPointerMove : undefined}
      onPointerUp={draggable ? endDrag : undefined}
      onPointerCancel={draggable ? endDrag : undefined}
      onClick={!draggable ? handleClick : undefined}
      title={name}
    >
      <div className={timelineLogFillLayerClassName} style={{ backgroundColor: color }} />
      {compact ? (
        <div className={cn(timelineLabelRowClassName, "gap-1")}>
          <span className={timelineLogLabelClassName}>{name}</span>
          {log.note_json && <StickyNote className="h-2.5 w-2.5 shrink-0 opacity-70" />}
        </div>
      ) : (
        <div className={timelineLabelStackClassName}>
          <div className={cn(timelineLogLabelClassName, "text-[11px] flex items-center gap-1")}>
            <span className="truncate">{name}</span>
            {log.note_json && <StickyNote className="h-2.5 w-2.5 shrink-0 opacity-70" />}
          </div>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono-num">
            {fmtDuration(durationMin)}
          </span>
        </div>
      )}
    </motion.div>
  );
}

function ContextMenuPopover({
  x, y, onLog, onAddBlock,
}: {
  x: number;
  y: number;
  onLog: () => void;
  onAddBlock: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="fixed z-50 min-w-[180px] rounded-lg border border-border bg-surface shadow-lg py-1 text-sm"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onLog}
        className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors"
      >
        {t("day.logTimeHere")}
      </button>
      <button
        type="button"
        onClick={onAddBlock}
        className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors"
      >
        {t("day.addBlockHere")}
      </button>
    </div>
  );
}
