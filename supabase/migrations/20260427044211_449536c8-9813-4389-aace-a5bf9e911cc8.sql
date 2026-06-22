
-- Enums
CREATE TYPE public.category_type AS ENUM ('productive', 'unproductive');
CREATE TYPE public.block_type AS ENUM ('fixed', 'waste_expected');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  peak_hours JSONB DEFAULT '{"start":"09:00","end":"12:00"}'::jsonb,
  include_weekends BOOLEAN NOT NULL DEFAULT true,
  weekly_review_day INT NOT NULL DEFAULT 0, -- 0=Sun
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  type category_type NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cats all" ON public.categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Schedule blocks (recurring template)
CREATE TABLE public.schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories ON DELETE SET NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  days_of_week INT[] NOT NULL DEFAULT '{}',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  type block_type NOT NULL DEFAULT 'fixed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own blocks all" ON public.schedule_blocks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Time logs
CREATE TABLE public.time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  category_id UUID REFERENCES public.categories ON DELETE SET NULL,
  type category_type NOT NULL,
  title TEXT,
  notes TEXT,
  note_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own logs all" ON public.time_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_logs_user_date ON public.time_logs (user_id, date);

-- Activities
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories ON DELETE SET NULL,
  target_hours_per_week NUMERIC NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own acts all" ON public.activities FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Weekly priorities
CREATE TABLE public.weekly_priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  week_start DATE NOT NULL,
  activity_id UUID NOT NULL REFERENCES public.activities ON DELETE CASCADE,
  rank INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start, activity_id)
);
ALTER TABLE public.weekly_priorities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prio all" ON public.weekly_priorities FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Weekly plan (cached AI output)
CREATE TABLE public.weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  week_start DATE NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (user_id, week_start)
);
ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plan all" ON public.weekly_plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Weekly review
CREATE TABLE public.weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  week_start DATE NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  insights TEXT,
  UNIQUE (user_id, week_start)
);
ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own review all" ON public.weekly_reviews FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger: auto-create profile + default categories on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email);
  INSERT INTO public.categories (user_id, name, type, color, is_default) VALUES
    (NEW.id, 'Deep work',     'productive',   '#3b82f6', true),
    (NEW.id, 'Reading',       'productive',   '#8b5cf6', true),
    (NEW.id, 'Exercise',      'productive',   '#10b981', true),
    (NEW.id, 'Study',         'productive',   '#f59e0b', true),
    (NEW.id, 'Creative work', 'productive',   '#ec4899', true),
    (NEW.id, 'Side project',  'productive',   '#06b6d4', true),
    (NEW.id, 'Social media',  'unproductive', '#ef4444', true),
    (NEW.id, 'Gaming',        'unproductive', '#f97316', true),
    (NEW.id, 'Idle',          'unproductive', '#6b7280', true);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
