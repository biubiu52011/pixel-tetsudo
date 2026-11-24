-- 2611 sources: https://timetables.jreast.co.jp/2611/train/020/021881.html
-- https://timetables.jreast.co.jp/2611/train/020/021882.html
-- https://timetables.jreast.co.jp/2611/timetable-v/003d1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/003d2p.html
-- https://timetables.jreast.co.jp/2611/train/030/030472.html
BEGIN;
DO $fix$
DECLARE n integer;
BEGIN
 -- Keep existing projection stations and clocks. Only normalize explicit
 -- departure events already held in these two legacy arrival-only sequences.
 IF (SELECT count(*) FROM manual_timetable_template_stops s JOIN manual_timetable_templates t ON t.id=s.template_id WHERE t.line_key='AkitaShinkansen' AND t.id IN (774,792) AND s.arrival_station_urn IS NOT NULL AND s.arrival_clock IS NOT NULL AND s.departure_station_urn IS NULL AND s.departure_clock IS NULL)<>18 THEN RAISE EXCEPTION 'Unexpected original event shape'; END IF;
 UPDATE manual_timetable_template_stops s
 SET departure_station_urn=s.arrival_station_urn,departure_clock=s.arrival_clock,arrival_station_urn=NULL,arrival_clock=NULL
 FROM (VALUES (774,0,'Sendai','06:40'),(774,1,'Morioka','07:58'),(774,3,'Tazawako','08:32'),(774,5,'Kakunodate','08:46'),(774,7,'Omagari','09:01'),
 (792,0,'Akita','20:14'),(792,2,'Omagari','20:47'),(792,4,'Kakunodate','20:57'),(792,6,'Tazawako','21:11')) x(id,seq,station,clock)
 WHERE s.template_id=x.id AND s.stop_sequence=x.seq
 AND s.arrival_station_urn='odpt.Station:JR-East.AkitaShinkansen.'||x.station
 AND s.arrival_clock=x.clock AND s.departure_clock IS NULL AND s.departure_station_urn IS NULL;
 GET DIAGNOSTICS n=ROW_COUNT; IF n<>9 THEN RAISE EXCEPTION 'Expected nine existing departure event corrections, got %',n; END IF;
 -- 3095M is listed once in each 2611 direction/calendar table. The
 -- holiday roster marks it daily; the two detail pages agree on the
 -- currently represented Akita-line departure/arrival events.
 -- Do not mark full physical station coverage: the shared Tohoku section
 -- is a schematic projection and not a full itinerary.
 UPDATE manual_timetable_templates t SET operating_dates=ARRAY(SELECT d::date FROM generate_series('2026-11-01'::date,'2026-11-30'::date,'1 day') d ORDER BY d)
 WHERE t.id=774 AND t.line_key='AkitaShinkansen' AND t.train_number='こまち95' AND t.operating_dates IS NULL
 AND t.calendar_urn='odpt.Calendar:Weekday' AND t.direction_urn='odpt.RailDirection:Outbound'
 AND EXISTS (SELECT 1 FROM published_train_number_evidence e WHERE e.source_template_id=t.id AND e.edition='2611' AND e.train_number='3095M')
 AND NOT EXISTS(SELECT 1 FROM manual_timetable_templates x WHERE x.line_key=t.line_key AND x.train_number=t.train_number AND x.id<>t.id);
 GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Unexpected 3095M date scope'; END IF;
 -- Date scope is explicit, but do not promote canonical itinerary validity
 -- since the original source does not cover the full shared-section stops.
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=774 AND timetable_id=72215)<>9 OR (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=792 AND timetable_id=74215)<>9 THEN RAISE EXCEPTION 'Canonical event count changed'; END IF;
 UPDATE published_timetable_coverage_audit SET checked_at=now() WHERE line_key='AkitaShinkansen' AND coverage_status='sparse_review';
END $fix$;
COMMIT;