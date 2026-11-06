-- 2026-11 JR Kyushu 768A/770A official family N700 northbound
-- service-level numbers. Source original March-based timetable has 
-- Kagoshima-Chuo/Sendai departure 6-8 min late against published 2611.
-- Fix ONLY source stop records, verify derived VIEW in transaction;
-- do not invent PNG or actual carset. 
BEGIN;
SELECT pg_advisory_xact_lock(2611,768);
DO $kyushu_northbound_768_770_2611$
DECLARE r record; validated_id bigint; validated_tt bigint; i int; affected int;
  source_station text; expected_clock text; official_clock text; total int:=0;
BEGIN
 FOR r IN SELECT * FROM (VALUES
 ('さくら768',129004,'768A','https://www.jrkyushu-timetable.jp/sp/2611/0035/00359201.html?d=20261101&t=2814400',ARRAY['Kagoshima-Chuo','Sendai','Kumamoto','Kurume','Shin-Tosu','Hakata']::text[],ARRAY['16:17','16:29','17:04','17:26','17:30','17:45']::text[],ARRAY['16:09','16:22','17:04','17:26','17:30','17:45']::text[]),
 ('さくら770',129018,'770A','https://www.jrkyushu-timetable.jp/sp/2611/0035/00359301.html?d=20261101&t=2815505',ARRAY['Kagoshima-Chuo','Sendai','Izumi','Shin-Minamata','Shin-Yatsushiro','Kumamoto','Kurume','Shin-Tosu','Hakata']::text[],ARRAY['17:07','17:20','17:32','17:39','17:53','18:04','18:25','18:30','18:45']::text[],ARRAY['17:01','17:13','17:25','17:32','17:50','18:04','18:25','18:30','18:45']::text[])
 ) AS v(service_name,source_id,official_number,official_url,stations,old_clocks,published_clocks)
 LOOP
  IF array_length(r.stations,1)<>array_length(r.old_clocks,1)
    OR array_length(r.stations,1)<>array_length(r.published_clocks,1)
    THEN RAISE EXCEPTION 'Invalid station/clock source list %',r.service_name; END IF;
  SELECT t.id,tm.timetable_id INTO STRICT validated_id,validated_tt
   FROM manual_timetable_templates t
   JOIN train_timetable_members tm ON tm.source_template_id=t.id AND tm.member_role='primary'
   JOIN train_timetables tt ON tt.id=tm.timetable_id AND tt.group_evidence='source_only'
   JOIN train_timetable_vehicle_mappings vm ON vm.timetable_id=tm.timetable_id
       AND vm.source_template_id=t.id
       AND vm.vehicle_type='N700系'
       AND vm.mapping_level='official_service_vehicle_plan'
       AND vm.actual_vehicle_confirmed=false
   JOIN evidence_sources es ON es.id=vm.source_id
       AND es.source_type='official' AND es.evidence_grade='B'
   WHERE t.id=r.source_id AND t.line_key='KyushuShinkansen'
     AND t.calendar_urn='odpt.Calendar:SaturdayHoliday'
     AND t.direction_urn='odpt.RailDirection:Inbound'
     AND t.railway_urn='odpt.Railway:JR-Kyushu.KyushuShinkansen'
     AND t.train_number=r.service_name
     AND t.source_path='official-sampled:holiday:https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf';
  IF (SELECT count(*) FROM manual_timetable_template_stops s WHERE s.template_id=validated_id)<>array_length(r.stations,1)
   OR (SELECT count(*) FROM train_timetable_stops z WHERE z.source_template_id=validated_id AND z.timetable_id=validated_tt)<>array_length(r.stations,1)
   THEN RAISE EXCEPTION 'Source stops mismatch %',r.service_name; END IF;
  IF EXISTS(SELECT 1 FROM published_train_number_evidence e
     WHERE e.source_template_id=validated_id AND e.edition='2611'
       AND (e.train_number<>r.official_number OR e.official_source_url<>r.official_url))
   THEN RAISE EXCEPTION 'Conflicting published number %',r.service_name; END IF;
  FOR i IN 1..array_length(r.stations,1) LOOP
   source_station:='odpt.Station:JR-Kyushu.KyushuShinkansen.'||r.stations[i];
   expected_clock:=r.old_clocks[i];official_clock:=r.published_clocks[i];
   IF i<array_length(r.stations,1) THEN
    UPDATE manual_timetable_template_stops s SET departure_clock=official_clock
    WHERE s.template_id=validated_id AND s.stop_sequence=i-1
     AND s.departure_station_urn=source_station AND s.departure_clock=expected_clock
     AND s.arrival_station_urn IS NULL AND s.arrival_clock IS NULL;
    GET DIAGNOSTICS affected=ROW_COUNT;
    IF affected<>1 THEN RAISE EXCEPTION 'Departure mismatch % stop %',r.service_name,i; END IF;
    IF (SELECT count(*) FROM train_timetable_stops z
      WHERE z.timetable_id=validated_tt AND z.source_template_id=validated_id AND z.stop_sequence=i-1
        AND z.departure_station_urn=source_station AND z.departure_clock=official_clock)<>1
      THEN RAISE EXCEPTION 'View departure mismatch % stop %',r.service_name,i; END IF;
   ELSE
    UPDATE manual_timetable_template_stops s SET arrival_clock=official_clock
    WHERE s.template_id=validated_id AND s.stop_sequence=i-1
      AND s.arrival_station_urn=source_station AND s.arrival_clock=expected_clock
      AND s.departure_station_urn IS NULL AND s.departure_clock IS NULL;
    GET DIAGNOSTICS affected=ROW_COUNT;
    IF affected<>1 THEN RAISE EXCEPTION 'Terminal mismatch %',r.service_name; END IF;
    IF (SELECT count(*) FROM train_timetable_stops z
       WHERE z.timetable_id=validated_tt AND z.source_template_id=validated_id AND z.stop_sequence=i-1
       AND z.arrival_station_urn=source_station AND z.arrival_clock=official_clock)<>1
      THEN RAISE EXCEPTION 'View terminal mismatch %',r.service_name; END IF;
   END IF;
  END LOOP;
  INSERT INTO published_train_number_evidence
   (edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,official_source_url,verification_scope)
  VALUES('2611','KyushuShinkansen','odpt.Calendar:SaturdayHoliday','odpt.RailDirection:Inbound',
    r.official_number,validated_id,r.official_url,'train_number_only') ON CONFLICT DO NOTHING;
  IF (SELECT count(*) FROM published_train_number_evidence e
    WHERE e.edition='2611' AND e.source_template_id=validated_id
     AND e.train_number=r.official_number AND e.official_source_url=r.official_url
     AND e.calendar_urn='odpt.Calendar:SaturdayHoliday'
     AND e.direction_urn='odpt.RailDirection:Inbound')<>1
    THEN RAISE EXCEPTION 'Published number mismatch %',r.service_name; END IF;
  total:=total+1;
 END LOOP;
 IF total<>2 THEN RAISE EXCEPTION 'Expected two official train numbers, got %',total; END IF;
END $kyushu_northbound_768_770_2611$;
COMMIT;