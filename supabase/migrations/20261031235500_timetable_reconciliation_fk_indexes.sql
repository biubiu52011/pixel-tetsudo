-- Two FK covering indexes on the existing recurring-plan reconciliation tables.
-- Lightweight: 930 duplicate-review rows, five continuation-gap rows
-- at the time of migration. No paid jobs, no data mutation.
BEGIN;
CREATE INDEX IF NOT EXISTS published_exact_duplicate_canonical_fk_idx
 ON public.published_timetable_exact_duplicates(canonical_template_id);
CREATE INDEX IF NOT EXISTS published_through_gap_existing_fk_idx
 ON public.published_timetable_through_service_gaps(existing_template_id);
COMMIT;