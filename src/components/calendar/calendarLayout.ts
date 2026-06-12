/** Shared width/padding for day, week, and month views. */
export const CALENDAR_PAGE_SHELL =
  "px-6 md:px-10 max-w-[1400px] mx-auto w-full pb-8";

/** Day view: propagate height through the calendar shell on large screens. */
export const CALENDAR_PAGE_SHELL_FILL =
  "lg:flex lg:flex-col lg:flex-1 lg:min-h-0";

export function isCalendarRoute(pathname: string): boolean {
  if (pathname === "/app") return true;
  if (pathname.startsWith("/app/week")) return true;
  if (pathname.startsWith("/app/month")) return true;
  return false;
}
