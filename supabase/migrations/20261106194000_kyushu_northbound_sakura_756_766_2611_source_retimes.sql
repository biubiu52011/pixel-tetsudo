-- JR-Kyushu 2611 additional six northbound SaturdayHoliday Sakura
-- 756/758/760/762/764/766. Official November issued schedule replaces
-- older March south-of-Kumamoto source times. Preserve independent
-- N700 family planned models without projecting physical trainsets or
-- unsupported PNG. Source-only rewrite + derived VIEW readback.
BEGIN;
SELECT pg_advisory_xact_lock(2611,762);
DO $kyushu_northbound_later_sakura_2611$
DECLARE r record; validated_id bigint; validated_tt bigint; i int; affected int;
  source_station text; expected_clock text; official_clock text; total int:=0;
BEGIN
 FOR r IN SELECT * FROM (VALUES
 ('さくら756',129002,'756A','https://www.jrkyushu-timetable.jp/sp/2611/0035/00358601.html?d=20261104&t=2815505',ARRAY['Kagoshima-Chuo','Sendai','Kumamoto','Kurume','Shin-Tosu','Hakata']::text[],ARRAY['12:55','13:07','13:42','14:03','14:08','14:23']::text[],ARRAY['12:47','12:59','13:42','14:03','14:08','14:23']::text[]),
 ('さくら758',128981,'758A','https://www.jrkyushu-timetable.jp/sp/2611/0035/00358701.html?d=20261101&t=2900700',ARRAY['Kagoshima-Chuo','Sendai','Izumi','Shin-Minamata','Shin-Yatsushiro','Kumamoto','Kurume','Shin-Tosu','Hakata']::text[],ARRAY['13:45','13:57','14:09','14:17','14:31','14:42','15:03','15:08','15:23']::text[],ARRAY['13:38','13:50','14:02','14:10','14:27','14:42','15:03','15:08','15:23']::text[]),
 ('さくら760',128987,'760A','https://www.jrkyushu-timetable.jp/sp/2611/0035/00358801.html?d=20261104&t=0829100',ARRAY['Kagoshima-Chuo','Sendai','Kumamoto','Kurume','Shin-Tosu','Hakata']::text[],ARRAY['14:17','14:29','15:04','15:26','15:30','15:45']::text[],ARRAY['14:09','14:22','15:04','15:26','15:30','15:45']::text[]),
 ('さくら762',128995,'762A','https://www.jrkyushu-timetable.jp/sp/2611/0035/00358901.html?d=20261103&t=2814400',ARRAY['Kagoshima-Chuo','Sendai','Izumi','Shin-Minamata','Shin-Yatsushiro','Kumamoto','Kurume','Shin-Tosu','Hakata']::text[],ARRAY['14:45','14:57','15:09','15:17','15:31','15:42','16:03','16:08','16:23']::text[],ARRAY['14:39','14:51','15:03','15:10','15:28','15:42','16:03','16:08','16:23']::text[]),
 ('さくら764',128993,'764A','https://www.jrkyushu-timetable.jp/sp/2611/0035/00359001.html?d=20261103&t=2828304',ARRAY['Kagoshima-Chuo','Sendai','Kumamoto','Kurume','Shin-Tosu','Hakata']::text[],ARRAY['15:17','15:29','16:04','16:26','16:30','16:45']::text[],ARRAY['15:09','15:22','16:04','16:26','16:30','16:45']::text[]),
 ('さくら766',128996,'766A','https://www.jrkyushu-timetable.jp/sp/2611/0035/00359101.html?d=20261103&t=2814400',ARRAY['Kagoshima-Chuo','Sendai','Izumi','Shin-Minamata','Shin-Yatsushiro','Kumamoto','Kurume','Shin-Tosu','Hakata']::text[],ARRAY['15:45','15:57','16:09','16:17','16:31','16:42','17:03','17:08','17:23']::text[],ARRAY['15:39','15:51','16:03','16:10','16:28','16:42','17:03','17:08','17:23']::text[])
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
END $kyushu_northbound_later_sakura_2611$;
COMMIT;