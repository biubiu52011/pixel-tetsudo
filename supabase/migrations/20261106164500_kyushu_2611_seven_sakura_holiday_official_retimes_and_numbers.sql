-- JR Kyushu Nov-2026 altered timetable vs 2026-03-14 baseline.
-- Seven exact holiday Sakura services confirmed from official 2611 pages.
-- Fix BOTH existing stop owners (manual source and canonical copy),
-- then attach exact formal train number. Existing verified planned model
-- rows must remain untouched. 402A has N700/800 date exceptions: NO
-- single unscoped model or PNG must be written for that template.
-- Correct inbound 408 Hakata 21:50 arrival, not 21:52 onward departure.
BEGIN;
SELECT pg_advisory_xact_lock(2611,403);
DO $sakura_2611_retime$
DECLARE r record; v_id bigint; v_tt bigint; i integer; cnt integer; n integer:=0; pngcount integer:=0; station text; old_clock text; new_clock text;
BEGIN
 FOR r IN SELECT * FROM (VALUES
  ('さくら402',128984,'402A',NULL,'https://www.jrkyushu-timetable.jp/sp/2611/0034/00349401.html?d=20261101&t=2900700',ARRAY['Kagoshima-Chuo','Sendai','Izumi','Shin-Minamata','Shin-Yatsushiro','Kumamoto','Kurume','Shin-Tosu','Hakata']::text[],ARRAY['11:20','11:33','11:45','11:52','12:06','12:17','12:40','12:45','12:57']::text[],ARRAY['11:14','11:26','11:38','11:45','12:03','12:17','12:40','12:45','12:57']::text[]),
  ('さくら403',128961,'403A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0034/00348901.html?d=20261101&t=2862601',ARRAY['Hakata','Shin-Tosu','Kurume','Kumamoto','Shin-Yatsushiro','Shin-Minamata','Izumi','Sendai','Kagoshima-Chuo']::text[],ARRAY['08:40','08:53','08:58','09:19','09:31','09:45','09:52','10:04','10:16']::text[],ARRAY['08:40','08:53','08:58','09:19','09:33','09:50','09:57','10:09','10:21']::text[]),
  ('さくら404',128990,'404A','N700系','https://www.jrkyushu-timetable.jp/sp/2611/0034/00349501.html?d=20261101&t=2862600',ARRAY['Kagoshima-Chuo','Sendai','Izumi','Shin-Minamata','Shin-Yatsushiro','Kumamoto','Kurume','Shin-Tosu','Hakata']::text[],ARRAY['12:20','12:33','12:45','12:52','13:06','13:17','13:40','13:45','13:57']::text[],ARRAY['12:14','12:26','12:38','12:45','13:03','13:17','13:40','13:45','13:57']::text[]),
  ('さくら405',128988,'405A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0034/00349001.html?d=20261104&t=2898401',ARRAY['Hakata','Shin-Tosu','Kurume','Kumamoto','Shin-Yatsushiro','Shin-Minamata','Izumi','Sendai','Kagoshima-Chuo']::text[],ARRAY['13:36','13:49','13:54','14:15','14:27','14:41','14:48','15:00','15:12']::text[],ARRAY['13:36','13:49','13:54','14:15','14:29','14:46','14:53','15:05','15:17']::text[]),
  ('さくら406',129015,'406A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0034/00349601.html?d=20261101&t=2862600',ARRAY['Kagoshima-Chuo','Sendai','Izumi','Shin-Minamata','Shin-Yatsushiro','Kumamoto','Kurume','Shin-Tosu','Hakata']::text[],ARRAY['18:05','18:17','18:29','18:36','18:50','19:02','19:23','19:28','19:40']::text[],ARRAY['17:58','18:11','18:22','18:30','18:47','19:02','19:23','19:28','19:40']::text[]),
  ('さくら408',129037,'408A','N700系','https://www.jrkyushu-timetable.jp/sp/2611/0026/00264401.html?d=20261103&t=2828304',ARRAY['Kagoshima-Chuo','Sendai','Izumi','Shin-Minamata','Shin-Yatsushiro','Kumamoto','Kurume','Shin-Tosu','Hakata']::text[],ARRAY['20:14','20:26','20:38','20:45','20:59','21:11','21:32','21:37','21:52']::text[],ARRAY['20:07','20:20','20:31','20:39','20:56','21:11','21:32','21:37','21:50']::text[]),
  ('さくら410',129032,'410A','N700系','https://www.jrkyushu-timetable.jp/sp/2611/0034/00349701.html?d=20261103&t=0829100',ARRAY['Kagoshima-Chuo','Sendai','Izumi','Shin-Minamata','Shin-Yatsushiro','Kumamoto','Kurume','Shin-Tosu','Hakata']::text[],ARRAY['22:19','22:31','22:43','22:51','23:05','23:16','23:37','23:42','23:54']::text[],ARRAY['22:12','22:25','22:36','22:44','23:01','23:16','23:37','23:42','23:54']::text[])
 ) AS x(service_name,official_number,full_train_number,scheduled_model,official_url,stops,source_clocks,official_clocks)
 LOOP
  IF array_length(r.stops,1)<>9 OR array_length(r.source_clocks,1)<>9 OR array_length(r.official_clocks,1)<>9
    THEN RAISE EXCEPTION 'Unexpected stop count for %',r.service_name; END IF;
  SELECT m.id,mem.timetable_id INTO STRICT v_id,v_tt FROM manual_timetable_templates m
    JOIN train_timetable_members mem ON mem.source_template_id=m.id AND mem.member_role='primary'
    JOIN train_timetables t ON t.id=mem.timetable_id AND t.group_evidence='source_only'
    WHERE m.id=r.official_number
      AND m.line_key='KyushuShinkansen'
      AND m.railway_urn='odpt.Railway:JR-Kyushu.KyushuShinkansen'
      AND m.calendar_urn='odpt.Calendar:SaturdayHoliday'
      AND m.direction_urn='odpt.RailDirection:'||
        CASE WHEN substring(r.full_train_number FROM '^[0-9]+')::int%2=1 THEN 'Outbound' ELSE 'Inbound' END
      AND m.train_number=r.service_name
      AND m.source_path='official-sampled:holiday:https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf';
  IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=v_id)<>9
    OR (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=v_id AND timetable_id=v_tt)<>9
    THEN RAISE EXCEPTION '9-stop timetable contract violated %',r.service_name; END IF;
  IF EXISTS (SELECT 1 FROM published_train_number_evidence e
     WHERE e.edition='2611' AND e.source_template_id=v_id
       AND (e.train_number<>r.full_train_number OR e.official_source_url<>r.official_url))
    THEN RAISE EXCEPTION 'Conflicting full number %',r.service_name; END IF;
  IF r.scheduled_model IS NULL THEN
    IF EXISTS (SELECT 1 FROM train_timetable_vehicle_mappings v WHERE v.timetable_id=v_tt)
      THEN RAISE EXCEPTION 'Date-variable 402 must not claim static model'; END IF;
  ELSE
    IF (SELECT count(*) FROM train_timetable_vehicle_mappings vm
      JOIN evidence_sources es ON es.id=vm.source_id
      WHERE vm.timetable_id=v_tt AND vm.source_template_id=v_id
        AND vm.vehicle_type=r.scheduled_model AND vm.mapping_level='official_service_vehicle_plan'
        AND vm.actual_vehicle_confirmed=false AND es.source_type='official' AND es.evidence_grade='A')<>1
      THEN RAISE EXCEPTION 'Preexisting official planned model mismatch %',r.service_name; END IF;
  END IF;

  FOR i IN 1..9 LOOP
    station:='odpt.Station:JR-Kyushu.KyushuShinkansen.'||r.stops[i];
    old_clock:=r.source_clocks[i]; new_clock:=r.official_clocks[i];
    IF i<9 THEN
      UPDATE manual_timetable_template_stops s SET departure_clock=new_clock
       WHERE s.template_id=v_id AND s.stop_sequence=i-1
        AND s.departure_station_urn=station AND s.departure_clock=old_clock
        AND s.arrival_station_urn IS NULL AND s.arrival_clock IS NULL;
      GET DIAGNOSTICS cnt=ROW_COUNT;
      IF cnt<>1 THEN RAISE EXCEPTION 'Manual stop mismatch % seq %',r.service_name,i; END IF;
      UPDATE train_timetable_stops s SET departure_clock=new_clock
       WHERE s.source_template_id=v_id AND s.timetable_id=v_tt AND s.stop_sequence=i-1
        AND s.station_urn=station AND s.departure_station_urn=station
        AND s.departure_clock=old_clock AND s.arrival_clock IS NULL;
      GET DIAGNOSTICS cnt=ROW_COUNT;
      IF cnt<>1 THEN RAISE EXCEPTION 'Canonical stop mismatch % seq %',r.service_name,i; END IF;
    ELSE
      UPDATE manual_timetable_template_stops s SET arrival_clock=new_clock
       WHERE s.template_id=v_id AND s.stop_sequence=i-1
         AND s.arrival_station_urn=station AND s.arrival_clock=old_clock
         AND s.departure_station_urn IS NULL AND s.departure_clock IS NULL;
      GET DIAGNOSTICS cnt=ROW_COUNT;
      IF cnt<>1 THEN RAISE EXCEPTION 'Manual terminal mismatch %',r.service_name; END IF;
      UPDATE train_timetable_stops s SET arrival_clock=new_clock
       WHERE s.source_template_id=v_id AND s.timetable_id=v_tt AND s.stop_sequence=i-1
         AND s.station_urn=station AND s.arrival_station_urn=station
         AND s.arrival_clock=old_clock AND s.departure_clock IS NULL;
      GET DIAGNOSTICS cnt=ROW_COUNT;
      IF cnt<>1 THEN RAISE EXCEPTION 'Canonical terminal mismatch %',r.service_name; END IF;
    END IF;
  END LOOP;
  INSERT INTO published_train_number_evidence
    (edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,official_source_url,verification_scope)
  VALUES ('2611','KyushuShinkansen','odpt.Calendar:SaturdayHoliday',
    'odpt.RailDirection:'||CASE WHEN substring(r.full_train_number FROM '^[0-9]+')::int%2=1 THEN 'Outbound' ELSE 'Inbound' END,
     r.full_train_number,v_id,r.official_url,'train_number_only')
  ON CONFLICT DO NOTHING;
  IF (SELECT count(*) FROM published_train_number_evidence e WHERE e.edition='2611' AND e.source_template_id=v_id
    AND e.train_number=r.full_train_number AND e.official_source_url=r.official_url
    AND e.calendar_urn='odpt.Calendar:SaturdayHoliday' AND e.verification_scope='train_number_only')<>1
    THEN RAISE EXCEPTION 'Official number mismatch %',r.full_train_number; END IF;

  IF r.scheduled_model='800系' THEN
    IF NOT EXISTS(SELECT 1 FROM vehicle_image_assets a WHERE a.operator='JR-Kyushu'
        AND a.vehicle_type='800系' AND a.image_path='images/列车/JR九州/JR九州_800系.png'
        AND a.file_format_status='native_png' AND a.asset_status='available' AND a.is_generic=true)
      THEN RAISE EXCEPTION 'JR Kyushu 800 PNG missing'; END IF;
    INSERT INTO published_train_png_number_ranges
      (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url,
       requires_exact_roster,actual_vehicle_confirmed)
    VALUES('2611','KyushuShinkansen','holiday_verified_single_number',
      substring(r.full_train_number FROM '^[0-9]+')::int,substring(r.full_train_number FROM '^[0-9]+')::int,
      'A','800系','../images/列车/JR九州/JR九州_800系.png',r.official_url,true,false)
    ON CONFLICT DO NOTHING;
    IF (SELECT count(*) FROM published_train_png_number_ranges p
       WHERE p.edition='2611' AND p.line_key='KyushuShinkansen'
         AND p.min_number=substring(r.full_train_number FROM '^[0-9]+')::int
         AND p.max_number=p.min_number AND p.suffix='A' AND p.vehicle_model='800系'
         AND p.source_url=r.official_url AND p.png_reference='../images/列车/JR九州/JR九州_800系.png'
         AND p.requires_exact_roster=true AND p.actual_vehicle_confirmed=false)<>1
      THEN RAISE EXCEPTION '800 PNG mismatch %',r.full_train_number; END IF;
    pngcount:=pngcount+1;
  END IF;
  n:=n+1;
 END LOOP;
 IF n<>7 OR pngcount<>3 THEN RAISE EXCEPTION 'Expected seven services and three 800 PNG: %/%',n,pngcount; END IF;
END $sakura_2611_retime$;
COMMIT;