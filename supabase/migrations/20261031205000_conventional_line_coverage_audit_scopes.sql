-- Audit corrections: Chiyoda branch has bidirectional published plans
-- assembled from Chiyoda main + branch source projections, not a single-way
-- branch timetable. Keep all canonical aliases and both recurring calendars.
-- Kawagoe (5 trains total) is a SAMPLE, not a complete 2026 timetable.
-- Sanyo Main/Sanin Main require corridor/segment review, not fabricated
-- weekday->holiday duplication.
BEGIN;
DO $branch$
DECLARE branch_rows integer; reverse_weekday integer; reverse_weekend integer;
BEGIN
 SELECT COUNT(*) INTO branch_rows FROM public.manual_timetable_templates
 WHERE line_key='ChiyodaBranch';
 WITH candidates AS (
 SELECT m.id,m.calendar_urn
 FROM manual_timetable_templates m
 JOIN manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key='Chiyoda' AND m.direction_urn='odpt.RailDirection:TokyoMetro.YoyogiUehara'
 GROUP BY m.id HAVING COUNT(*) FILTER(WHERE s.arrival_station_urn LIKE '%Chiyoda.KitaAyase'
 OR s.departure_station_urn LIKE '%Chiyoda.KitaAyase')>0
 AND COUNT(*) FILTER(WHERE s.arrival_station_urn LIKE '%Chiyoda.Ayase'
 OR s.departure_station_urn LIKE '%Chiyoda.Ayase')>0
 )
 SELECT COUNT(*) FILTER(WHERE calendar_urn='odpt.Calendar:Weekday'),
 COUNT(*) FILTER(WHERE calendar_urn='odpt.Calendar:SaturdayHoliday')
 INTO reverse_weekday,reverse_weekend FROM candidates;
 IF branch_rows<>238 OR reverse_weekday<>124 OR reverse_weekend<>111 THEN
 RAISE EXCEPTION 'Chiyoda branch source projection changed: alias %, reverse W % H %',
 branch_rows,reverse_weekday,reverse_weekend;
 END IF;
END $branch$;

UPDATE public.published_timetable_coverage_audit a
SET coverage_status='calendar_review',
issues=(SELECT array_agg(DISTINCT flag ORDER BY flag) FROM unnest(
 array_remove(COALESCE(a.issues,ARRAY[]::text[]),'BRANCH_HAS_ONLY_KITAAYASE_DIRECTION')
 || ARRAY[
 'BRANCH_VIEW_PROJECTION_WEEKDAY_249_OUT_AND_BACK_HOLIDAY_224',
 'BRANCH_SOURCE_238_NORTHBOUND_CANONICAL_ALIASES_MAIN_235_SOUTHBOUND_PROJECTED',
 'BRANCH_BOTH_DIRECTIONS_AVAILABLE_IN_EDGE_PROJECTION',
 'BRANCH_SOURCE_CALENDAR_AND_REVISION_NOT_FULLY_VERIFIED'
 ]::text[]) flag),
checked_at=now()
WHERE a.line_key='ChiyodaBranch';

UPDATE public.published_timetable_coverage_audit a
SET issues=(SELECT array_agg(DISTINCT flag ORDER BY flag) FROM unnest(
 COALESCE(a.issues,ARRAY[]::text[]) || ARRAY[
 'KAWAGOE_2026_PUBLISHED_TIMETABLE_HAS_MANY_MORE_THAN_5_TRAINS',
 'KAWAGOE_SOURCE_IS_SAMPLE_NOT_A_COMPLETE_DAY_PLAN',
 'DO_NOT_FILL_REMAINDER_BY_WEEKDAY_HOLIDAY_COPY'
 ]::text[]) flag),
checked_at=now()
WHERE line_key='Kawagoe' AND a.coverage_status='sampled' AND a.template_count=5;

UPDATE public.published_timetable_coverage_audit a
SET issues=(SELECT array_agg(DISTINCT flag ORDER BY flag) FROM unnest(
 COALESCE(a.issues,ARRAY[]::text[]) || ARRAY[
 'LONG_MAIN_LINE_MULTIPLE_SEGMENTS_REQUIRE_SEGMENT_SCOPE_CHECK',
 'DO_NOT_TREAT_EXISTING_OLD_MANUAL_COUNTS_AS_COMPLETE'
 ]::text[]) flag),
checked_at=now()
WHERE a.line_key IN('SanyoMain','SaninMain') AND a.coverage_status='sparse_review';

COMMIT;