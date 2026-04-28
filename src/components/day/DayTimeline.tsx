import { motion } from "framer-motion";
import { useMemo } from "react";
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

type Segment = { startMin: number; endMin: number };

function segmentsForDay(start: string, end: string): Segment[] {
  const s = toMin(start);
  const e = toMin(end);
  return expandRange(s, e).map(([a, b]) => ({ startMin: a, endMin: b }));
}

export function DayTimeline({
  blocks, logs, categories, onSlotClick, currentMinute,
}: {
  blocks: ScheduleBlock[];
  logs: TimeLog[];
  categories: Category[];
  onSlotClick: (startMin: number) => void;
  currentMinute: number | null;
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

        {/* Click-to-log overlay (right of time gutter) */}
        <div className="absolute inset-y-0 left-16 right-0">
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

        {/* Schedule blocks (template) — left lane */}
        <div className="absolute inset-y-0 left-16 right-0">
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

        {/* Time logs — right lane */}
        <div className="absolute inset-y-0 left-16 right-0">
          {logs.flatMap((l, idx) => {
            const cat = l.category_id ? catMap[l.category_id] : undefined;
            const color = cat?.color ?? (l.type === "productive" ? "hsl(var(--productive))" : "hsl(var(--unproductive))");
            return segmentsForDay(l.start_time, l.end_time).map((seg, i) => (
              <LogBar
                key={`${l.id}-${i}`}
                seg={seg}
                color={color}
                name={cat?.name ?? l.type}
                index={idx}
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
        "absolute rounded-md px-2 py-1 text-[11px] font-medium overflow-hidden border-l-[3px]",
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

function LogBar({ seg, color, name, index }: { seg: Segment; color: string; name: string; index: number }) {
  const top = (seg.startMin / 60) * PX_PER_HOUR;
  const height = ((seg.endMin - seg.startMin) / 60) * PX_PER_HOUR;
  return (
    <motion.div
      initial={{ opacity: 0, x: 4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      className="absolute right-1 w-[46%] rounded-md px-2 py-1 text-[11px] font-semibold overflow-hidden shadow-soft"
      style={{
        top,
        height: Math.max(height, 14),
        backgroundColor: color,
        color: "white",
      }}
    >
      <div className="truncate">{name}</div>
      <div className="text-[9px] uppercase tracking-wider opacity-80 font-mono-num">
        {fmtDuration(seg.endMin - seg.startMin)}
      </div>
    </motion.div>
  );
}
