-- Add "Meals" and "Chores & errands" to the default category set for new signups.
-- Must stay in sync (by name) with DEFAULT_CATEGORIES in src/lib/localStore.ts,
-- which migrateGuest uses to map guest categories onto cloud ones.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email);
  INSERT INTO public.categories (user_id, name, type, color, is_default) VALUES
    (NEW.id, 'Deep work',        'productive',   '#3b82f6', true),
    (NEW.id, 'Reading',          'productive',   '#8b5cf6', true),
    (NEW.id, 'Exercise',         'productive',   '#10b981', true),
    (NEW.id, 'Study',            'productive',   '#f59e0b', true),
    (NEW.id, 'Creative work',    'productive',   '#ec4899', true),
    (NEW.id, 'Side project',     'productive',   '#06b6d4', true),
    (NEW.id, 'Meals',            'productive',   '#84cc16', true),
    (NEW.id, 'Chores & errands', 'productive',   '#14b8a6', true),
    (NEW.id, 'Social media',     'unproductive', '#ef4444', true),
    (NEW.id, 'Gaming',           'unproductive', '#f97316', true),
    (NEW.id, 'Idle',             'unproductive', '#6b7280', true);
  RETURN NEW;
END; $$;
