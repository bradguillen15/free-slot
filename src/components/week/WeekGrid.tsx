import { motion } from "framer-motion";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { fmtDuration, fmtTimeLabel, fromMin } from "@/lib/time";
import type { GapWindow } from "@/lib/gaps";

const PX_PER_HOUR = 32;
const HOURS_START = 6;
const HOURS_END = 23;
const TOTAL_HOURS = HOURS_END - HOURS_START;
const TOTAL_HEIGHT = TOTAL_HOURS * PX_PER_HOUR;

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

export type DayCellData = {
  iso: string;
  weekday: number;
  label: string;
  short: string;
  isToday: boolean;
  blocks: { seg: Seg; name: string; color: string }[];
  logs: { seg: Seg; name: string; color: string }[];
  gaps: GapWindow[];
  totalFree: number;
};

export function WeekGrid({
  days,
  onGapClick,
  onSlotClick,
}: {
  days: DayCellData[];
  onGapClick: (iso: string, gap: GapWindow) => void;
  onSlotClick: (iso: string, startMin: number) => void;
}) {
  const hours = useMemo(
    () => Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => HOURS_START + i),
    []
  );

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      {/* Day headers */}
      <div className="grid" style={{ gridTemplateColumns: `48px repeat(7, 1fr)` }}>
        <div />
        {days.map((d) => (
          <div
            key={d.iso}
            className={cn(
              "px-2 py-3 text-center border-l border-border/40",
              d.isToday && "bg-primary/[0.06]"
            )}
          >
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.short}</div>
            <div className={cn("font-display text-lg font-semibold mt-0.5", d.isToday && "text-primary")}>
              {Number(d.iso.split("-")[2])}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono-num mt-0.5">
              {fmtDuration(d.totalFree)} free
            </div>
          </div>
        ))}
      </div>

      {/* Grid body */}
      <div
        className="relative grid border-t border-border/40"
        style={{ gridTemplateColumns: `48px repeat(7, 1fr)`, height: TOTAL_HEIGHT }}
      >
        {/* Hour rail */}
        <div className="relative">
          {hours.map((h) => (
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
              d.isToday && "bg-primary/[0.03]"
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
                className="absolute left-0 right-0 hover:bg-primary/[0.05] transition-colors"
                style={{ top: (h - HOURS_START) * PX_PER_HOUR, height: PX_PER_HOUR }}
              />
            ))}

            {/* Gap markers (behind blocks) */}
            {d.gaps.map((g, i) => {
              const c = clamp({ startMin: g.start, endMin: g.end });
              if (!c) return null;
              return (
                <button
                  type="button"
                  key={`gap-${i}`}
                  onClick={() => onGapClick(d.iso, g)}
                  className={cn(
                    "absolute left-0.5 right-0.5 rounded-md border border-dashed text-left px-1.5 transition-colors",
                    g.isPeak
                      ? "border-primary/60 bg-primary/[0.08] hover:bg-primary/[0.14]"
                      : "border-border/60 bg-muted/30 hover:bg-muted/50"
                  )}
                  style={{ top: topFor(c.startMin), height: heightFor(c) }}
                  title={`${fromMin(g.start)}–${fromMin(g.end)} · ${fmtDuration(g.durationMin)}`}
                >
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    {g.isPeak ? "Peak" : "Free"}
                  </div>
                  <div className="text-[10px] font-mono-num text-foreground/80">
                    {fmtDuration(g.durationMin)}
                  </div>
                </button>
              );
            })}

            {/* Blocks */}
            {d.blocks.map((b, i) => {
              const c = clamp(b.seg);
              if (!c) return null;
              return (
                <motion.div
                  key={`b-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.01 }}
                  className="absolute left-0.5 right-0.5 rounded-sm px-1 overflow-hidden border-l-2 pointer-events-none"
                  style={{
                    top: topFor(c.startMin),
                    height: heightFor(c),
                    backgroundColor: `${b.color}33`,
                    borderLeftColor: b.color,
                  }}
                >
                  <div className="text-[10px] font-medium truncate text-foreground/85">{b.name}</div>
                </motion.div>
              );
            })}

            {/* Logs (overlaid right side) */}
            {d.logs.map((l, i) => {
              const c = clamp(l.seg);
              if (!c) return null;
              return (
                <motion.div
                  key={`l-${i}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-0.5 w-[40%] rounded-sm px-1 overflow-hidden shadow-soft pointer-events-none"
                  style={{
                    top: topFor(c.startMin),
                    height: heightFor(c),
                    backgroundColor: l.color,
                  }}
                >
                  <div className="text-[9px] font-semibold truncate text-white">{l.name}</div>
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
