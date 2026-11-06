-- JR-Kyushu Nov-2026 Shinkansen: 6 exact published northbound
-- SaturdayHoliday Sakura service numbers. Preserve preexisting N700
-- family planned stock and do NOT guess a specific physical N700 train.
-- Correct existing manual source clocks under full old-value protection;
-- train_timetable_stops is a derived read-only VIEW.
BEGIN;
SELECT pg_advisory_xact_lock(2611,752);
DO $kyushu_northbound_sakura_2611$
DECLARE r record; validated_id bigint; validated_tt bigint; i int; affected int;
  source_station text; expected_clock text; official_clock text; total int:=0;
BEGIN
 FOR r IN SELECT * FROM (VALUES
 ('さくら744',129052,'744A','https://www.jrkyushu-timetable.jp/sp/2611/0035/00358001.html?d=20261103&t=2814400',ARRAY['Kagoshima-Chuo','Sendai','Izumi','Shin-Minamata','Shin-Yatsushiro','Kumamoto','Chikugo-Funagoya','Kurume','Shin-Tosu','Hakata']::text[],ARRAY['07:42','07:54','08:06','08:13','08:27','08:39','08:56','09:04','09:08','09:23']::text[],ARRAY['07:35','07:48','07:59','08:07','08:24','08:39','08:56','09:04','09:08','09:23']::text[]),
 ('さくら746',129053,'746A','https://www.jrkyushu-timetable.jp/sp/2611/0035/00358101.html?d=20261103&t=0829200',ARRAY['Kagoshima-Chuo','Sendai','Izumi','Shin-Minamata','Shin-Yatsushiro','Kumamoto','Shin-Omuta','Kurume','Shin-Tosu','Hakata']::text[],ARRAY['08:43','08:55','09:07','09:14','09:28','09:39','09:53','10:04','10:08','10:23']::text[],ARRAY['08:36','08:48','09:00','09:07','09:25','09:39','09:53','10:04','10:08','10:23']::text[]),
 ('さくら748',129054,'748A','https://www.jrkyushu-timetable.jp/sp/2611/0035/00358201.html?d=20261101&t=2898400',ARRAY['Kagoshima-Chuo','Sendai','Kumamoto','Kurume','Shin-Tosu','Hakata']::text[],ARRAY['09:17','09:30','10:04','10:26','10:30','10:45']::text[],ARRAY['09:09','09:22','10:04','10:26','10:30','10:45']::text[]),
 ('さくら750',129051,'750A','https://www.jrkyushu-timetable.jp/sp/2611/0035/00358301.html?d=20261103&t=2828304',ARRAY['Kagoshima-Chuo','Sendai','Izumi','Shin-Minamata','Shin-Yatsushiro','Kumamoto','Shin-Tamana','Kurume','Shin-Tosu','Hakata']::text[],ARRAY['09:41','09:53','10:05','10:13','10:27','10:39','10:49','11:03','11:08','11:23']::text[],ARRAY['09:35','09:47','09:59','10:06','10:24','10:39','10:49','11:03','11:08','11:23']::text[]),
 ('さくら752',128991,'752A','https://www.jrkyushu-timetable.jp/sp/2611/0035/00358401.html?d=20261103&t=2814400',ARRAY['Kagoshima-Chuo','Sendai','Izumi','Shin-Minamata','Shin-Yatsushiro','Kumamoto','Kurume','Shin-Tosu','Hakata']::text[],ARRAY['10:44','10:56','11:08','11:16','11:30','11:42','12:03','12:08','12:23']::text[],ARRAY['10:38','10:50','11:02','11:09','11:27','11:42','12:03','12:08','12:23']::text[]),
 ('さくら754',128994,'754A','https://www.jrkyushu-timetable.jp/sp/2611/0035/00358501.html?d=20261104&t=0829100',ARRAY['Kagoshima-Chuo','Sendai','Kumamoto','Kurume','Shin-Tosu','Hakata']::text[],ARRAY['11:55','12:07','12:42','13:03','13:08','13:23']::text[],ARRAY['11:47','11:59','12:42','13:03','13:08','13:23']::text[])
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
 IF total<>6 THEN RAISE EXCEPTION 'Expected six official train numbers, got %',total; END IF;
END $kyushu_northbound_sakura_2611$;
COMMIT;