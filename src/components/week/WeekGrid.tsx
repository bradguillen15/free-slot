import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { fmtDuration, fmtTimeLabel, fromMin } from "@/lib/time";
import { Surface } from "@/components/Surface";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { GapWindow } from "@/lib/gaps";

const PX_PER_HOUR = 32;
const HOURS_START = 0;
const HOURS_END = 24;
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

// Types are canonical in @/lib/calendarDays; imported for internal use and re-exported for back-compat.
import type { AISlotSeg, DayCellBlock, DayCellLog, DayCellData } from "@/lib/calendarDays";
export type { AISlotSeg, DayCellBlock, DayCellLog, DayCellData };

export function WeekGrid({
  days,
  onGapClick,
  onSlotClick,
  onBlockClick,
  onLogClick,
}: {
  days: DayCellData[];
  onGapClick: (iso: string, gap: GapWindow) => void;
  onSlotClick: (iso: string, startMin: number) => void;
  onBlockClick?: (iso: string, block: DayCellBlock) => void;
  onLogClick?: (iso: string, log: DayCellLog) => void;
}) {
  const hours = useMemo(
    () => Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => HOURS_START + i),
    []
  );

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
            <div className="text-[10px] text-muted-foreground font-mono-num mt-0.5">
              {fmtDuration(d.totalFree)} free
            </div>
          </Link>
        ))}
      </div>

      {/* Grid body */}
      <div
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
                    "absolute left-0.5 right-0.5 rounded-md border border-dashed text-left px-1.5 transition-colors z-[6] overflow-hidden",
                    compact && "flex items-center",
                    g.isPeak
                      ? "border-primary/60 bg-primary/[0.08] hover:bg-primary/[0.14]"
                      : "border-border/60 bg-muted/30 hover:bg-muted/50"
                  )}
                  style={{ top: topFor(c.startMin), height: heightFor(c) }}
                  title={`${fromMin(g.start)}–${fromMin(g.end)} · ${fmtDuration(g.durationMin)}`}
                >
                  {compact ? (
                    <div className="truncate text-[9px] font-mono-num text-muted-foreground leading-none">
                      {g.isPeak ? "Peak" : "Free"} · {fmtDuration(g.durationMin)}
                    </div>
                  ) : (
                    <>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                        {g.isPeak ? "Peak" : "Free"}
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
            {d.logs.map((l, i) => {
              const c = clamp(l.seg);
              if (!c) return null;
              return (
                <motion.div
                  key={`${l.id ?? "l"}-${i}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "absolute left-0.5 right-0.5 rounded-sm px-1 overflow-hidden shadow-soft z-[20]",
                    onLogClick ? "cursor-pointer hover:brightness-90 transition-[filter]" : "pointer-events-none"
                  )}
                  style={{
                    top: topFor(c.startMin),
                    height: Math.max(heightFor(c), 10),
                    backgroundColor: l.color,
                  }}
                  onClick={onLogClick ? (e) => { e.stopPropagation(); onLogClick(d.iso, l); } : undefined}
                >
                  <div className="text-[9px] font-semibold truncate text-white">{l.name}</div>
                </motion.div>
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
