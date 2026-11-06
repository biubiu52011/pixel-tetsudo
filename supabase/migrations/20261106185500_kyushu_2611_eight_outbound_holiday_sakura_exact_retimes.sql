-- JR-Kyushu 2611 published November plans for 8 SaturdayHoliday
-- Sakura trains: 407/409/411 are 800 series, 745/749/751/753/755
-- are planned N700 family. The original imported 2026-03 baseline
-- omitted subsequent south-of-Kumamoto timetable revision.
-- train_timetable_stops is a derived VIEW: UPDATE the original source
-- manual_timetable_template_stops ONLY, then read back through view.
-- Do not claim physical consist or extend the 800 PNG number range.
BEGIN;
SELECT pg_advisory_xact_lock(2611,800);
DO $sakura_eight_2611$
DECLARE
 r record; id_verified bigint; timetable_verified bigint; i int; affected int;
 local_station text; old_time text; new_time text; successes int:=0; png_added int:=0;
BEGIN
 FOR r IN SELECT * FROM (VALUES
  ('さくら407',129000,'407A','800系','A','https://www.jrkyushu-timetable.jp/sp/2611/0034/00349101.html?d=20261103&t=2828300',ARRAY['Hakata','Shin-Tosu','Kurume','Kumamoto','Shin-Yatsushiro','Shin-Minamata','Izumi','Sendai','Kagoshima-Chuo']::text[],ARRAY['15:36','15:49','15:54','16:15','16:27','16:41','16:48','17:00','17:12']::text[],ARRAY['15:36','15:49','15:54','16:15','16:29','16:46','16:53','17:05','17:17']::text[]),
  ('さくら409',128998,'409A','800系','A','https://www.jrkyushu-timetable.jp/sp/2611/0034/00349201.html?d=20261104&t=2862601',ARRAY['Hakata','Shin-Tosu','Kurume','Kumamoto','Shin-Yatsushiro','Shin-Minamata','Izumi','Sendai','Kagoshima-Chuo']::text[],ARRAY['16:36','16:49','16:54','17:15','17:27','17:41','17:48','18:00','18:12']::text[],ARRAY['16:36','16:49','16:54','17:15','17:29','17:46','17:53','18:05','18:17']::text[]),
  ('さくら411',129007,'411A','800系','A','https://www.jrkyushu-timetable.jp/sp/2611/0034/00349301.html?d=20261104&t=2862601',ARRAY['Hakata','Shin-Tosu','Kurume','Kumamoto','Shin-Yatsushiro','Shin-Minamata','Izumi','Sendai','Kagoshima-Chuo']::text[],ARRAY['17:36','17:49','17:54','18:15','18:27','18:41','18:48','19:00','19:12']::text[],ARRAY['17:36','17:49','17:54','18:15','18:29','18:46','18:53','19:05','19:17']::text[]),
  ('さくら745',128911,'745A','N700系','B','https://www.jrkyushu-timetable.jp/sp/2611/0034/00347501.html?d=20261103&t=2828300',ARRAY['Hakata','Shin-Tosu','Kurume','Kumamoto','Shin-Yatsushiro','Shin-Minamata','Izumi','Sendai','Kagoshima-Chuo']::text[],ARRAY['10:38','10:51','10:56','11:17','11:29','11:43','11:50','12:02','12:14']::text[],ARRAY['10:38','10:51','10:56','11:17','11:31','11:48','11:55','12:07','12:19']::text[]),
  ('さくら749',128999,'749A','N700系','B','https://www.jrkyushu-timetable.jp/jr-k_time/2611/0034/00347601.html?c=08291&d=04&ym=202611',ARRAY['Hakata','Shin-Tosu','Kurume','Kumamoto','Shin-Yatsushiro','Shin-Minamata','Izumi','Sendai','Kagoshima-Chuo']::text[],ARRAY['12:01','12:14','12:19','12:40','12:52','13:06','13:13','13:25','13:37']::text[],ARRAY['12:01','12:14','12:19','12:40','12:54','13:12','13:19','13:31','13:43']::text[]),
  ('さくら751',129014,'751A','N700系','B','https://www.jrkyushu-timetable.jp/sp/2611/0034/00347701.html?d=20261104&t=2898401',ARRAY['Hakata','Shin-Tosu','Kurume','Kumamoto','Sendai','Kagoshima-Chuo']::text[],ARRAY['13:01','13:15','13:20','13:41','14:16','14:27']::text[],ARRAY['13:01','13:15','13:20','13:41','14:22','14:34']::text[]),
  ('さくら753',128986,'753A','N700系','B','https://www.jrkyushu-timetable.jp/sp/2611/0034/00348001.html?d=20261104&t=2815506',ARRAY['Hakata','Shin-Tosu','Kurume','Kumamoto','Shin-Yatsushiro','Shin-Minamata','Izumi','Sendai','Kagoshima-Chuo']::text[],ARRAY['14:01','14:14','14:19','14:40','14:52','15:06','15:14','15:26','15:37']::text[],ARRAY['14:01','14:14','14:19','14:40','14:54','15:11','15:19','15:30','15:42']::text[]),
  ('さくら755',129010,'755A','N700系','B','https://www.jrkyushu-timetable.jp/sp/2611/0034/00348101.html?d=20261103&t=2815506',ARRAY['Hakata','Shin-Tosu','Kurume','Kumamoto','Sendai','Kagoshima-Chuo']::text[],ARRAY['15:01','15:14','15:19','15:40','16:15','16:27']::text[],ARRAY['15:01','15:14','15:19','15:40','16:22','16:34']::text[])
 ) AS v(service_name,template_id,full_number,planned_model,source_grade,source_url,stations,original_times,new_times)
 LOOP
  IF array_length(r.stations,1)<>array_length(r.original_times,1)
    OR array_length(r.stations,1)<>array_length(r.new_times,1)
    THEN RAISE EXCEPTION 'Station/time cardinality mismatch: %',r.service_name; END IF;

  SELECT t.id,mem.timetable_id INTO STRICT id_verified,timetable_verified
  FROM manual_timetable_templates t
  JOIN train_timetable_members mem ON mem.source_template_id=t.id AND mem.member_role='primary'
  JOIN train_timetables tt ON tt.id=mem.timetable_id AND tt.group_evidence='source_only'
  WHERE t.id=r.template_id AND t.train_number=r.service_name
    AND t.line_key='KyushuShinkansen'
    AND t.calendar_urn='odpt.Calendar:SaturdayHoliday'
    AND t.direction_urn='odpt.RailDirection:Outbound'
    AND t.railway_urn='odpt.Railway:JR-Kyushu.KyushuShinkansen'
    AND t.source_path='official-sampled:holiday:https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf';

  IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=id_verified)<>array_length(r.stations,1)
    OR (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=id_verified AND timetable_id=timetable_verified)<>array_length(r.stations,1)
    THEN RAISE EXCEPTION 'Source/view stops count mismatch: %',r.service_name; END IF;
  IF EXISTS (SELECT 1 FROM published_train_number_evidence n
    WHERE n.edition='2611' AND n.source_template_id=id_verified
      AND (n.train_number<>r.full_number OR n.official_source_url<>r.source_url))
    THEN RAISE EXCEPTION 'Existing official number conflict: %',r.service_name; END IF;
  IF (SELECT count(*) FROM train_timetable_vehicle_mappings v
       JOIN evidence_sources e ON e.id=v.source_id
       WHERE v.timetable_id=timetable_verified AND v.source_template_id=id_verified
         AND v.vehicle_type=r.planned_model
         AND v.mapping_level='official_service_vehicle_plan' AND v.actual_vehicle_confirmed=false
         AND e.source_type='official' AND e.evidence_grade=r.source_grade)<>1
    THEN RAISE EXCEPTION 'Existing independently planned model mismatch: %',r.service_name; END IF;

  FOR i IN 1..array_length(r.stations,1) LOOP
    local_station:='odpt.Station:JR-Kyushu.KyushuShinkansen.'||r.stations[i];
    old_time:=r.original_times[i];new_time:=r.new_times[i];
    IF i<array_length(r.stations,1) THEN
      UPDATE manual_timetable_template_stops s
         SET departure_clock=new_time
       WHERE s.template_id=id_verified AND s.stop_sequence=i-1
         AND s.departure_station_urn=local_station AND s.departure_clock=old_time
         AND s.arrival_station_urn IS NULL AND s.arrival_clock IS NULL;
      GET DIAGNOSTICS affected=ROW_COUNT;
      IF affected<>1 THEN RAISE EXCEPTION 'Source departure mismatch % stop %',r.service_name,i; END IF;
      IF (SELECT count(*) FROM train_timetable_stops z WHERE z.source_template_id=id_verified
        AND z.timetable_id=timetable_verified AND z.stop_sequence=i-1
        AND z.departure_station_urn=local_station AND z.departure_clock=new_time)<>1
      THEN RAISE EXCEPTION 'View departure mismatch % stop %',r.service_name,i; END IF;
    ELSE
      UPDATE manual_timetable_template_stops s SET arrival_clock=new_time
       WHERE s.template_id=id_verified AND s.stop_sequence=i-1
         AND s.arrival_station_urn=local_station AND s.arrival_clock=old_time
         AND s.departure_station_urn IS NULL AND s.departure_clock IS NULL;
      GET DIAGNOSTICS affected=ROW_COUNT;
      IF affected<>1 THEN RAISE EXCEPTION 'Source arrival mismatch % stop %',r.service_name,i; END IF;
      IF (SELECT count(*) FROM train_timetable_stops z WHERE z.source_template_id=id_verified
        AND z.timetable_id=timetable_verified AND z.stop_sequence=i-1
        AND z.arrival_station_urn=local_station AND z.arrival_clock=new_time)<>1
      THEN RAISE EXCEPTION 'View arrival mismatch % stop %',r.service_name,i; END IF;
    END IF;
  END LOOP;

  INSERT INTO published_train_number_evidence
    (edition,line_key,calendar_urn,direction_urn,train_number,
     source_template_id,official_source_url,verification_scope)
  VALUES ('2611','KyushuShinkansen','odpt.Calendar:SaturdayHoliday',
    'odpt.RailDirection:Outbound',r.full_number,id_verified,r.source_url,'train_number_only')
  ON CONFLICT DO NOTHING;
  IF (SELECT count(*) FROM published_train_number_evidence n WHERE n.edition='2611'
      AND n.source_template_id=id_verified AND n.train_number=r.full_number
      AND n.official_source_url=r.source_url AND n.line_key='KyushuShinkansen'
      AND n.calendar_urn='odpt.Calendar:SaturdayHoliday' AND n.direction_urn='odpt.RailDirection:Outbound')<>1
    THEN RAISE EXCEPTION 'Number evidence mismatch %',r.service_name; END IF;
  IF r.planned_model='800系' THEN
    IF NOT EXISTS(SELECT 1 FROM vehicle_image_assets a WHERE a.operator='JR-Kyushu'
         AND a.vehicle_type='800系' AND a.image_path='images/列车/JR九州/JR九州_800系.png'
         AND a.is_generic=true AND a.asset_status='available' AND a.file_format_status='native_png')
      THEN RAISE EXCEPTION '800 native PNG missing'; END IF;
    INSERT INTO published_train_png_number_ranges
      (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,
        source_url,requires_exact_roster,actual_vehicle_confirmed)
    VALUES ('2611','KyushuShinkansen','holiday_verified_single_number',
     substring(r.full_number FROM '^[0-9]+')::int,
     substring(r.full_number FROM '^[0-9]+')::int,
      'A','800系','../images/列车/JR九州/JR九州_800系.png',r.source_url,true,false)
    ON CONFLICT DO NOTHING;
    IF (SELECT count(*) FROM published_train_png_number_ranges p
       WHERE p.edition='2611' AND p.line_key='KyushuShinkansen'
         AND p.min_number=substring(r.full_number FROM '^[0-9]+')::int AND p.min_number=p.max_number
         AND p.suffix='A' AND p.vehicle_model='800系'
         AND p.png_reference='../images/列车/JR九州/JR九州_800系.png'
         AND p.source_url=r.source_url AND p.requires_exact_roster=true
         AND p.actual_vehicle_confirmed=false)<>1
      THEN RAISE EXCEPTION 'Single PNG mismatch %',r.service_name; END IF;
    png_added:=png_added+1;
  END IF;
  successes:=successes+1;
 END LOOP;
 IF successes<>8 OR png_added<>3 THEN
   RAISE EXCEPTION 'Expected eight numbered services and three PNG, got %/%',successes,png_added;
 END IF;
END $sakura_eight_2611$;
COMMIT;