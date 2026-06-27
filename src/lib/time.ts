// Time utilities for day timeline (minutes since 00:00).

export type TimeFormat = "12h" | "24h";

export const MIN_PER_DAY = 24 * 60;

export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function fromMin(min: number): string {
  const m = ((min % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function fmtTimeLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function fmtDisplayTime(hhmm: string, format: TimeFormat): string {
  if (format === "24h") return hhmm;
  return fmtTimeLabel(hhmm);
}

export function fmtDisplayTimeFromMin(min: number, format: TimeFormat): string {
  return fmtDisplayTime(fromMin(min), format);
}

export function to12HourParts(hhmm: string): { hour12: number; minute: number; period: "AM" | "PM" } {
  const [h24, m] = hhmm.split(":").map(Number);
  const period: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour12, minute: m || 0, period };
}

export function from12HourParts(hour12: number, minute: number, period: "AM" | "PM"): string {
  let h24 = hour12 % 12;
  if (period === "PM") h24 += 12;
  return `${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * Parse free-typed time text into a 24-hour `HH:MM` string, or `null` if invalid.
 * Accepts `H:MM`/`HH:MM` (24h) and `h:mm AM/PM` (any case, optional space); a
 * meridiem always forces 12-hour interpretation regardless of display format.
 */
export function parseTimeInput(raw: string): string | null {
  const match = raw.trim().toLowerCase().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
  if (!match) return null;
  let h = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3];
  if (minute > 59) return null;
  if (meridiem) {
    if (h < 1 || h > 12) return null;
    h = h % 12;
    if (meridiem === "pm") h += 12;
  } else if (h > 23) {
    return null;
  }
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function fmtDuration(mins: number): string {
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function todayISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDaysISO(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return todayISO(dt);
}

export function isoToWeekday(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function fmtDayHeading(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

// Range overlap helpers; supports overnight blocks (end < start)
export function expandRange(start: number, end: number): Array<[number, number]> {
  if (end === start) return []; // zero-length, not a full-day wrap
  if (end > start) return [[start, end]];
  // overnight wrap (e.g. 23:00 → 07:00)
  return [[start, MIN_PER_DAY], [0, end]];
}

/** Duration in minutes between two HH:MM times; end <= start wraps past midnight. */
export function durationMinutes(start: string, end: string): number {
  const a = toMin(start);
  const b = toMin(end);
  if (b === a) return 0;
  return b > a ? b - a : MIN_PER_DAY - a + b;
}

/**
 * Subtract `cuts` from `base`, both being half-open [start, end) intervals in the same
 * minute-space. Used to clip planned schedule blocks against logged time so the schedule
 * guide only shows the time not yet accounted for. Pass pre-expanded (overnight-split)
 * segments — see `expandRange`. Zero-length cuts are ignored; results keep `base` order.
 */
export function subtractIntervals(
  base: Array<[number, number]>,
  cuts: Array<[number, number]>,
): Array<[number, number]> {
  const validCuts = cuts.filter(([s, e]) => e > s);
  const result: Array<[number, number]> = [];
  for (const [bs, be] of base) {
    if (be <= bs) continue;
    let pieces: Array<[number, number]> = [[bs, be]];
    for (const [cs, ce] of validCuts) {
      const next: Array<[number, number]> = [];
      for (const [ps, pe] of pieces) {
        if (ce <= ps || cs >= pe) {
          next.push([ps, pe]); // no overlap
          continue;
        }
        if (cs > ps) next.push([ps, cs]); // left remainder
        if (ce < pe) next.push([ce, pe]); // right remainder
      }
      pieces = next;
    }
    for (const p of pieces) result.push(p);
  }
  return result;
}
