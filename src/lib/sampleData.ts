// Shared first-run sample data template — the single source of truth for both
// guest bootstrap (localStore.ts) and the one-time cloud seed. Keeping this in
// one TypeScript module (rather than mirroring it in a SQL trigger, the way
// DEFAULT_CATEGORY_SEED drifted from handle_new_user() across several migrations)
// avoids a second copy that can silently go stale.

export type SampleScheduleBlockSeed = {
  name: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  color: string;
  type: "fixed" | "waste_expected";
};

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

export const SAMPLE_SCHEDULE_BLOCKS: SampleScheduleBlockSeed[] = [
  { name: "Sleep", start_time: "23:00", end_time: "07:00", days_of_week: ALL_DAYS, color: "#6366f1", type: "fixed" },
  { name: "Work", start_time: "09:00", end_time: "17:00", days_of_week: WEEKDAYS, color: "#3b82f6", type: "fixed" },
  { name: "Lunch", start_time: "12:00", end_time: "13:00", days_of_week: WEEKDAYS, color: "#f59e0b", type: "fixed" },
];

export type SampleTimeLogTemplate = {
  categoryName: string;
  start_time: string;
  end_time: string;
  type: "productive" | "unproductive" | "essential";
  title: string;
};

const SAMPLE_TIME_LOG_TEMPLATES: SampleTimeLogTemplate[] = [
  { categoryName: "Deep work", start_time: "09:00", end_time: "10:30", type: "productive", title: "Deep work" },
  { categoryName: "Exercise", start_time: "18:00", end_time: "18:45", type: "productive", title: "Exercise" },
  { categoryName: "Reading", start_time: "20:00", end_time: "20:30", type: "productive", title: "Reading" },
];

export type SampleTimeLogSeed = {
  date: string;
  start_time: string;
  end_time: string;
  category_id: string | null;
  type: "productive" | "unproductive" | "essential";
  title: string;
  is_example: true;
};

/** Builds the sample-log rows for `todayISO`, mapping each template to a real category id by name. Templates whose category is missing from `categoryIdByName` are skipped. */
export function buildSampleTimeLogs(
  todayISO: string,
  categoryIdByName: Map<string, string>
): SampleTimeLogSeed[] {
  return SAMPLE_TIME_LOG_TEMPLATES.filter((t) => categoryIdByName.has(t.categoryName)).map((t) => ({
    date: todayISO,
    start_time: t.start_time,
    end_time: t.end_time,
    category_id: categoryIdByName.get(t.categoryName)!,
    type: t.type,
    title: t.title,
    is_example: true,
  }));
}
