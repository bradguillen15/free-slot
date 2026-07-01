import { cn } from "@/lib/utils";

/** Tiny floor so zero-length segments remain visible. */
export const MIN_BAR_PX = 4;

/** Below this height two text rows don't fit — collapse to one line. */
export const COMPACT_BAR_PX = 36;

export function barHeightFromDuration(durationPx: number): number {
  return Math.max(durationPx, MIN_BAR_PX);
}

export function isCompactBar(barHeightPx: number): boolean {
  return barHeightPx < COMPACT_BAR_PX;
}

export const timelineBarBaseClassName = "absolute overflow-hidden rounded-sm";

export const timelineLogBarClassName = cn(
  timelineBarBaseClassName,
  "shadow-sm",
);

export const timelinePlannedBarClassName = cn(
  timelineBarBaseClassName,
  "border-l-2",
);

/** Translucent fill — separate layer so any color string works. */
export const timelineLogFillLayerClassName = "absolute inset-0 rounded-[inherit] opacity-50";

export const timelinePlannedFillLayerClassName = "absolute inset-0 rounded-[inherit] opacity-20";

export const timelineLogLabelClassName = cn(
  "truncate font-semibold leading-none text-foreground",
  "text-[9px] sm:text-[10px]",
);

export const timelinePlannedLabelClassName = cn(
  "truncate font-medium leading-none text-foreground/90",
  "text-[9px] sm:text-[10px]",
);

export const timelineLabelRowClassName = "relative z-10 flex h-full items-center px-1.5 min-w-0";

export const timelineLabelStackClassName =
  "relative z-10 flex h-full flex-col justify-center px-1.5 min-w-0 gap-0.5";
