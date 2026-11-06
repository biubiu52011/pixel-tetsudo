-- JR Kyushu November 2611 6 southbound SaturdayHoliday Sakura
-- 757/759/761/763/765/767: published A train number and exact times
-- reconcile original March baseline with official autumn revised timetable.
-- All retain preexisting independent N700 family planned model; no PNG or
-- actual-carset claim. Source-only updates with derived VIEW readback.
BEGIN;
SELECT pg_advisory_xact_lock(2611,757);
DO $kyushu_southbound_sakura_2611$
DECLARE r record; validated_id bigint; validated_tt bigint; i int; affected int;
  source_station text; expected_clock text; official_clock text; total int:=0;
BEGIN
 FOR r IN SELECT * FROM (VALUES
 ('さくら757',128985,'757A','https://www.jrkyushu-timetable.jp/sp/2611/0034/00348201.html?d=20261103&t=2815506',ARRAY['Hakata','Shin-Tosu','Kurume','Kumamoto','Sendai','Kagoshima-Chuo']::text[],ARRAY['16:01','16:14','16:19','16:40','17:15','17:27']::text[],ARRAY['16:01','16:14','16:19','16:40','17:22','17:34']::text[]),
 ('さくら759',129011,'759A','https://www.jrkyushu-timetable.jp/sp/2611/0034/00348301.html?d=20261103&t=2815506',ARRAY['Hakata','Shin-Tosu','Kurume','Kumamoto','Sendai','Kagoshima-Chuo']::text[],ARRAY['17:01','17:14','17:19','17:40','18:14','18:26']::text[],ARRAY['17:01','17:14','17:19','17:40','18:21','18:33']::text[]),
 ('さくら761',129021,'761A','https://www.jrkyushu-timetable.jp/sp/2611/0034/00348401.html?d=20261104&t=2939501',ARRAY['Hakata','Shin-Tosu','Kurume','Kumamoto','Shin-Yatsushiro','Shin-Minamata','Izumi','Sendai','Kagoshima-Chuo']::text[],ARRAY['18:01','18:14','18:19','18:40','18:51','19:05','19:13','19:25','19:36']::text[],ARRAY['18:01','18:14','18:19','18:40','18:54','19:11','19:18','19:30','19:42']::text[]),
 ('さくら763',129024,'763A','https://www.jrkyushu-timetable.jp/sp/2611/0034/00348501.html?d=20261103&t=2898401',ARRAY['Hakata','Shin-Tosu','Kurume','Shin-Tamana','Kumamoto','Shin-Yatsushiro','Shin-Minamata','Izumi','Sendai','Kagoshima-Chuo']::text[],ARRAY['19:01','19:14','19:19','19:33','19:43','19:55','20:09','20:16','20:28','20:39']::text[],ARRAY['19:01','19:14','19:19','19:33','19:43','19:57','20:14','20:22','20:33','20:45']::text[]),
 ('さくら765',129028,'765A','https://www.jrkyushu-timetable.jp/sp/2611/0034/00348601.html?d=20261101&t=2939501',ARRAY['Hakata','Shin-Tosu','Kurume','Shin-Omuta','Kumamoto','Shin-Yatsushiro','Shin-Minamata','Izumi','Sendai','Kagoshima-Chuo']::text[],ARRAY['20:01','20:14','20:19','20:29','20:43','20:55','21:09','21:16','21:28','21:39']::text[],ARRAY['20:01','20:14','20:19','20:29','20:43','20:57','21:14','21:22','21:33','21:45']::text[]),
 ('さくら767',129039,'767A','https://www.jrkyushu-timetable.jp/sp/2611/0034/00347801.html?d=20261101&t=2828300',ARRAY['Hakata','Shin-Tosu','Kurume','Kumamoto','Sendai','Kagoshima-Chuo']::text[],ARRAY['20:25','20:38','20:43','21:04','21:39','21:51']::text[],ARRAY['20:25','20:38','20:43','21:04','21:46','21:58']::text[])
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
     AND t.direction_urn='odpt.RailDirection:Outbound'
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
  VALUES('2611','KyushuShinkansen','odpt.Calendar:SaturdayHoliday','odpt.RailDirection:Outbound',
    r.official_number,validated_id,r.official_url,'train_number_only') ON CONFLICT DO NOTHING;
  IF (SELECT count(*) FROM published_train_number_evidence e
    WHERE e.edition='2611' AND e.source_template_id=validated_id
     AND e.train_number=r.official_number AND e.official_source_url=r.official_url
     AND e.calendar_urn='odpt.Calendar:SaturdayHoliday'
     AND e.direction_urn='odpt.RailDirection:Outbound')<>1
    THEN RAISE EXCEPTION 'Published number mismatch %',r.service_name; END IF;
  total:=total+1;
 END LOOP;
 IF total<>6 THEN RAISE EXCEPTION 'Expected six official train numbers, got %',total; END IF;
END $kyushu_southbound_sakura_2611$;
COMMIT;