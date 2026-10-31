-- All operators use recurring Weekday and SaturdayHoliday plan calendars.
-- Report true canonical train totals separately from line-scoped source rows.
-- Preserve all line-specific source templates, including shared Chiyoda aliases.
-- This file documents the already-applied production migration. Idempotent.
--
-- Reference: JR East 2026-11 published Okawa branch schedule.
-- https://timetables.jreast.co.jp/2611/timetable/tt0311/0311011.html
-- https://timetables.jreast.co.jp/2611/train/015/015671.html
-- https://timetables.jreast.co.jp/2611/train/065/066521.html
-- https://timetables.jreast.co.jp/2611/train/065/066021.html
-- https://timetables.jreast.co.jp/2611/train/015/015641.html
-- https://timetables.jreast.co.jp/2611/train/065/066181.html

DO $verify$
DECLARE holiday_count integer; branch_rows integer; shared_rows integer;
BEGIN
 SELECT COUNT(*) INTO holiday_count FROM public.manual_timetable_templates
 WHERE line_key='TsurumiOkawa' AND calendar_urn='odpt.Calendar:SaturdayHoliday';
 SELECT COUNT(*) INTO branch_rows FROM public.manual_timetable_templates
 WHERE line_key='ChiyodaBranch';
 SELECT COUNT(*) INTO shared_rows FROM public.manual_timetable_templates b
 JOIN public.train_timetable_members bm ON bm.source_template_id=b.id
 JOIN public.train_timetable_members cm ON cm.timetable_id=bm.timetable_id AND cm.source_template_id<>b.id
 JOIN public.manual_timetable_templates c ON c.id=cm.source_template_id
 WHERE b.line_key='ChiyodaBranch' AND c.line_key='Chiyoda'
   AND b.calendar_urn=c.calendar_urn AND b.train_number=c.train_number;
 IF holiday_count<>6 OR branch_rows<>238 OR shared_rows<>238 THEN
   RAISE EXCEPTION 'Expected Okawa 6, ChiyodaBranch 238, shared canonical 238. Found %,%,%',
     holiday_count,branch_rows,shared_rows;
 END IF;
END$verify$;

CREATE OR REPLACE VIEW public.published_timetable_plan_unique_counts AS
WITH canonical AS (
 SELECT c.id canonical_timetable_id,c.calendar_urn operating_pattern,
        COUNT(*)::integer source_templates,
        COUNT(DISTINCT t.line_key)::integer source_lines
 FROM public.train_timetables c
 JOIN public.train_timetable_members m ON m.timetable_id=c.id
 JOIN public.manual_timetable_templates t ON t.id=m.source_template_id
 WHERE c.calendar_urn IN('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
   AND t.calendar_urn=c.calendar_urn
 GROUP BY c.id,c.calendar_urn
)
SELECT operating_pattern,
       COUNT(*)::bigint unique_canonical_trains,
       COALESCE(SUM(source_templates),0)::bigint source_templates,
       COALESCE(SUM(source_templates - 1),0)::bigint duplicate_source_segments,
       COUNT(*) FILTER(WHERE source_lines>1)::bigint cross_line_trains,
       COUNT(*) FILTER(WHERE source_templates>1)::bigint multi_source_trains
FROM canonical GROUP BY operating_pattern;
ALTER VIEW public.published_timetable_plan_unique_counts
SET (security_barrier=true,security_invoker=false);
COMMENT ON VIEW public.published_timetable_plan_unique_counts IS
'All operators: Weekday/SaturdayHoliday canonical physical count, accounting for duplicate source segments and cross-line aliases.';
GRANT SELECT ON public.published_timetable_plan_unique_counts TO anon,authenticated;

-- Three outbound and three inbound holiday trains are expected on Okawa.
-- The legacy weekday sources require a separate source-revision check.
UPDATE public.published_timetable_coverage_audit
SET coverage_status='calendar_review',
    issues=ARRAY(SELECT DISTINCT v FROM unnest(
       array_remove(COALESCE(issues,ARRAY[]::text[]),'LOW_TEMPLATE_COUNT_NEEDS_EXTERNAL_BASELINE') ||
       ARRAY['JR_EAST_2026_OKAWA_HOLIDAY_3_OUT_3_IN_VERIFIED',
             'OKAWA_WEEKDAY_AND_REVISIONS_REQUIRE_REVIEW']::text[]) v ORDER BY v),
    checked_at=now()
WHERE line_key='TsurumiOkawa';

-- The 238 branch rows are source aliases for Chiyoda canonical services.
-- They are not separate rolling-stock formations, unique train journeys,
-- or an independently complete two-direction branch timetable.
UPDATE public.published_timetable_coverage_audit
SET issues=ARRAY(SELECT DISTINCT v FROM unnest(
       COALESCE(issues,ARRAY[]::text[]) ||
       ARRAY['ALL_238_CHIYODA_BRANCH_TEMPLATES_SHARE_MAIN_CANONICAL',
             'CHiYODA_BRANCH_ROUTE_PROJECTION_STILL_REQUIRES_REVIEW']::text[]) v ORDER BY v),
    checked_at=now()
WHERE line_key='ChiyodaBranch';
