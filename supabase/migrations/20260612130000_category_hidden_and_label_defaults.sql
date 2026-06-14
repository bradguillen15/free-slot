-- Add hidden flag on categories and expand default label set.
-- Must stay in sync (by name) with DEFAULT_CATEGORIES in src/lib/localStore.ts.

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

-- Top-up new defaults for existing users (insert-if-name-missing).
INSERT INTO public.categories (user_id, name, type, color, is_default, hidden)
-- v.type comes from a VALUES list, so it is inferred as `text`; cast it to the
-- enum or the INSERT fails on a fresh database ("column type is category_type
-- but expression is text").
SELECT p.id, v.name, v.type::public.category_type, v.color, true, false
FROM public.profiles p
CROSS JOIN (VALUES
  ('Sleep',           'productive',   '#6366f1'),
  ('Movies & series', 'unproductive', '#a855f7'),
  ('Anime',           'unproductive', '#d946ef')
) AS v(name, type, color)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.user_id = p.id AND c.name = v.name
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email);
  INSERT INTO public.categories (user_id, name, type, color, is_default, hidden) VALUES
    (NEW.id, 'Deep work',        'productive',   '#3b82f6', true, false),
    (NEW.id, 'Reading',          'productive',   '#8b5cf6', true, false),
    (NEW.id, 'Exercise',         'productive',   '#10b981', true, false),
    (NEW.id, 'Study',            'productive',   '#f59e0b', true, false),
    (NEW.id, 'Creative work',    'productive',   '#ec4899', true, false),
    (NEW.id, 'Side project',     'productive',   '#06b6d4', true, false),
    (NEW.id, 'Sleep',            'productive',   '#6366f1', true, false),
    (NEW.id, 'Meals',            'productive',   '#84cc16', true, false),
    (NEW.id, 'Chores & errands', 'productive',   '#14b8a6', true, false),
    (NEW.id, 'Social media',     'unproductive', '#ef4444', true, false),
    (NEW.id, 'Gaming',           'unproductive', '#f97316', true, false),
    (NEW.id, 'Movies & series',  'unproductive', '#a855f7', true, false),
    (NEW.id, 'Anime',            'unproductive', '#d946ef', true, false),
    (NEW.id, 'Idle',             'unproductive', '#6b7280', true, false);
  RETURN NEW;
END; $$;
