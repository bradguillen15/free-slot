// Week helpers: ISO week starts on Monday.
import { addDaysISO, todayISO } from "./time";

/** Returns ISO date for the Monday of the week containing `iso`. */
export function weekStartISO(iso: string = todayISO()): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay(); // 0=Sun..6=Sat
  const diffToMonday = (day + 6) % 7; // Sun->6, Mon->0, Tue->1...
  return addDaysISO(iso, -diffToMonday);
}

export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
}

export function fmtWeekRange(weekStart: string): string {
  const end = addDaysISO(weekStart, 6);
  const [, m1, d1] = weekStart.split("-").map(Number);
  const [, m2, d2] = end.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  if (m1 === m2) return `${months[m1-1]} ${d1} – ${d2}`;
  return `${months[m1-1]} ${d1} – ${months[m2-1]} ${d2}`;
}
