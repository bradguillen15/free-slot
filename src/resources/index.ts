import { createSupabaseProvider } from "./_providers/supabase/client";
import type { ResourcesProvider } from "./_providers/types";

export type { ResourcesProvider };
export type { Category } from "./types/category";
export type { Activity } from "./types/activity";
export type { ScheduleBlock } from "./types/scheduleBlock";
export type { TimeLog } from "./types/timeLog";
export type { Profile } from "./types/profile";
export type { WeeklyPlan, WeeklyPlanSlot } from "./types/weeklyPlan";
export type { WeeklyReview } from "./types/weeklyReview";
export type { WeeklyPriority } from "./types/weeklyPriority";
export type { DailyNote } from "./types/dailyNote";
export type { InboxItem } from "./types/inboxItem";

let _provider: ResourcesProvider = createSupabaseProvider();

export function getResourcesProvider(): ResourcesProvider {
  return _provider;
}

/** Override the singleton in tests. Call with the real provider to restore. */
export function setResourcesProvider(p: ResourcesProvider): void {
  _provider = p;
}

export const resources: ResourcesProvider = new Proxy({} as ResourcesProvider, {
  get(_t, prop: string) {
    return _provider[prop as keyof ResourcesProvider];
  },
});
