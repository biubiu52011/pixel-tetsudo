-- Keep verified 2026-11-07 source gap visible; do not invent clock or car data.
-- JR-West station timetable (18 southbound departures, 7 Nov 2026):
-- https://timetable.jr-odekake.net/station-timetable/2947036001?date=20261107
BEGIN;
SELECT pg_advisory_xact_lock(26110916);
DO $assert$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates t
 JOIN public.manual_timetable_template_stops s
   ON s.template_id=t.id AND s.stop_sequence=0
 WHERE t.line_key='KakogawaLine'
   AND t.calendar_urn='odpt.Calendar:SaturdayHoliday'
   AND s.departure_station_urn='odpt.Station:JR-West.KakogawaLine.Nishiwaki-Shi'
   AND t.destination_urns @> ARRAY['odpt.Station:JR-West.KakogawaLine.Kakogawa']::text[])<>1
 THEN RAISE EXCEPTION 'Nishiwaki 2611 outbound source scope changed: re-audit published count'; END IF;
END $assert$;
UPDATE public.published_timetable_coverage_audit a
 SET issues=(SELECT array_agg(DISTINCT e ORDER BY e) FROM unnest(
     a.issues || ARRAY[
       'NISHIWAKI_TO_KAKOGAWA_20261107_OFFICIAL_18_DEPARTURES_ONLY_1_SQL_ORIGIN',
       'MISSING_17_VERIFIED_SOURCE_STOP_CHAINS_NO_SYNTHETIC_POSITIONS'
     ]::text[]) AS e),
     checked_at=now(),
     coverage_status='sparse_review'
 WHERE line_key='KakogawaLine' AND template_count=90;
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_timetable_coverage_audit
 WHERE line_key='KakogawaLine' AND template_count=90
 AND 'NISHIWAKI_TO_KAKOGAWA_20261107_OFFICIAL_18_DEPARTURES_ONLY_1_SQL_ORIGIN'=ANY(issues))<>1
 THEN RAISE EXCEPTION 'Missing Kakogawa gap audit reference'; END IF;
END $verify$;
COMMIT;
