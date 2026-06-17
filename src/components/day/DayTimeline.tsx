import { motion } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";
import { MIN_PER_DAY, fmtDuration, fmtTimeLabel, toMin } from "@/lib/time";
import { cn } from "@/lib/utils";
import { segmentsForLogOnDay, visibleBlockSegments, type Segment } from "@/lib/daySegments";
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
  type: "productive" | "unproductive";
  start_time: string;
  end_time: string;
  title?: string | null;
  notes: string | null;
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
  const catMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);

  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressOriginRef = useRef<{ x: number; y: number; startMin: number } | null>(null);

  const openContextMenu = useCallback((x: number, y: number, startMin: number) => {
    setContextMenu({ x, y, startMin });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleHourContextMenu = useCallback(
    (e: React.MouseEvent, startMin: number) => {
      e.preventDefault();
      openContextMenu(e.clientX, e.clientY, startMin);
    },
    [openContextMenu]
  );

  const handleHourPointerDown = useCallback(
    (e: React.PointerEvent, startMin: number) => {
      if (e.button !== 0) return;
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
    [openContextMenu]
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

  return (
    <div
      className="relative rounded-2xl border border-border bg-surface overflow-hidden"
      onClick={contextMenu ? closeContextMenu : undefined}
    >
      <div className="relative" style={{ height: TOTAL_HEIGHT }}>
        {/* Hour grid */}
        {hours.map((h) => (
          <div
            key={h}
            className="absolute left-0 right-0 border-t border-border/40 flex"
            style={{ top: h * PX_PER_HOUR }}
          >
            <div className="w-16 shrink-0 -mt-2.5 pl-3 text-[10px] uppercase tracking-wider text-muted-foreground font-mono-num">
              {fmtTimeLabel(`${String(h).padStart(2, "0")}:00`)}
            </div>
          </div>
        ))}

        {/* Schedule blocks — full width, z-10. Clipped against logged time so the
            planned guide only shows where nothing has been logged yet. */}
        <div className="absolute inset-y-0 left-16 right-0 z-[10]">
          {blocks.flatMap((b) =>
            visibleBlockSegments(b, logs, date).map((seg, i) => (
              <BlockBar
                key={`${b.id}-${i}`}
                seg={seg}
                color={b.color}
                name={b.name}
                onClick={onBlockClick ? () => onBlockClick(b) : undefined}
              />
            ))
          )}
        </div>

        {/* Click-to-log hour zones — z-8, below blocks */}
        <div className="absolute inset-y-0 left-16 right-0 z-[8]">
          {hours.map((h) => (
            <button
              key={h}
              type="button"
              aria-label={`Log at ${h}:00`}
              onClick={() => { closeContextMenu(); onSlotClick(h * 60); }}
              onContextMenu={(e) => handleHourContextMenu(e, h * 60)}
              onPointerDown={(e) => handleHourPointerDown(e, h * 60)}
              onPointerMove={handleHourPointerMove}
              onPointerUp={handleHourPointerUp}
              className="absolute left-0 right-0 hover:bg-primary/[0.04] transition-colors"
              style={{ top: h * PX_PER_HOUR, height: PX_PER_HOUR }}
            />
          ))}
        </div>

        {/* Time logs — full width, z-20 (on top of blocks) */}
        <div className="absolute inset-y-0 left-16 right-0 z-[20] pointer-events-none">
          {logs.flatMap((l, idx) => {
            const cat = l.category_id ? catMap[l.category_id] : undefined;
            const color = cat?.color ?? (l.type === "productive" ? "hsl(var(--productive))" : "hsl(var(--unproductive))");
            const segs = date ? segmentsForLogOnDay(l, date) : segmentsForLogOnDay(l, l.date ?? "");
            return segs.map((seg, i) => (
              <LogBar
                key={`${l.id}-${i}`}
                log={l}
                seg={seg}
                color={color}
                name={l.title || (cat?.name ?? l.type)}
                index={idx}
                draggable={!!onLogReschedule && toMin(l.end_time) > toMin(l.start_time) && !!l.category_id}
                onReschedule={onLogReschedule && date
                  ? (logId, start, end) => onLogReschedule(logId, date, start, end)
                  : undefined}
                onClick={onLogClick ? () => onLogClick(l) : undefined}
              />
            ));
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

/** Below this bar height two text rows don't fit — collapse to one line. */
const COMPACT_BAR_PX = 36;

function BlockBar({
  seg, color, name, onClick,
}: {
  seg: Segment;
  color: string;
  name: string;
  onClick?: () => void;
}) {
  const top = (seg.startMin / 60) * PX_PER_HOUR;
  const height = ((seg.endMin - seg.startMin) / 60) * PX_PER_HOUR;
  const compact = height < COMPACT_BAR_PX;
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "absolute left-1 right-1 rounded-md px-2 text-[11px] font-medium overflow-hidden border-l-[3px]",
        compact ? "py-0 flex items-center" : "py-1",
        onClick ? "cursor-pointer pointer-events-auto hover:brightness-95 transition-[filter]" : "pointer-events-none"
      )}
      style={{
        top,
        height: Math.max(height, 14),
        borderLeftColor: color,
        backgroundColor: `${color}22`,
        color: "hsl(var(--foreground) / 0.85)",
      }}
      onClick={onClick}
      title={`${name} · Planned`}
    >
      {compact ? (
        <div className="truncate text-[10px] leading-none">{name}</div>
      ) : (
        <>
          <div className="truncate">{name}</div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Planned</div>
        </>
      )}
    </motion.div>
  );
}

function LogBar({
  log, seg, color, name, index, draggable, onReschedule, onClick,
}: {
  log: TimeLog;
  seg: Segment;
  color: string;
  name: string;
  index: number;
  draggable: boolean;
  onReschedule?: (logId: string, newStartMin: number, newEndMin: number) => void;
  onClick?: () => void;
}) {
  const top = (seg.startMin / 60) * PX_PER_HOUR;
  const height = ((seg.endMin - seg.startMin) / 60) * PX_PER_HOUR;
  const compact = height < COMPACT_BAR_PX;
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
      transition={{
        opacity: { delay: index * 0.02 },
        x: { delay: index * 0.02 },
        y: { duration: 0 },
      }}
      className={cn(
        "absolute left-1 right-1 rounded-md px-2 text-[11px] font-semibold overflow-hidden shadow-soft select-none pointer-events-auto",
        compact ? "py-0 flex items-center" : "py-1",
        draggable ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-pointer"
      )}
      style={{
        top,
        height: Math.max(height, 14),
        backgroundColor: color,
        color: "white",
      }}
      onPointerDown={draggable ? onPointerDown : undefined}
      onPointerMove={draggable ? onPointerMove : undefined}
      onPointerUp={draggable ? endDrag : undefined}
      onPointerCancel={draggable ? endDrag : undefined}
      onClick={!draggable ? handleClick : undefined}
      title={draggable ? "Drag to reschedule · click to edit" : undefined}
    >
      {compact ? (
        <div className="truncate text-[10px] leading-none">
          {name} · {fmtDuration(seg.endMin - seg.startMin)}
        </div>
      ) : (
        <>
          <div className="truncate">{name}</div>
          <div className="text-[9px] uppercase tracking-wider opacity-80 font-mono-num">
            {fmtDuration(seg.endMin - seg.startMin)}
          </div>
        </>
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
        Log time here
      </button>
      <button
        type="button"
        onClick={onAddBlock}
        className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors"
      >
        Add schedule block here
      </button>
    </div>
  );
}
