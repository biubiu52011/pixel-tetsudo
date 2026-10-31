-- 2026-10-31 conventional-line stop integrity: protect against falsely
-- treating a historical train-number-only source as renderable timetable.
-- No stops or train numbers are invented. A train with fewer than two timed
-- stations cannot be placed or interpolated by the trains Edge Function.
-- Every flagged row is source_only; no verified continuation rescues it.
BEGIN;
WITH weak AS (
 SELECT m.line_key,m.id
 FROM public.manual_timetable_templates m
 LEFT JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key NOT ILIKE '%Shinkansen%'
 GROUP BY m.line_key,m.id
 HAVING COUNT(s.*)<2
   OR COUNT(s.*) FILTER(WHERE s.arrival_clock IS NOT NULL OR s.departure_clock IS NOT NULL)<2
), impacted AS (
 SELECT line_key,COUNT(*) affected
 FROM weak GROUP BY line_key
)
UPDATE public.published_timetable_coverage_audit a
SET issues=ARRAY(
 SELECT DISTINCT issue FROM unnest(
 COALESCE(a.issues,ARRAY[]::text[]) ||
 ARRAY[
 'SOURCE_TRAIN_HAS_FEWER_THAN_TWO_TIMED_STOPS',
 'UNRENDERABLE_SOURCE_TEMPLATES_REQUIRE_OFFICIAL_TIMES_NOT_INTERPOLATION',
 'STOP_INTEGRITY_AUDIT_20261031'
 ]::text[]) issue ORDER BY issue),
 checked_at=now()
FROM impacted x WHERE a.line_key=x.line_key AND x.affected>0;
COMMIT;