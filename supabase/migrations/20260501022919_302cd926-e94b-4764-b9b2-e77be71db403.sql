-- Ensure only one weekly plan per user per week (atomic upsert)
DELETE FROM public.weekly_plans a
USING public.weekly_plans b
WHERE a.ctid < b.ctid
  AND a.user_id = b.user_id
  AND a.week_start = b.week_start;

ALTER TABLE public.weekly_plans
  ADD CONSTRAINT weekly_plans_user_week_unique UNIQUE (user_id, week_start);
