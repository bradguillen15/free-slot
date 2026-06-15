import type { LocalActivity, LocalCategory, LocalProfile, LocalScheduleBlock, LocalTimeLog } from "@/lib/localStore";
import type { WeeklyPlan } from "@/resources/types/weeklyPlan";

export interface ResourcesProvider {
  categories: {
    list(userId: string): Promise<LocalCategory[]>;
  };
  activities: {
    list(userId: string): Promise<LocalActivity[]>;
  };
  scheduleBlocks: {
    list(userId: string): Promise<LocalScheduleBlock[]>;
  };
  timeLogs: {
    listInRange(userId: string, startISO: string, endISO: string): Promise<LocalTimeLog[]>;
  };
  profiles: {
    get(userId: string): Promise<LocalProfile | null>;
  };
  weeklyPlans: {
    getForWeek(userId: string, weekStart: string): Promise<WeeklyPlan | null>;
  };
}
