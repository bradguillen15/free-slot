import { useEffect, useState } from "react";

/**
 * Current minute-of-day (0..1439), updated every minute via a single interval.
 * Returns `null` when `active` is false (e.g. the displayed day is not today), so
 * callers can hide a "now" indicator. Behaviour mirrors the previous inline tick in
 * CalendarPage: the interval runs regardless of `active`, only the returned value is gated.
 */
export function useNowMinute(active = true): number | null {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return active ? now.getHours() * 60 + now.getMinutes() : null;
}
