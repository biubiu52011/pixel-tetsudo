-- The global coverage audit is NOT the November date proof.
-- Replace the now-obsolete five-sample status with 186 source snapshots,
-- while retaining full-source/date/license uncertainty beyond November 2611.
BEGIN;
DO $block$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='Kawagoe')<>186
  OR (SELECT count(*) FROM public.published_kawagoe_2611_source_roster)<>186
  OR (SELECT coverage_status FROM public.published_timetable_coverage_audit WHERE line_key='Kawagoe')<>'sampled'
 THEN RAISE EXCEPTION 'KAWAGOE_2611_CANNOT_RECLASSIFY_SAMPLE_AUDIT'; END IF;
END $block$;
UPDATE public.published_timetable_coverage_audit
SET template_count=186,calendar_count=2,direction_count=2,sampled_count=0,
 coverage_status='unverified',
 issues=ARRAY[
  'NOVEMBER_2026_SOURCE_EDITION_ONLY_CONFIRMED',
  '2026_11_KAWAGOE_ENDPOINTS_186_OF_186_MATCH_JR_EAST',
  'ALL_SIX_STOPS_FROM_ODPT_TRAIN_TIMETABLE_SOURCE',
  'FUTURE_EDITION_DATE_RECHECK_REQUIRED',
  '2026_ODPT_CHALLENGE_LIMITED_LICENSE_SCOPE_MUST_BE_OBSERVED',
  'E231_3000_AND_209_3500_SHARED_FLEET_NO_UNIQUE_TRAIN_MODEL'
 ]::text[],
 checked_at=now()
WHERE line_key='Kawagoe';
COMMIT;
