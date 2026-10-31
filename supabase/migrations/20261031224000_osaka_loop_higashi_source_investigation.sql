
-- 2026-10-31 | JR West Osaka conventional source investigation.
-- This migration does NOT add or synthesize departures, remove train numbers,
-- copy a weekday run into a holiday run, or merge disparate Canonical trains.
-- Official sources are for diagnosis; unauthorized bulk republication is not made.
-- https://timetable.jr-odekake.net/line-timetable/2861?arv_node=&day=4&dep_node=&hour=&index=&min=&month=10&year=2026
-- https://timetable.jr-odekake.net/station-timetable/2815073002
-- https://www.westjr.co.jp/railroad/project/project2/
BEGIN;
DO $assert$
DECLARE loop_weak INT;higashi_weak INT;no_version INT;h_end INT;
BEGIN
 SELECT count(*) INTO loop_weak FROM public.manual_timetable_templates t WHERE t.line_key='OsakaLoop' AND
 (SELECT count(*) FROM public.manual_timetable_template_stops s WHERE s.template_id=t.id)=1;
 SELECT count(*) INTO higashi_weak FROM public.manual_timetable_templates t WHERE t.line_key='OsakaHigashi' AND
 (SELECT count(*) FROM public.manual_timetable_template_stops s WHERE s.template_id=t.id)=1;
 SELECT count(*) INTO no_version FROM public.manual_timetable_templates
 WHERE line_key IN('OsakaLoop','OsakaHigashi') AND source_revision_date IS NULL;
 SELECT count(*) INTO h_end FROM public.manual_timetable_templates
 WHERE line_key IN('OsakaLoop','OsakaHigashi') AND calendar_urn='odpt.Calendar:SaturdayHoliday'
 AND train_number LIKE '%H';
 IF loop_weak<>203 OR higashi_weak<>94 OR no_version<>1436 OR h_end<>722 THEN
   RAISE EXCEPTION 'Osaka import counts have changed (loop %, Higashi %, unversioned %, holiday H %): re-investigate before auditing',
     loop_weak,higashi_weak,no_version,h_end;
 END IF;
END $assert$;

UPDATE public.published_timetable_coverage_audit a
SET issues=ARRAY(SELECT DISTINCT flag FROM unnest(
 COALESCE(a.issues,ARRAY[]::text[]) ||
 ARRAY[
 'OSAKA_2026_STOP_203_SINGLE_STATION_INBOUND_SOURCE_FRAGMENTS',
 'OSAKA_2026_SINGLE_STATION_MARKERS_ARE_NOT_TIMETABLE_TRAINS',
 'OSAKA_2026_MANUAL_SOURCE_REVISION_MISSING',
 'JR_WEST_HOLIDAY_SUFFIX_H_MAY_BE_CALENDAR_MARKER_VALIDATE_TRAIN_NUMBER',
 'NO_AUTOMATIC_SINGLE_STATION_TIMETABLE_COMPLETION'
 ]::text[]) flag ORDER BY flag), checked_at=now()
WHERE a.line_key='OsakaLoop';

UPDATE public.published_timetable_coverage_audit a
SET issues=ARRAY(SELECT DISTINCT flag FROM unnest(
 COALESCE(a.issues,ARRAY[]::text[]) ||
 ARRAY[
 'OSAKA_HIGASHI_2026_STOP_94_SHINOSAKA_SINGLE_STATION_INBOUND_SOURCE_FRAGMENTS',
 'OSAKA_HIGASHI_2026_25_CANDIDATE_SAME_STATION_CLOCK_DIFFERENT_TRAIN_NUMBER',
 'OSAKA_HIGASHI_2026_MANY_FULL_SERVICES_ALREADY_REACH_OSAKA',
 'OSAKA_HIGASHI_2026_MANUAL_SOURCE_REVISION_MISSING',
 'JR_WEST_HOLIDAY_SUFFIX_H_MAY_BE_CALENDAR_MARKER_VALIDATE_TRAIN_NUMBER',
 'NO_AUTO_MERGE_OR_STATION_TIME_INTERPOLATION'
 ]::text[]) flag ORDER BY flag),checked_at=now()
WHERE a.line_key='OsakaHigashi';
COMMIT;