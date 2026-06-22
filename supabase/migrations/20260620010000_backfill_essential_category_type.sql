-- Backfill default categories that should be typed as 'essential'.
-- This must run in a separate migration from the enum ALTER because Postgres
-- does not allow a freshly added enum value to be used in the same transaction.
UPDATE categories
SET type = 'essential'
WHERE is_default = true
  AND name IN ('Sleep', 'Meals', 'Chores & errands');
