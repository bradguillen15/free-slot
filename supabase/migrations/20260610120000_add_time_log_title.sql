-- Logged events get an explicit title (required in the UI going forward).
-- Backfill existing rows from their category name so old data displays unchanged.
ALTER TABLE public.time_logs ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.time_logs ADD COLUMN IF NOT EXISTS note_json jsonb;

UPDATE public.time_logs tl
SET title = COALESCE(
  (SELECT c.name FROM public.categories c WHERE c.id = tl.category_id),
  initcap(tl.type::text)
)
WHERE tl.title IS NULL;
