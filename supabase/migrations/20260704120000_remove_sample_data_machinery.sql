DELETE FROM public.time_logs WHERE is_example;
DELETE FROM public.schedule_blocks WHERE is_example;

ALTER TABLE public.time_logs DROP COLUMN is_example;
ALTER TABLE public.schedule_blocks DROP COLUMN is_example;
ALTER TABLE public.profiles DROP COLUMN sample_data_seeded;
