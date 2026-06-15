export type WeeklyReview = {
  id: string;
  week_start: string;
  insights: string | null;
  planned_vs_actual: unknown;
  completed_at: string;
};
