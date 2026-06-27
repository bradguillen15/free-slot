ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS time_format text NOT NULL DEFAULT '24h'
  CHECK (time_format IN ('12h', '24h'));
