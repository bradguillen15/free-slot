-- Add 'essential' to the category_type enum.
-- Used for human necessities (sleep, meals, hygiene) that are excluded
-- from the productive/unproductive ratio in analytics.
ALTER TYPE category_type ADD VALUE IF NOT EXISTS 'essential';
