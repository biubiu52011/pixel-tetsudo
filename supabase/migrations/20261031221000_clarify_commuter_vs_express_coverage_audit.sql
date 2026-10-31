-- Refine historical generic stop-integrity warnings after separating
-- commuter trains from limited express and verified station-clock matches.
-- No timetable times, plan dates or train formations are changed.
BEGIN;
WITH grouped AS (
 SELECT line_key,SUM(commuter_source_gaps) as commuter_bad,
 SUM(limited_express_source_gaps) as express_bad
 FROM public.published_conventional_plan_quality GROUP BY line_key
), express_only AS (
 SELECT line_key FROM grouped WHERE commuter_bad=0 AND express_bad>0
)
UPDATE public.published_timetable_coverage_audit a SET
 issues=ARRAY(
   SELECT DISTINCT i FROM unnest(
    ARRAY_REMOVE(
      ARRAY_REMOVE(COALESCE(a.issues,ARRAY[]::text[]),
        'SOURCE_TRAIN_HAS_FEWER_THAN_TWO_TIMED_STOPS'),
      'UNRENDERABLE_SOURCE_TEMPLATES_REQUIRE_OFFICIAL_TIMES_NOT_INTERPOLATION'
    ) || ARRAY[
      'NON_COMMUTER_LIMITED_EXPRESS_SEGMENTS_REQUIRE_SEPARATE_REVIEW',
      'NO_UNRENDERABLE_COMMUTER_TEMPLATE_FOUND'
    ]::text[]
   ) i ORDER BY i),
 checked_at=now()
WHERE a.line_key IN (SELECT line_key FROM express_only);

WITH c AS (
 SELECT line_key, COUNT(DISTINCT one_stop_source_id) n
 FROM public.published_conventional_boundary_candidates GROUP BY line_key
)
UPDATE public.published_timetable_coverage_audit a SET
 issues=ARRAY(
  SELECT DISTINCT i FROM unnest(
   COALESCE(a.issues,ARRAY[]::text[]) ||
   ARRAY['CROSS_LINE_EXACT_STATION_CLOCK_MATCH_POSSIBLE',
         'CROSS_LINE_MATCH_IS_NOT_CONFIRMED_CANONICAL_CONTINUATION']::text[]
  ) i ORDER BY i
 ),checked_at=now()
WHERE a.line_key IN (SELECT line_key FROM c WHERE n>0);
COMMIT;