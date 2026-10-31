-- All operators: Supabase stores only recurring published Weekday and
-- SaturdayHoliday train plans, not service-date-specific run instances.
-- Applied to production 2026-10-31. On the production DB the result was:
-- 25,731 dated train_runs removed (217,572 stop rows cascade-deleted);
-- 4 run-scoped service_exceptions removed;
-- 15 SpecificDate timetable templates and 15 isolated canonicals removed.
-- Existing published source schedules and 92,424 recurring templates remain.
--
-- This migration intentionally deletes legacy operational data. It preserves
-- the 10 Shinkansen lines' SINGLE_CALENDAR audit warnings rather than
-- inventing holiday departures. It is idempotent on an already-clean DB.

BEGIN;
DO $cleanup$
BEGIN
  LOCK TABLE public.train_runs, public.train_run_stops,
    public.service_exceptions, public.manual_timetable_templates,
    public.manual_timetable_template_stops, public.train_timetables,
    public.train_timetable_members IN SHARE ROW EXCLUSIVE MODE;

  -- These rows cannot be deleted blindly if a previously unseen writer
  -- linked a dated run to a canonical recurring published timetable.
  IF EXISTS (
    SELECT 1 FROM public.train_runs
    WHERE canonical_timetable_id IS NOT NULL OR service_date IS NULL
  ) THEN
    RAISE EXCEPTION 'Unexpected run references/date; review before cleanup';
  END IF;

  -- Specific-date sources must not be a shared member of a recurring train.
  IF EXISTS (
    SELECT 1 FROM public.manual_timetable_templates t
    JOIN public.train_timetable_members m ON m.source_template_id = t.id
    JOIN public.train_timetable_members n ON n.timetable_id = m.timetable_id
      AND n.source_template_id <> t.id
    WHERE t.calendar_urn LIKE 'odpt.Calendar:SpecificDate:%'
  ) THEN
    RAISE EXCEPTION 'SpecificDate template shares canonical itinerary';
  END IF;

  -- The legacy rows are dated events, not published repeating service plans.
  DELETE FROM public.train_runs;
  -- ON DELETE CASCADE removes dated stop rows and per-run exceptions.
  DELETE FROM public.train_timetables c
  WHERE EXISTS (
    SELECT 1 FROM public.train_timetable_members m
    JOIN public.manual_timetable_templates t ON t.id = m.source_template_id
    WHERE m.timetable_id = c.id
      AND t.calendar_urn LIKE 'odpt.Calendar:SpecificDate:%'
  );
  DELETE FROM public.manual_timetable_templates
  WHERE calendar_urn LIKE 'odpt.Calendar:SpecificDate:%';

  IF EXISTS(SELECT 1 FROM public.train_runs) OR
     EXISTS(SELECT 1 FROM public.train_run_stops) OR
     EXISTS(SELECT 1 FROM public.service_exceptions) OR
     EXISTS(SELECT 1 FROM public.manual_timetable_templates
       WHERE calendar_urn NOT IN ('odpt.Calendar:Weekday', 'odpt.Calendar:SaturdayHoliday'))
  THEN
    RAISE EXCEPTION 'Cleanup incomplete; rolling back';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid =
      'public.manual_timetable_templates'::regclass
      AND conname = 'manual_timetable_templates_recurring_calendar_only') THEN
    ALTER TABLE public.manual_timetable_templates
      ADD CONSTRAINT manual_timetable_templates_recurring_calendar_only
      CHECK (calendar_urn IN ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid =
      'public.train_runs'::regclass
      AND conname = 'train_runs_legacy_write_disabled') THEN
    ALTER TABLE public.train_runs
      ADD CONSTRAINT train_runs_legacy_write_disabled CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid =
      'public.train_run_stops'::regclass
      AND conname = 'train_run_stops_legacy_write_disabled') THEN
    ALTER TABLE public.train_run_stops
      ADD CONSTRAINT train_run_stops_legacy_write_disabled CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid =
      'public.service_exceptions'::regclass
      AND conname = 'service_exceptions_legacy_write_disabled') THEN
    ALTER TABLE public.service_exceptions
      ADD CONSTRAINT service_exceptions_legacy_write_disabled CHECK (false);
  END IF;
END
$cleanup$;

-- Reconcile bookkeeping without modifying unverified-coverage statuses.
WITH stats AS (
  SELECT line_key,
         count(*)::integer AS templates,
         count(DISTINCT calendar_urn)::integer AS calendars,
         count(DISTINCT direction_urn)::integer AS directions,
         count(*) FILTER (WHERE source_path LIKE 'official-sampled:%')::integer AS sampled
  FROM public.manual_timetable_templates
  GROUP BY line_key
)
UPDATE public.published_timetable_coverage_audit a
SET template_count = s.templates, calendar_count = s.calendars,
    direction_count = s.directions, sampled_count = s.sampled,
    checked_at = now()
FROM stats s
WHERE a.line_key = s.line_key
  AND (a.template_count IS DISTINCT FROM s.templates OR
       a.calendar_count IS DISTINCT FROM s.calendars OR
       a.direction_count IS DISTINCT FROM s.directions OR
       a.sampled_count IS DISTINCT FROM s.sampled);
COMMIT;
