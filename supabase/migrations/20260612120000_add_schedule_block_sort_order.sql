-- Persist user-defined order for schedule blocks on the management page.
ALTER TABLE public.schedule_blocks
  ADD COLUMN sort_order INT NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) - 1 AS rn
  FROM public.schedule_blocks
)
UPDATE public.schedule_blocks sb
SET sort_order = ranked.rn
FROM ranked
WHERE sb.id = ranked.id;
