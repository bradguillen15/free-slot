-- Add 'essential' to the category_type enum.
-- Used for human necessities (sleep, meals, hygiene) that are excluded
-- from the productive/unproductive ratio in analytics.
ALTER TYPE category_type ADD VALUE IF NOT EXISTS 'essential';

-- Update the default seed categories that were previously typed as
-- 'productive' but should be 'essential'.
UPDATE categories
SET type = 'essential'
WHERE is_default = true
  AND name IN ('Sleep', 'Meals', 'Chores & errands');
