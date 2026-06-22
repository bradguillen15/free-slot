-- Fix handle_new_user() so new signups get the same default category types as
-- guest mode (DEFAULT_CATEGORY_SEED) and as existing users after the
-- 20260620000000 essential-type backfill.
--
-- The 20260620000000 migration added the 'essential' enum value and the
-- 20260620010000 migration UPDATEd existing default rows (Sleep, Meals,
-- Chores & errands) from 'productive' to
-- 'essential', but it never redefined this trigger — so new signups kept getting
-- those three as 'productive'. This re-creates the trigger with the corrected
-- types. Enforced by src/lib/defaultCategorySeed.test.ts (R-SYNC-1).
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
    (NEW.id, 'Sleep',            'essential',    '#6366f1', true, false),
    (NEW.id, 'Meals',            'essential',    '#84cc16', true, false),
    (NEW.id, 'Chores & errands', 'essential',    '#14b8a6', true, false),
    (NEW.id, 'Social media',     'unproductive', '#ef4444', true, false),
    (NEW.id, 'Gaming',           'unproductive', '#f97316', true, false),
    (NEW.id, 'Movies & series',  'unproductive', '#a855f7', true, false),
    (NEW.id, 'Anime',            'unproductive', '#d946ef', true, false),
    (NEW.id, 'Idle',             'unproductive', '#6b7280', true, false);
  RETURN NEW;
END; $$;
