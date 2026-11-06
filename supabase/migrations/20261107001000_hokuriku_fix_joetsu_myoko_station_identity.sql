-- Hokuriku Shinkansen station identity ownership fix.
-- The sole 2015+ shinkansen stop between Iiyama and Itoigawa is
-- 上越妙高 (Joetsu-Myoko). Legacy line_stations and 30 source templates
-- mistakenly call it 妙高高原 (Myoko-Kogen), a DIFFERENT existing station
-- on the Echigo Tokimeki conventional line. Do not rename/delete the
-- real Myoko-Kogen station; ADD the missing real shinkansen station.
-- Coordinates (MapFan Hokuriku Shinkansen station):
-- https://mapfan.com/spots/SCH%2CJ%2CXKF
-- Reuse existing tables; no new stations catalog or parallel scripts.
BEGIN;
SELECT pg_advisory_xact_lock(2611,1199);
DO $correct_hokuriku_myoko_station$
DECLARE n int;
BEGIN
 IF EXISTS(select 1 from stations where id='Joetsu-Myoko')
 THEN RAISE EXCEPTION 'Existing Joetsu-Myoko catalog row requires manual reconciliation'; END IF;
 IF (select count(*) from stations where id='Myoko-Kogen')<>1
 THEN RAISE EXCEPTION 'Missing independent conventional Myoko-Kogen station'; END IF;
 IF (SELECT count(*) FROM line_stations WHERE line_id='HokurikuShinkansen' AND station_index=12 AND station_name='Myoko-Kogen')<>1
 THEN RAISE EXCEPTION 'Unrecognized existing Hokuriku line station row'; END IF;
 IF (SELECT count(*) FROM manual_timetable_template_stops s
  JOIN manual_timetable_templates t ON t.id=s.template_id
  WHERE t.line_key='HokurikuShinkansen'
   AND (s.arrival_station_urn='odpt.Station:JR-East.HokurikuShinkansen.Myoko-Kogen'
     OR s.departure_station_urn='odpt.Station:JR-East.HokurikuShinkansen.Myoko-Kogen'))<>30
 THEN RAISE EXCEPTION 'Legacy Myoko-Kogen station row count changed'; END IF;
 INSERT INTO stations(id,name,latitude,longitude)
 VALUES('Joetsu-Myoko','Joetsu-Myoko',37.0812454,138.2484185);
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'Missing official station insert'; END IF;
 UPDATE line_stations SET station_name='Joetsu-Myoko'
 WHERE line_id='HokurikuShinkansen' AND station_index=12 AND station_name='Myoko-Kogen';
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'Incorrect line station identity update'; END IF;
 UPDATE manual_timetable_template_stops s SET
  departure_station_urn=CASE WHEN s.departure_station_urn='odpt.Station:JR-East.HokurikuShinkansen.Myoko-Kogen'
  THEN 'odpt.Station:JR-East.HokurikuShinkansen.Joetsu-Myoko' ELSE s.departure_station_urn END,
  arrival_station_urn=CASE WHEN s.arrival_station_urn='odpt.Station:JR-East.HokurikuShinkansen.Myoko-Kogen'
  THEN 'odpt.Station:JR-East.HokurikuShinkansen.Joetsu-Myoko' ELSE s.arrival_station_urn END
 FROM manual_timetable_templates t WHERE t.id=s.template_id
  AND t.line_key='HokurikuShinkansen'
  AND (s.departure_station_urn='odpt.Station:JR-East.HokurikuShinkansen.Myoko-Kogen'
    OR s.arrival_station_urn='odpt.Station:JR-East.HokurikuShinkansen.Myoko-Kogen');
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>30 THEN RAISE EXCEPTION 'Unexpected normalized station rows %',n; END IF;
 IF EXISTS(SELECT 1 FROM manual_timetable_template_stops s
    JOIN manual_timetable_templates t ON t.id=s.template_id
    WHERE t.line_key='HokurikuShinkansen'
      AND (s.arrival_station_urn LIKE '%.Myoko-Kogen'
        OR s.departure_station_urn LIKE '%.Myoko-Kogen'))
  OR (SELECT count(*) FROM manual_timetable_template_stops s
   JOIN manual_timetable_templates t ON t.id=s.template_id
   WHERE t.line_key='HokurikuShinkansen'
     AND (s.arrival_station_urn='odpt.Station:JR-East.HokurikuShinkansen.Joetsu-Myoko'
      OR s.departure_station_urn='odpt.Station:JR-East.HokurikuShinkansen.Joetsu-Myoko'))<>30
  OR (SELECT count(*) FROM train_timetable_stops z
    WHERE z.line_key='HokurikuShinkansen' AND z.station_urn='odpt.Station:JR-East.HokurikuShinkansen.Joetsu-Myoko')<>30
 THEN RAISE EXCEPTION 'Hokuriku corrected shinkansen source/view not aligned'; END IF;
 IF (SELECT count(*) FROM stations WHERE id='Myoko-Kogen')<>1
 THEN RAISE EXCEPTION 'Conventional Myoko-Kogen must not be deleted'; END IF;
END $correct_hokuriku_myoko_station$;
COMMIT;