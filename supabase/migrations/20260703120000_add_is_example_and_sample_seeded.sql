ALTER TABLE public.schedule_blocks
  ADD COLUMN is_example BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.time_logs
  ADD COLUMN is_example BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN sample_data_seeded BOOLEAN NOT NULL DEFAULT false;
