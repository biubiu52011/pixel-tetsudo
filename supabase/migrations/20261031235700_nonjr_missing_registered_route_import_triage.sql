-- Reconcile the twelve registered non-JR route IDs that have NO
-- exact-line-key source plan. Do not copy another route's timetable.
-- Distinguish possible live API capability from SQL-published coverage.
BEGIN;
CREATE OR REPLACE VIEW public.published_nonjr_registered_line_import_triage
WITH (security_invoker=true, security_barrier=true) AS
SELECT l.id AS line_key,
       l.odpt_operator AS operator_key,
       l.odpt_railway AS odpt_railway,
       l.timetable_api_enabled AS external_timetable_api_configured,
       l.sql_planned_fallback_enabled AS sql_planned_fallback_configured,
       0::bigint AS published_weekday_templates,
       0::bigint AS published_holiday_templates,
       CASE
         WHEN l.timetable_api_enabled=true
           THEN 'external_api_configured_sql_plan_not_imported'
         ELSE 'no_published_timetable_and_no_api_configured'
       END::text AS next_action_class,
       'Do not infer or copy train times or models from adjacent railway lines'::text AS protection
FROM public.railway_lines l
WHERE l.odpt_operator IS NOT NULL
  AND l.odpt_operator NOT LIKE 'JR-%'
  AND NOT EXISTS (
    SELECT 1 FROM public.manual_timetable_templates m
    WHERE m.line_key=l.id
  );
COMMENT ON VIEW public.published_nonjr_registered_line_import_triage IS
 'Routes with registered ID but no exact-key published Weekday/SaturdayHoliday SQL data. External API configured != actual API confirmed available. Never fabricate timetables.';
REVOKE ALL ON public.published_nonjr_registered_line_import_triage FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.published_nonjr_registered_line_import_triage TO service_role;
DO $assert$
DECLARE n int; enabled int; disabled int;
BEGIN
 SELECT count(*),count(*) FILTER(WHERE external_timetable_api_configured=true),
        count(*) FILTER(WHERE external_timetable_api_configured=false)
 INTO n,enabled,disabled
 FROM public.published_nonjr_registered_line_import_triage;
 IF n<>12 OR enabled<>5 OR disabled<>7 THEN
  RAISE EXCEPTION 'Registered route missing-plan source count changed: total %, API configured %, no API %',n,enabled,disabled;
 END IF;
END $assert$;
UPDATE public.published_timetable_coverage_audit a
SET issues=ARRAY(SELECT DISTINCT flag FROM unnest(
 COALESCE(a.issues,ARRAY[]::text[]) ||
 ARRAY['NEW_SHUTTLE_REGISTERED_TIMETABLE_OWNER_METADATA_CORRECTED',
       'HISTORICAL_SOURCE_RAILWAY_URN_RETAINS_LEGACY_OPERATOR_PENDING_REFERENCE_SAFE_MIGRATION']::text[]
) flag ORDER BY flag),
checked_at=now()
WHERE a.line_key='NewShuttle';
COMMIT;