export type WeeklyPlanSlot = {
  day: string;
  start: string;
  end: string;
  activity_id: string;
  activity_name: string;
};

export type WeeklyPlan = {
  id: string;
  week_start: string;
  generated_at: string;
  slots: WeeklyPlanSlot[];
};
