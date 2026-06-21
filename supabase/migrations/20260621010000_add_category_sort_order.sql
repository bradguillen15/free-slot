-- Persist user-defined order for categories (labels) on the management page,
-- mirroring schedule_blocks.sort_order (20260612120000). The order drives every
-- place labels are shown (pickers, dashboard filter, etc.).
ALTER TABLE public.categories
  ADD COLUMN sort_order INT NOT NULL DEFAULT 0;

-- Backfill existing users: stable initial order by creation time, per user.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) - 1 AS rn
  FROM public.categories
)
UPDATE public.categories c
SET sort_order = ranked.rn
FROM ranked
WHERE c.id = ranked.id;

-- Re-create the signup trigger so new users get a deterministic initial order
-- matching DEFAULT_CATEGORY_SEED (src/lib/localStore.ts). Carries over the
-- corrected essential types from 20260621000000. Enforced by
-- src/lib/defaultCategorySeed.test.ts (R-SYNC-1).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email);
  INSERT INTO public.categories (user_id, name, type, color, is_default, hidden, sort_order) VALUES
    (NEW.id, 'Deep work',        'productive',   '#3b82f6', true, false, 0),
    (NEW.id, 'Reading',          'productive',   '#8b5cf6', true, false, 1),
    (NEW.id, 'Exercise',         'productive',   '#10b981', true, false, 2),
    (NEW.id, 'Study',            'productive',   '#f59e0b', true, false, 3),
    (NEW.id, 'Creative work',    'productive',   '#ec4899', true, false, 4),
    (NEW.id, 'Side project',     'productive',   '#06b6d4', true, false, 5),
    (NEW.id, 'Sleep',            'essential',    '#6366f1', true, false, 6),
    (NEW.id, 'Meals',            'essential',    '#84cc16', true, false, 7),
    (NEW.id, 'Chores & errands', 'essential',    '#14b8a6', true, false, 8),
    (NEW.id, 'Social media',     'unproductive', '#ef4444', true, false, 9),
    (NEW.id, 'Gaming',           'unproductive', '#f97316', true, false, 10),
    (NEW.id, 'Movies & series',  'unproductive', '#a855f7', true, false, 11),
    (NEW.id, 'Anime',            'unproductive', '#d946ef', true, false, 12),
    (NEW.id, 'Idle',             'unproductive', '#6b7280', true, false, 13);
  RETURN NEW;
END; $$;
