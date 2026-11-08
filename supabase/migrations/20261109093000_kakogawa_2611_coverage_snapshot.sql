-- Coverage audit is a snapshot, not a timetable authority. Keep it
-- explicitly sparse while the remaining inbound sources are undocumented.
BEGIN;
SELECT pg_advisory_xact_lock(26110914);
UPDATE public.published_timetable_coverage_audit
 SET template_count=(SELECT count(*) FROM public.manual_timetable_templates
                       WHERE line_key='KakogawaLine'),
     calendar_count=2,
     direction_count=2,
     sampled_count=0,
     coverage_status='sparse_review',
     issues=ARRAY[
       'LOW_TEMPLATE_COUNT_NEEDS_EXTERNAL_BASELINE',
       'MISSING_NISHIWAKISHI_ORIGIN_INBOUND_SCHEDULES',
       'SOURCE_REVISION_DATE_UNVERIFIED'
     ]::text[],
     checked_at=now()
 WHERE line_key='KakogawaLine' AND coverage_status='sparse_review';
DO $v$
BEGIN
 IF (SELECT template_count FROM public.published_timetable_coverage_audit
    WHERE line_key='KakogawaLine')<>90
 OR (SELECT count(*) FROM public.manual_timetable_templates
     WHERE line_key='KakogawaLine' AND source_revision_date IS NOT NULL)<>0
 THEN RAISE EXCEPTION 'Kakogawa coverage audit source state drift'; END IF;
END $v$;
COMMIT;
