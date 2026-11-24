-- Structural repair of imported legacy events, not official clock verification.
-- Preserve all 522 event clocks and station identities. 36 first events and 113 second consecutive same-station events become departures.
-- 144 isolated intermediate events remain unchanged pending operator evidence.
BEGIN;
DO $fix$
DECLARE n integer; templates integer; events integer; origins integer; pairs integer; terminals integer; intermediate integer; invalid integer;
BEGIN
 -- Only repair original all-arrival Akita templates. No new times, stations,
 -- operating dates, vehicle claims or date-verification upgrades.
 SELECT count(*),sum(c) INTO templates,events FROM (
   SELECT t.id,count(*) c FROM manual_timetable_templates t JOIN manual_timetable_template_stops s ON s.template_id=t.id
   WHERE t.line_key='AkitaShinkansen' AND t.source_path='data/timetables/AkitaShinkansen-manual.js'
   GROUP BY t.id HAVING bool_and(s.arrival_clock IS NOT NULL AND s.arrival_station_urn IS NOT NULL AND s.departure_clock IS NULL AND s.departure_station_urn IS NULL)
 ) a;
 IF templates<>36 OR events<>442 THEN RAISE EXCEPTION 'Unexpected legacy Akita event shape: % templates, % events',templates,events; END IF;
 WITH eligible AS (
   SELECT t.id FROM manual_timetable_templates t JOIN manual_timetable_template_stops s ON s.template_id=t.id
   WHERE t.line_key='AkitaShinkansen' AND t.source_path='data/timetables/AkitaShinkansen-manual.js'
   GROUP BY t.id HAVING bool_and(s.arrival_clock IS NOT NULL AND s.arrival_station_urn IS NOT NULL AND s.departure_clock IS NULL AND s.departure_station_urn IS NULL)
 ), ordered AS (
   SELECT s.*,row_number() OVER(PARTITION BY s.template_id ORDER BY s.stop_sequence) pos,
     count(*) OVER(PARTITION BY s.template_id) total,
     count(*) OVER(PARTITION BY s.template_id,s.arrival_station_urn) station_events,
     lag(s.arrival_station_urn) OVER(PARTITION BY s.template_id ORDER BY s.stop_sequence) prev_station,
     lag(s.arrival_clock) OVER(PARTITION BY s.template_id ORDER BY s.stop_sequence) prev_clock
   FROM manual_timetable_template_stops s JOIN eligible e ON e.id=s.template_id
 )
 SELECT count(*) FILTER(WHERE pos=1 AND station_events=1),
   count(*) FILTER(WHERE station_events=2 AND prev_station=arrival_station_urn AND prev_clock<=arrival_clock),
   count(*) FILTER(WHERE pos=total AND station_events=1),
   count(*) FILTER(WHERE pos>1 AND pos<total AND station_events=1),
   count(*) FILTER(WHERE station_events>2 OR (station_events=2 AND prev_station=arrival_station_urn AND prev_clock>arrival_clock))
 INTO origins,pairs,terminals,intermediate,invalid FROM ordered;
 IF origins<>36 OR pairs<>113 OR terminals<>36 OR intermediate<>144 OR invalid<>0 THEN RAISE EXCEPTION 'Unexpected event role classification'; END IF;
 WITH eligible AS (
   SELECT t.id FROM manual_timetable_templates t JOIN manual_timetable_template_stops s ON s.template_id=t.id
   WHERE t.line_key='AkitaShinkansen' AND t.source_path='data/timetables/AkitaShinkansen-manual.js'
   GROUP BY t.id HAVING bool_and(s.arrival_clock IS NOT NULL AND s.arrival_station_urn IS NOT NULL AND s.departure_clock IS NULL AND s.departure_station_urn IS NULL)
 ), ordered AS (
   SELECT s.*,row_number() OVER(PARTITION BY s.template_id ORDER BY s.stop_sequence) pos,
     count(*) OVER(PARTITION BY s.template_id,s.arrival_station_urn) station_events,
     lag(s.arrival_station_urn) OVER(PARTITION BY s.template_id ORDER BY s.stop_sequence) prev_station,
     lag(s.arrival_clock) OVER(PARTITION BY s.template_id ORDER BY s.stop_sequence) prev_clock
   FROM manual_timetable_template_stops s JOIN eligible e ON e.id=s.template_id
 )
 UPDATE manual_timetable_template_stops s
 SET departure_station_urn=s.arrival_station_urn,departure_clock=s.arrival_clock,arrival_station_urn=NULL,arrival_clock=NULL
 FROM ordered o
 WHERE s.template_id=o.template_id AND s.stop_sequence=o.stop_sequence
 AND s.arrival_clock=o.arrival_clock AND s.arrival_station_urn=o.arrival_station_urn
 AND s.departure_clock IS NULL AND s.departure_station_urn IS NULL
 AND ((o.pos=1 AND o.station_events=1) OR (o.station_events=2 AND o.prev_station=o.arrival_station_urn AND o.prev_clock<=o.arrival_clock));
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>149 THEN RAISE EXCEPTION 'Expected 149 departure corrections, got %',n; END IF;
 IF (SELECT count(*) FROM manual_timetable_templates t JOIN manual_timetable_template_stops s ON s.template_id=t.id WHERE t.line_key='AkitaShinkansen')<>522 THEN RAISE EXCEPTION 'Event count changed'; END IF;
 UPDATE published_timetable_coverage_audit SET checked_at=now() WHERE line_key='AkitaShinkansen' AND coverage_status='sparse_review';
END $fix$;
COMMIT;