import { useEffect, type RefObject } from "react";

const PX_PER_HOUR = 56;

/**
 * Scrolls the day-timeline container to ~now (today) or ~7am (other days) whenever the
 * displayed day changes — not on every minute tick, which would yank the viewport away
 * from the user's own scrolling. CalendarPage-specific.
 */
export function useAutoScrollToHour(scrollRef: RefObject<HTMLElement>, date: string, isToday: boolean) {
  useEffect(() => {
    if (!scrollRef.current) return;
    const current = new Date();
    const minute = isToday ? current.getHours() * 60 + current.getMinutes() : 7 * 60;
    const top = (minute / 60) * PX_PER_HOUR - 120;
    scrollRef.current.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [date, isToday]); // eslint-disable-line react-hooks/exhaustive-deps -- scrollRef is a stable useRef; scroll on date change only
}
