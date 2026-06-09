import { motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import { MIN_PER_DAY, expandRange, fmtDuration, fmtTimeLabel, toMin } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Category } from "./QuickLogDialog";

export type ScheduleBlock = {
  id: string;
  name: string;
  color: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  type: "fixed" | "flexible" | "buffer";
};

export type TimeLog = {
  id: string;
  category_id: string | null;
  type: "productive" | "unproductive";
  start_time: string;
  end_time: string;
  notes: string | null;
};

const PX_PER_HOUR = 56;
const TOTAL_HEIGHT = (PX_PER_HOUR * 24);
const SNAP_MIN = 15;

type Segment = { startMin: number; endMin: number };

function snapMin(m: number): number {
  return Math.round(m / SNAP_MIN) * SNAP_MIN;
}

function segmentsForDay(start: string, end: string): Segment[] {
  const s = toMin(start);
  const e = toMin(end);
  return expandRange(s, e).map(([a, b]) => ({ startMin: a, endMin: b }));
}

export function DayTimeline({
  blocks, logs, categories, onSlotClick, currentMinute, onLogReschedule,
}: {
  blocks: ScheduleBlock[];
  logs: TimeLog[];
  categories: Category[];
  onSlotClick: (startMin: number) => void;
  currentMinute: number | null;
  /** Vertical drag on logged blocks to change start/end (same day). */
  onLogReschedule?: (logId: string, newStartMin: number, newEndMin: number) => void;
}) {
  const catMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="relative rounded-2xl border border-border bg-surface overflow-hidden">
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

        {/* Schedule blocks (template) — left lane; must not capture clicks (hour row below handles logging). */}
        <div className="absolute inset-y-0 left-16 right-0 z-[1] pointer-events-none">
          {blocks.flatMap((b) =>
            segmentsForDay(b.start_time, b.end_time).map((seg, i) => (
              <BlockBar
                key={`${b.id}-${i}`}
                seg={seg}
                color={b.color}
                name={b.name}
                lane="left"
              />
            ))
          )}
        </div>

        {/* Click-to-log: above template blocks, below log bars (log bars are pointer-events-auto). */}
        <div className="absolute inset-y-0 left-16 right-0 z-[8]">
          {hours.map((h) => (
            <button
              key={h}
              type="button"
              aria-label={`Log at ${h}:00`}
              onClick={() => onSlotClick(h * 60)}
              className="absolute left-0 right-0 hover:bg-primary/[0.04] transition-colors"
              style={{ top: h * PX_PER_HOUR, height: PX_PER_HOUR }}
            />
          ))}
        </div>

        {/* Time logs — right lane */}
        <div className="absolute inset-y-0 left-16 right-0 z-[12] pointer-events-none">
          {logs.flatMap((l, idx) => {
            const cat = l.category_id ? catMap[l.category_id] : undefined;
            const color = cat?.color ?? (l.type === "productive" ? "hsl(var(--productive))" : "hsl(var(--unproductive))");
            const segs = segmentsForDay(l.start_time, l.end_time);
            return segs.map((seg, i) => (
              <LogBar
                key={`${l.id}-${i}`}
                log={l}
                seg={seg}
                color={color}
                name={cat?.name ?? l.type}
                index={idx}
                draggable={!!onLogReschedule && segs.length === 1 && !!l.category_id}
                onReschedule={onLogReschedule}
              />
            ));
          })}
        </div>

        {/* Now indicator */}
        {currentMinute !== null && (
          <div
            className="absolute left-16 right-2 z-20 pointer-events-none"
            style={{ top: (currentMinute / 60) * PX_PER_HOUR }}
          >
            <div className="relative flex items-center">
              <div className="h-2 w-2 rounded-full bg-primary shadow-glow" />
              <div className="flex-1 h-px bg-primary/70" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BlockBar({ seg, color, name, lane }: { seg: Segment; color: string; name: string; lane: "left" | "right" }) {
  const top = (seg.startMin / 60) * PX_PER_HOUR;
  const height = ((seg.endMin - seg.startMin) / 60) * PX_PER_HOUR;
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "absolute rounded-md px-2 py-1 text-[11px] font-medium overflow-hidden border-l-[3px] pointer-events-none",
        lane === "left" ? "left-1 w-[46%]" : "right-1 w-[46%]"
      )}
      style={{
        top,
        height: Math.max(height, 14),
        borderLeftColor: color,
        backgroundColor: `${color}22`,
        color: "hsl(var(--foreground) / 0.85)",
      }}
    >
      <div className="truncate">{name}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Planned</div>
    </motion.div>
  );
}

function LogBar({
  log,
  seg,
  color,
  name,
  index,
  draggable,
  onReschedule,
}: {
  log: TimeLog;
  seg: Segment;
  color: string;
  name: string;
  index: number;
  draggable: boolean;
  onReschedule?: (logId: string, newStartMin: number, newEndMin: number) => void;
}) {
  const top = (seg.startMin / 60) * PX_PER_HOUR;
  const height = ((seg.endMin - seg.startMin) / 60) * PX_PER_HOUR;
  const [dragDy, setDragDy] = useState(0);
  const dragRef = useRef<{ startY: number; origStart: number; origEnd: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!draggable || !onReschedule) return;
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = { startY: e.clientY, origStart: seg.startMin, origEnd: seg.endMin };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragDy(0);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setDragDy(e.clientY - dragRef.current.startY);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragRef.current || !onReschedule) {
      dragRef.current = null;
      setDragDy(0);
      return;
    }
    const { startY, origStart, origEnd } = dragRef.current;
    const dur = origEnd - origStart;
    const deltaMin = snapMin(Math.round(((e.clientY - startY) / PX_PER_HOUR) * 60));
    let newStart = snapMin(origStart + deltaMin);
    let newEnd = newStart + dur;
    if (newStart < 0) {
      newEnd -= newStart;
      newStart = 0;
    }
    if (newEnd > MIN_PER_DAY) {
      const over = newEnd - MIN_PER_DAY;
      newStart = Math.max(0, newStart - over);
      newEnd = MIN_PER_DAY;
    }
    dragRef.current = null;
    setDragDy(0);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (newStart !== origStart || newEnd !== origEnd) {
      onReschedule(log.id, newStart, newEnd);
    }
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
        "absolute right-1 w-[46%] rounded-md px-2 py-1 text-[11px] font-semibold overflow-hidden shadow-soft select-none pointer-events-auto",
        draggable ? "cursor-grab touch-none active:cursor-grabbing" : ""
      )}
      style={{
        top,
        height: Math.max(height, 14),
        backgroundColor: color,
        color: "white",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      title={draggable ? "Drag to reschedule" : undefined}
    >
      <div className="truncate">{name}</div>
      <div className="text-[9px] uppercase tracking-wider opacity-80 font-mono-num">
        {fmtDuration(seg.endMin - seg.startMin)}
      </div>
    </motion.div>
  );
}
