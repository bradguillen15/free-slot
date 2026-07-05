import { addDaysISO, todayISO } from "@/lib/time";
import { weekStartISO } from "@/lib/week";

export type PeriodKind = "day" | "week" | "month";

export type Period = {
  kind: PeriodKind;
  start: string;
  end: string;
};

function monthEndISO(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

function monthStartISO(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

function diffDaysISO(start: string, end: string): number {
  const [y1, m1, d1] = start.split("-").map(Number);
  const [y2, m2, d2] = end.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86400000);
}

export function resolvePeriod(kind: PeriodKind, anchorISO: string = todayISO()): Period {
  switch (kind) {
    case "day":
      return { kind, start: anchorISO, end: anchorISO };
    case "week": {
      const start = weekStartISO(anchorISO);
      return { kind, start, end: addDaysISO(start, 6) };
    }
    case "month":
      return { kind, start: monthStartISO(anchorISO), end: monthEndISO(anchorISO) };
  }
}

export function periodDays(period: Period): string[] {
  const span = diffDaysISO(period.start, period.end);
  return Array.from({ length: span + 1 }, (_, i) => addDaysISO(period.start, i));
}
