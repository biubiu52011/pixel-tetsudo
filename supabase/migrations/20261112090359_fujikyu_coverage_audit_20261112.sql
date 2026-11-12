-- Register the Fujikyu static-plan coverage baseline without implying official completeness.
BEGIN;

INSERT INTO public.published_timetable_coverage_audit(
  line_key, template_count, calendar_count, direction_count, sampled_count, coverage_status, issues, checked_at
)
SELECT
  'Fujikyu',
  count(*)::integer,
  count(DISTINCT calendar_urn)::integer,
  count(DISTINCT direction_urn)::integer,
  0,
  'unverified',
  ARRAY[
    'GTFS_STATIC_SOURCE_NOT_OPERATOR_EDITION',
    'FUTURE_EDITION_DATE_RECHECK_REQUIRED',
    'NO_REALTIME_SOURCE'
  ]::text[],
  now()
FROM public.manual_timetable_templates
WHERE line_key='Fujikyu'
  AND source_path like 'gtfs:tokyogtfs:rail.zip:%:Fujikyu.Fujikyu'
ON CONFLICT (line_key) DO UPDATE SET
  template_count=EXCLUDED.template_count,
  calendar_count=EXCLUDED.calendar_count,
  direction_count=EXCLUDED.direction_count,
  sampled_count=EXCLUDED.sampled_count,
  coverage_status=EXCLUDED.coverage_status,
  issues=EXCLUDED.issues,
  checked_at=EXCLUDED.checked_at;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.published_timetable_coverage_audit
    WHERE line_key='Fujikyu'
      AND template_count=152
      AND calendar_count=2
      AND direction_count=2
      AND coverage_status='unverified'
  ) THEN
    RAISE EXCEPTION 'Fujikyu coverage audit baseline was not registered';
  END IF;
END $$;

COMMIT;
