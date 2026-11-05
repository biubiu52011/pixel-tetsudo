-- JR Kyushu 2611 holiday source retime for 3 independently verified
-- numbered Tsubame: 303A N700, 336A 800, 343A 800. All original
-- snapshot stop clocks checked one by one, then compare derived VIEW.
-- New model plan is NOT the actual dispatched trainset; PNG white-listed
-- exclusively for two independently confirmed native 800 family plans.
BEGIN;
SELECT pg_advisory_xact_lock(2611,334);
DO $kyushu2611_six_holiday$
DECLARE
 r record; v_id bigint; v_tt bigint; i int; cnt int;
 station text; original text; official text; source_id bigint; mapped int:=0; png_added int:=0; plan_added int:=0;
BEGIN
 FOR r IN SELECT * FROM (VALUES
  ('つばめ303',128959,'303A','N700系',false,'https://www.jrkyushu-timetable.jp/sp/2611/0035/00351701.html?d=20261103&t=2898401',ARRAY['Kumamoto','Shin-Yatsushiro','Shin-Minamata','Izumi','Sendai','Kagoshima-Chuo']::text[],ARRAY['06:11','06:23','06:37','06:44','06:56','07:08']::text[],ARRAY['06:11','06:25','06:42','06:49','07:01','07:13']::text[]),
  ('つばめ336',129042,'336A','800系',false,'https://www.jrkyushu-timetable.jp/sp/2611/0035/00352501.html?d=20261103&t=2814400',ARRAY['Kagoshima-Chuo','Sendai','Izumi','Shin-Minamata','Shin-Yatsushiro','Kumamoto','Shin-Tamana','Shin-Omuta','Chikugo-Funagoya','Kurume','Shin-Tosu','Hakata']::text[],ARRAY['19:33','19:46','19:58','20:05','20:19','20:38','20:48','20:56','21:02','21:10','21:14','21:27']::text[],ARRAY['19:27','19:39','19:51','19:58','20:16','20:38','20:48','20:56','21:02','21:10','21:14','21:27']::text[]),
  ('つばめ343',129023,'343A','800系',false,'https://www.jrkyushu-timetable.jp/sp/2611/0035/00351501.html?d=20261103&t=2939501',ARRAY['Hakata','Shin-Tosu','Kurume','Chikugo-Funagoya','Shin-Omuta','Shin-Tamana','Kumamoto','Shin-Yatsushiro','Shin-Minamata','Izumi','Sendai','Kagoshima-Chuo']::text[],ARRAY['21:45','21:58','22:03','22:11','22:18','22:26','23:00','23:13','23:26','23:34','23:46','23:57']::text[],ARRAY['21:45','21:58','22:03','22:11','22:18','22:26','22:57','23:11','23:29','23:36','23:48','23:59']::text[])
 ) AS x(service_name,source_id,official_number,planned_model,existing_model,official_url,stations,old_clocks,new_clocks)
 LOOP
  IF array_length(r.stations,1) IS NULL OR
    array_length(r.stations,1)<>array_length(r.old_clocks,1) OR
    array_length(r.stations,1)<>array_length(r.new_clocks,1)
    THEN RAISE EXCEPTION 'Invalid reference stop arrays: %',r.service_name; END IF;
  SELECT m.id,tm.timetable_id INTO STRICT v_id,v_tt
  FROM manual_timetable_templates m JOIN train_timetable_members tm
    ON tm.source_template_id=m.id AND tm.member_role='primary'
  JOIN train_timetables tt ON tt.id=tm.timetable_id AND tt.group_evidence='source_only'
  WHERE m.id=r.source_id AND m.line_key='KyushuShinkansen'
    AND m.railway_urn='odpt.Railway:JR-Kyushu.KyushuShinkansen'
    AND m.calendar_urn='odpt.Calendar:SaturdayHoliday'
    AND m.direction_urn='odpt.RailDirection:'||
      CASE WHEN substring(r.official_number FROM '^[0-9]+')::int%2=0 THEN 'Inbound' ELSE 'Outbound' END
    AND m.train_number=r.service_name
    AND m.source_path='official-sampled:holiday:https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf';
  IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=v_id)<>array_length(r.stations,1)
    OR (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=v_id AND timetable_id=v_tt)<>array_length(r.stations,1)
   THEN RAISE EXCEPTION 'Stop cardinality mismatch %',r.service_name; END IF;
  IF EXISTS (SELECT 1 FROM published_train_number_evidence e WHERE e.edition='2611' AND e.source_template_id=v_id
      AND (e.train_number<>r.official_number OR e.official_source_url<>r.official_url))
   THEN RAISE EXCEPTION 'Conflicting official number %',r.service_name; END IF;
  IF r.existing_model THEN
    IF (SELECT count(*) FROM train_timetable_vehicle_mappings vm
       JOIN evidence_sources es ON es.id=vm.source_id WHERE vm.timetable_id=v_tt AND vm.source_template_id=v_id
       AND vm.vehicle_type=r.planned_model AND vm.mapping_level='official_service_vehicle_plan'
       AND vm.actual_vehicle_confirmed=false AND es.source_type='official' AND es.evidence_grade IN ('A','B'))<>1
    THEN RAISE EXCEPTION 'Existing service model mismatch %',r.service_name; END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM train_timetable_vehicle_mappings WHERE timetable_id=v_tt)
    THEN RAISE EXCEPTION 'Unexpected preexisting train model %',r.service_name; END IF;
  END IF;
  FOR i IN 1..array_length(r.stations,1) LOOP
    station:='odpt.Station:JR-Kyushu.KyushuShinkansen.'||r.stations[i];
    original:=r.old_clocks[i];official:=r.new_clocks[i];
    IF i<array_length(r.stations,1) THEN
      UPDATE manual_timetable_template_stops s SET departure_clock=official
        WHERE s.template_id=v_id AND s.stop_sequence=i-1
          AND s.departure_station_urn=station AND s.departure_clock=original
          AND s.arrival_station_urn IS NULL AND s.arrival_clock IS NULL;
      GET DIAGNOSTICS cnt=ROW_COUNT;
      IF cnt<>1 THEN RAISE EXCEPTION 'Legacy source stop mismatch % idx %',r.service_name,i; END IF;
      IF (SELECT count(*) FROM train_timetable_stops z WHERE z.source_template_id=v_id
       AND z.timetable_id=v_tt AND z.stop_sequence=i-1
       AND z.station_urn=station AND z.departure_station_urn=station AND z.departure_clock=official)<>1
        THEN RAISE EXCEPTION 'Derived stop mismatch % idx %',r.service_name,i; END IF;
    ELSE
      UPDATE manual_timetable_template_stops s SET arrival_clock=official
        WHERE s.template_id=v_id AND s.stop_sequence=i-1 AND s.arrival_station_urn=station
          AND s.arrival_clock=original AND s.departure_station_urn IS NULL AND s.departure_clock IS NULL;
      GET DIAGNOSTICS cnt=ROW_COUNT;
      IF cnt<>1 THEN RAISE EXCEPTION 'Legacy terminal mismatch %',r.service_name; END IF;
      IF (SELECT count(*) FROM train_timetable_stops z WHERE z.source_template_id=v_id
       AND z.timetable_id=v_tt AND z.stop_sequence=i-1 AND z.station_urn=station
       AND z.arrival_station_urn=station AND z.arrival_clock=official)<>1
        THEN RAISE EXCEPTION 'Derived terminal mismatch %',r.service_name; END IF;
    END IF;
  END LOOP;
  INSERT INTO published_train_number_evidence
     (edition,line_key,calendar_urn,direction_urn,train_number,
      source_template_id,official_source_url,verification_scope)
  VALUES ('2611','KyushuShinkansen','odpt.Calendar:SaturdayHoliday',
    'odpt.RailDirection:'||CASE WHEN substring(r.official_number FROM '^[0-9]+')::int%2=0 THEN 'Inbound' ELSE 'Outbound' END,
    r.official_number,v_id,r.official_url,'train_number_only') ON CONFLICT DO NOTHING;
  IF (SELECT count(*) FROM published_train_number_evidence e WHERE e.edition='2611' AND e.source_template_id=v_id
     AND e.line_key='KyushuShinkansen' AND e.train_number=r.official_number
     AND e.official_source_url=r.official_url AND e.calendar_urn='odpt.Calendar:SaturdayHoliday')<>1
    THEN RAISE EXCEPTION 'Official evidence insert mismatch %',r.service_name; END IF;
  IF NOT r.existing_model THEN
    SELECT id INTO source_id FROM evidence_sources
       WHERE source_key='jrkyushu-2611-kyushu-holiday-'||lower(r.official_number)||'-'||lower(replace(r.planned_model,'系',''));
    IF source_id IS NULL THEN
      INSERT INTO evidence_sources(id,source_key,source_url,source_type,evidence_grade,notes)
        VALUES((SELECT coalesce(max(id),0)+1 FROM evidence_sources),
        'jrkyushu-2611-kyushu-holiday-'||lower(r.official_number)||'-'||lower(replace(r.planned_model,'系','')),
        r.official_url,'official','A',
        'JR Kyushu 2611 official single service '||r.official_number||' planned '||r.planned_model||'; actual dispatch unconfirmed')
        RETURNING id INTO source_id;
    END IF;
    IF (SELECT count(*) FROM evidence_sources es WHERE es.id=source_id
        AND es.source_url=r.official_url AND es.source_type='official' AND es.evidence_grade='A')<>1
      THEN RAISE EXCEPTION 'Source conflict %',r.service_name; END IF;
    INSERT INTO train_timetable_vehicle_mappings
       (timetable_id,source_template_id,vehicle_type,mapping_level,source_id,source_path,actual_vehicle_confirmed)
    VALUES(v_tt,v_id,r.planned_model,'official_service_vehicle_plan',source_id,
        'official-2611:'||r.official_url,false);
    plan_added:=plan_added+1;
  END IF;
  IF r.planned_model='800系' THEN
    IF NOT EXISTS(SELECT 1 FROM vehicle_image_assets a WHERE a.operator='JR-Kyushu' AND a.vehicle_type='800系'
        AND a.image_path='images/列车/JR九州/JR九州_800系.png' AND a.asset_status='available'
        AND a.file_format_status='native_png' AND a.is_generic=true)
     THEN RAISE EXCEPTION 'Native JR Kyushu 800 PNG unavailable'; END IF;
    INSERT INTO published_train_png_number_ranges
     (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url,
      requires_exact_roster,actual_vehicle_confirmed)
    VALUES ('2611','KyushuShinkansen','holiday_verified_single_number',
      substring(r.official_number FROM '^[0-9]+')::int,substring(r.official_number FROM '^[0-9]+')::int,'A',
      '800系','../images/列车/JR九州/JR九州_800系.png',r.official_url,true,false)
      ON CONFLICT DO NOTHING;
    IF (SELECT count(*) FROM published_train_png_number_ranges p WHERE p.edition='2611'
        AND p.line_key='KyushuShinkansen' AND p.min_number=substring(r.official_number FROM '^[0-9]+')::int
        AND p.min_number=p.max_number AND p.suffix='A' AND p.vehicle_model='800系'
        AND p.png_reference='../images/列车/JR九州/JR九州_800系.png'
        AND p.source_url=r.official_url AND p.requires_exact_roster=true AND p.actual_vehicle_confirmed=false)<>1
      THEN RAISE EXCEPTION 'Exact PNG mismatch %',r.service_name; END IF;
    png_added:=png_added+1;
  END IF;
  mapped:=mapped+1;
 END LOOP;
 IF mapped<>3 OR plan_added<>3 OR png_added<>2
  THEN RAISE EXCEPTION 'Expected 3 numbers/3 models/2 PNG, got %/%/%',mapped,plan_added,png_added; END IF;
END $kyushu2611_six_holiday$;
COMMIT;