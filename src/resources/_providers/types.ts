import type { LocalActivity, LocalCategory, LocalProfile, LocalScheduleBlock, LocalTimeLog } from "@/lib/localStore";
import type { WeeklyPlan } from "@/resources/types/weeklyPlan";
import type { WeeklyReview } from "@/resources/types/weeklyReview";
import type { WeeklyPriority } from "@/resources/types/weeklyPriority";

export type TimeLogInput = {
  id?: string;
  date: string;
  start_time: string;
  end_time: string;
  category_id: string;
  type: "productive" | "unproductive";
  title?: string | null;
  notes?: string | null;
};

export type TimeLogPatch = {
  start_time: string;
  end_time: string;
  category_id: string;
  type: "productive" | "unproductive";
  title?: string | null;
  notes?: string | null;
  date?: string;
};

export type ActivityInput = {
  id?: string;
  name: string;
  category_id: string | null;
  target_hours_per_week: number;
  is_active: boolean;
};

export type ScheduleBlockInput = Partial<LocalScheduleBlock> & {
  name: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  type: "fixed" | "waste_expected";
  color: string;
};

export type CategoryInput = {
  id?: string;
  name?: string;
  color?: string;
  type?: "productive" | "unproductive";
  hidden?: boolean;
};

export interface ResourcesProvider {
  categories: {
    list(userId: string): Promise<LocalCategory[]>;
    upsert(userId: string, input: CategoryInput): Promise<LocalCategory>;
    delete(userId: string, id: string): Promise<void>;
    insertMany(userId: string, items: Omit<LocalCategory, "id" | "created_at">[]): Promise<LocalCategory[]>;
  };
  activities: {
    list(userId: string): Promise<LocalActivity[]>;
    upsert(userId: string, input: ActivityInput): Promise<LocalActivity>;
    delete(userId: string, id: string): Promise<void>;
    insertMany(userId: string, items: Omit<LocalActivity, "id" | "created_at">[]): Promise<LocalActivity[]>;
  };
  scheduleBlocks: {
    list(userId: string): Promise<LocalScheduleBlock[]>;
    upsert(userId: string, input: ScheduleBlockInput): Promise<LocalScheduleBlock>;
    delete(userId: string, id: string): Promise<void>;
    reorder(userId: string, orderedIds: string[]): Promise<void>;
    insertMany(userId: string, items: Omit<LocalScheduleBlock, "id" | "created_at">[]): Promise<LocalScheduleBlock[]>;
  };
  timeLogs: {
    listInRange(userId: string, startISO: string, endISO: string): Promise<LocalTimeLog[]>;
    insert(userId: string, input: TimeLogInput): Promise<LocalTimeLog>;
    update(userId: string, id: string, patch: TimeLogPatch): Promise<LocalTimeLog>;
    delete(userId: string, id: string): Promise<void>;
    insertMany(userId: string, items: Omit<LocalTimeLog, "id" | "created_at">[]): Promise<LocalTimeLog[]>;
  };
  profiles: {
    get(userId: string): Promise<LocalProfile | null>;
    update(userId: string, patch: Partial<LocalProfile>): Promise<void>;
  };
  weeklyPlans: {
    getForWeek(userId: string, weekStart: string): Promise<WeeklyPlan | null>;
    delete(userId: string, weekStart: string): Promise<void>;
  };
  weeklyReviews: {
    getForWeek(userId: string, weekStart: string): Promise<WeeklyReview | null>;
  };
  weeklyPriorities: {
    listForWeek(userId: string, weekStart: string): Promise<WeeklyPriority[]>;
    upsertMany(userId: string, weekStart: string, priorities: { activity_id: string; rank: number }[]): Promise<WeeklyPriority[]>;
  };
  functions: {
    generateWeeklyReview(body: {
      week_start: string;
      planned: { name: string; minutes: number }[];
      actual: { name: string; minutes: number }[];
      productive_ratio: number;
      total_tracked: number;
    }): Promise<{ review: { insights: string } }>;
    generateWeeklyPlan(body: {
      week_start: string;
      gaps: unknown[];
      activities: unknown[];
      priorities?: unknown[];
    }): Promise<{ slots: unknown[] }>;
    deleteAccount(userId: string): Promise<void>;
  };
}
