-- JR East official 2026-11 Kamaishi 979d1/d2/u1/u2:
-- The legacy import wrote Tono ARRIVAL as DEPARTURE when the station
-- had a separate following Tono departure row. Exactly 19 distinct
-- regular train numbers x Weekday / SaturdayHoliday = 38 source rows.
-- Convert their first Tono event to arrival, preserving the literal clock.
-- The second Tono event remains departure; no missing clock is invented.
-- 8621D/8622D Hinabi have already been repaired and are excluded.
-- Sources:
-- https://timetables.jreast.co.jp/2611/timetable-v/979d1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/979d2.html
-- https://timetables.jreast.co.jp/2611/timetable-v/979u1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/979u2.html
BEGIN;
SELECT pg_advisory_xact_lock(26119790);
ALTER TABLE public.published_kamaishi_2611_number_roster
 DROP CONSTRAINT published_kamaishi_2611_number_roster_stop_clock_status_check;
ALTER TABLE public.published_kamaishi_2611_number_roster
 ADD CONSTRAINT published_kamaishi_2611_number_roster_stop_clock_status_check
 CHECK(stop_clock_status IN ('number_only','endpoint_verified',
  'endpoint_tono_verified','full_official_segment'));

DO $fix$
DECLARE n int;
BEGIN
 SELECT count(*) INTO n
 FROM public.manual_timetable_template_stops st
 WHERE st.arrival_clock IS NULL AND st.departure_clock IS NOT NULL
 AND coalesce(st.arrival_station_urn,st.departure_station_urn)
   ='odpt.Station:JR-East.Tono'
 AND EXISTS(
  SELECT 1 FROM public.manual_timetable_templates m
  JOIN public.published_kamaishi_2611_number_roster r
    ON r.line_key='Kamaishi' AND r.edition='2611'
    AND r.train_number=m.train_number AND r.calendar_urn=m.calendar_urn
  JOIN public.manual_timetable_template_stops next_stop
    ON next_stop.template_id=m.id AND
       next_stop.stop_sequence=st.stop_sequence+1
  WHERE m.id=st.template_id AND m.line_key='Kamaishi'
    AND r.stop_clock_status='endpoint_verified'
    AND coalesce(next_stop.arrival_station_urn,next_stop.departure_station_urn)
      ='odpt.Station:JR-East.Tono'
    AND next_stop.departure_clock IS NOT NULL);
 IF n<>38 THEN
  RAISE EXCEPTION 'Expected 38 legacy Tono arrival-as-departure rows, found %',n;
 END IF;

 UPDATE public.manual_timetable_template_stops st
 SET arrival_station_urn=st.departure_station_urn,
     departure_station_urn=NULL,
     arrival_clock=st.departure_clock,
     departure_clock=NULL
 WHERE st.arrival_clock IS NULL AND st.departure_clock IS NOT NULL
 AND st.departure_station_urn='odpt.Station:JR-East.Tono'
 AND EXISTS(
  SELECT 1 FROM public.manual_timetable_templates m
  JOIN public.published_kamaishi_2611_number_roster r
    ON r.line_key='Kamaishi' AND r.edition='2611'
    AND r.train_number=m.train_number AND r.calendar_urn=m.calendar_urn
  JOIN public.manual_timetable_template_stops next_stop
    ON next_stop.template_id=m.id AND
       next_stop.stop_sequence=st.stop_sequence+1
  WHERE m.id=st.template_id AND m.line_key='Kamaishi'
    AND r.stop_clock_status='endpoint_verified'
    AND next_stop.departure_station_urn='odpt.Station:JR-East.Tono'
    AND next_stop.departure_clock IS NOT NULL);
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>38 THEN RAISE EXCEPTION 'Tono source correction changed % rows, expected 38',n; END IF;
END $fix$;

UPDATE public.published_kamaishi_2611_number_roster r
SET stop_clock_status='endpoint_tono_verified'
WHERE r.line_key='Kamaishi' AND r.edition='2611'
AND r.stop_clock_status='endpoint_verified'
AND r.train_number IN (
 SELECT train_number FROM public.manual_timetable_templates
 WHERE line_key='Kamaishi' AND train_number NOT IN ('8621D','8622D')
);
DO $post$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.published_kamaishi_2611_number_roster
 WHERE line_key='Kamaishi' AND edition='2611'
 AND stop_clock_status='endpoint_tono_verified';
 IF n<>44 THEN
 RAISE EXCEPTION 'Expected 44 regular template endpoint+Tono proof rows, got %',n;
 END IF;
END $post$;
COMMENT ON TABLE public.published_kamaishi_2611_number_roster IS
 '2026-11 JR East Kamaishi: endpoint_tono_verified verifies first/last and Tono arrival/departure semantics, but NOT every intermediate station clock. full_official_segment applies only to dated Hinabi. Planned PNG is not real carset.';
COMMIT;