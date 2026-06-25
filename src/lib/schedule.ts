export const DAYS = [
  { idx: 0, short: "Sun", label: "Sunday" },
  { idx: 1, short: "Mon", label: "Monday" },
  { idx: 2, short: "Tue", label: "Tuesday" },
  { idx: 3, short: "Wed", label: "Wednesday" },
  { idx: 4, short: "Thu", label: "Thursday" },
  { idx: 5, short: "Fri", label: "Friday" },
  { idx: 6, short: "Sat", label: "Saturday" },
];

export const WEEKDAYS = [1, 2, 3, 4, 5];
export const WEEKEND = [0, 6];

const WORK_COLOR = "#3b82f6";
const LUNCH_COLOR = "#f59e0b";

export type BlockPresetSegment = {
  name: string;
  start: string;
  end: string;
  color?: string;
};

export type BlockPreset = {
  name: string;
  start: string;
  end: string;
  days: number[];
  color: string;
  type: "fixed";
  /** When set, one click adds multiple non-overlapping blocks (e.g. work split around lunch). */
  bundle?: BlockPresetSegment[];
};

export const BLOCK_PRESETS: BlockPreset[] = [
  { name: "Sleep",   start: "23:00", end: "07:00", days: [0,1,2,3,4,5,6], color: "#6366f1", type: "fixed" },
  {
    name: "Work",
    start: "09:00",
    end: "17:00",
    days: WEEKDAYS,
    color: WORK_COLOR,
    type: "fixed",
    bundle: [
      { name: "Work", start: "09:00", end: "12:00" },
      { name: "Lunch", start: "12:00", end: "13:00", color: LUNCH_COLOR },
      { name: "Work", start: "13:25", end: "17:00" },
    ],
  },
  { name: "Gym",     start: "18:00", end: "19:00", days: [1,3,5],         color: "#10b981", type: "fixed" },
  { name: "Commute", start: "08:30", end: "09:00", days: WEEKDAYS,        color: "#94a3b8", type: "fixed" },
  { name: "Lunch",   start: "12:00", end: "13:00", days: WEEKDAYS,        color: LUNCH_COLOR, type: "fixed" },
  { name: "Dinner",  start: "19:30", end: "20:30", days: [0,1,2,3,4,5,6], color: LUNCH_COLOR, type: "fixed" },
];

/** Segments a preset expands into when applied (single segment when no bundle). */
export function presetSegments(preset: BlockPreset): BlockPresetSegment[] {
  if (preset.bundle) {
    return preset.bundle.map((seg) => ({ ...seg, color: seg.color ?? preset.color }));
  }
  return [{ name: preset.name, start: preset.start, end: preset.end, color: preset.color }];
}

export const ACTIVITY_PRESETS = [
  "Reading", "Meditation", "Side project", "Exercise", "Study", "Writing", "Learning",
];

/**
 * Prefill values for "log actual time" from a schedule block occurrence. Uses the block's
 * true span (HH:MM) for both same-day and overnight blocks — overnight logging is supported,
 * so no truncation is needed.
 */
export function logDefaultsFromBlock(
  block: { name: string; start_time: string; end_time: string }
): { start: string; end: string; defaultTitle: string } {
  return {
    start: block.start_time.slice(0, 5),
    end: block.end_time.slice(0, 5),
    defaultTitle: block.name,
  };
}
