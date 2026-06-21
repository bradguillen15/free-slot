export type Mode = "cloud" | "guest";

/** Centralized React Query keys — always use these for invalidation. */
export const queryKeys = {
  root: ["freeslot"] as const,
  categories: (mode: Mode, userId: string | null) =>
    ["freeslot", "categories", mode, userId] as const,
  activities: (mode: Mode, userId: string | null) =>
    ["freeslot", "activities", mode, userId] as const,
  scheduleBlocks: (mode: Mode, userId: string | null) =>
    ["freeslot", "scheduleBlocks", mode, userId] as const,
  timeLogs: (mode: Mode, userId: string | null, startISO: string, endISO: string) =>
    ["freeslot", "timeLogs", mode, userId, startISO, endISO] as const,
  timeLogsPrefix: (mode: Mode, userId: string | null) =>
    ["freeslot", "timeLogs", mode, userId] as const,
  profile: (mode: Mode, userId: string | null) =>
    ["freeslot", "profile", mode, userId] as const,
  weeklyPlan: (userId: string, weekStart: string) =>
    ["freeslot", "weeklyPlan", userId, weekStart] as const,
  weeklyReview: (userId: string, weekStart: string) =>
    ["freeslot", "weeklyReview", userId, weekStart] as const,
  weeklyPriorities: (userId: string | null, weekStart: string) =>
    ["freeslot", "weeklyPriorities", userId, weekStart] as const,
  dailyNote: (mode: Mode, userId: string | null, date: string) =>
    ["freeslot", "dailyNote", mode, userId, date] as const,
  dailyNotesForWeek: (mode: Mode, userId: string | null, startISO: string, endISO: string) =>
    ["freeslot", "dailyNotesForWeek", mode, userId, startISO, endISO] as const,
  inboxItems: (mode: Mode, userId: string | null) =>
    ["freeslot", "inboxItems", mode, userId] as const,
  allDailyNoteDates: (mode: Mode, userId: string | null) =>
    ["freeslot", "allDailyNoteDates", mode, userId] as const,
};

export function isGuestQueryKey(key: readonly unknown[]): boolean {
  return key[0] === "freeslot" && key[2] === "guest";
}
