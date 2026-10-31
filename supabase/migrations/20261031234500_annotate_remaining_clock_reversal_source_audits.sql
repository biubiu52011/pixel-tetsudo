-- Add stable warning codes to the two currently affected railway audits.
-- The detailed chronology issues are computed live by the companion view.
-- No station clock is inferred, deleted or rewritten.
BEGIN;
WITH impacted AS (
 SELECT line_key,COUNT(DISTINCT template_id) affected
 FROM public.published_timetable_chronology_issues
 GROUP BY line_key
)
UPDATE public.published_timetable_coverage_audit a
SET issues=ARRAY(SELECT DISTINCT issue FROM unnest(
 COALESCE(a.issues,ARRAY[]::text[]) ||
 ARRAY[
 'SOURCE_NON_MIDNIGHT_STOP_CLOCK_REVERSAL_NEEDS_VERIFICATION',
 'EDGE_IGNORES_UNSAFE_SOURCE_ONLY_CHRONOLOGY_BEFORE_OPERATION_MATCH'
 ]::text[]) issue ORDER BY issue),
 checked_at=now()
FROM impacted i WHERE a.line_key=i.line_key AND i.affected>0;
COMMIT;