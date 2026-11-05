-- 2026-11 JR Kyushu train-level verified 2611 holiday 6 sources:
-- 741A/743A have existing published planned N700 family (do not
-- duplicate the mapping); 334A plans an 800 series native JR-Kyushu
-- PNG; 338A/340A/342A N700 family without a safe JR-Kyushu N700 PNG.
-- The previous March PDF snapshot pre-dates the altered Kumamoto-
-- Kagoshima schedule. Modify only manual_timetable_template_stops:
-- train_timetable_stops is a derived read-only VIEW, never UPDATE it.
BEGIN;
SELECT pg_advisory_xact_lock(2611,334);
DO $kyushu2611_six_holiday$
DECLARE
 r record; s record; v_id bigint; v_tt bigint; i int; cnt int;
 station text; original text; official text; source_id bigint; mapped int:=0; png_added int:=0; plan_added int:=0;
BEGIN
 FOR r IN SELECT * FROM (VALUES
  ('さくら741',128919,'741A','N700系',true,'https://www.jrkyushu-timetable.jp/sp/2611/0034/00347301.html?d=20261103&t=2828300',ARRAY['Hakata','Shin-Tosu','Kurume','Kumamoto','Sendai','Kagoshima-Chuo']::text[],ARRAY['09:06','09:20','09:24','09:45','10:20','10:31']::text[],ARRAY['09:06','09:20','09:24','09:45','10:27','10:39']::text[]),
  ('さくら743',128903,'743A','N700系',true,'https://www.jrkyushu-timetable.jp/sp/2611/0034/00347401.html?d=20261104&t=2939501',ARRAY['Hakata','Shin-Tosu','Kurume','Kumamoto','Shin-Yatsushiro','Shin-Minamata','Izumi','Sendai','Kagoshima-Chuo']::text[],ARRAY['09:28','09:41','09:46','10:07','10:19','10:33','10:40','10:52','11:04']::text[],ARRAY['09:28','09:41','09:46','10:07','10:21','10:38','10:45','10:57','11:09']::text[]),
  ('つばめ334',129046,'334A','800系',false,'https://www.jrkyushu-timetable.jp/sp/2611/0035/00352401.html?d=20261031&t=2900700',ARRAY['Kagoshima-Chuo','Sendai','Izumi','Shin-Minamata','Shin-Yatsushiro','Kumamoto','Shin-Tamana','Shin-Omuta','Chikugo-Funagoya','Kurume','Shin-Tosu','Hakata']::text[],ARRAY['18:59','19:11','19:23','19:30','19:44','19:56','20:06','20:13','20:20','20:27','20:32','20:44']::text[],ARRAY['18:52','19:04','19:16','19:23','19:41','19:56','20:06','20:13','20:20','20:27','20:32','20:44']::text[]),
  ('つばめ338',129029,'338A','N700系',false,'https://www.jrkyushu-timetable.jp/sp/2611/0035/00352601.html?d=20261101&t=2814400',ARRAY['Kagoshima-Chuo','Sendai','Izumi','Shin-Minamata','Shin-Yatsushiro','Kumamoto','Shin-Tamana','Shin-Omuta','Chikugo-Funagoya','Kurume','Shin-Tosu','Hakata']::text[],ARRAY['20:59','21:11','21:23','21:30','21:44','21:56','22:06','22:14','22:20','22:28','22:32','22:45']::text[],ARRAY['20:52','21:05','21:16','21:24','21:41','21:56','22:06','22:14','22:20','22:28','22:32','22:45']::text[]),
  ('つばめ340',129043,'340A','N700系',false,'https://www.jrkyushu-timetable.jp/sp/2611/0035/00352701.html?d=20261101&t=2814400',ARRAY['Kagoshima-Chuo','Sendai','Izumi','Shin-Minamata','Shin-Yatsushiro','Kumamoto','Shin-Tamana','Shin-Omuta','Chikugo-Funagoya','Kurume','Shin-Tosu','Hakata']::text[],ARRAY['21:36','21:49','22:01','22:08','22:22','22:34','22:44','22:52','22:58','23:06','23:10','23:23']::text[],ARRAY['21:30','21:42','21:54','22:01','22:19','22:34','22:44','22:52','22:58','23:06','23:10','23:23']::text[]),
  ('つばめ342',129026,'342A','N700系',false,'https://www.jrkyushu-timetable.jp/sp/2611/0035/00352801.html?d=20261101&t=2900700',ARRAY['Kagoshima-Chuo','Sendai','Izumi','Shin-Minamata','Shin-Yatsushiro','Kumamoto']::text[],ARRAY['23:01','23:13','23:25','23:32','23:46','23:57']::text[],ARRAY['22:57','23:09','23:21','23:28','23:46','23:59']::text[])
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
 IF mapped<>6 OR plan_added<>4 OR png_added<>1
  THEN RAISE EXCEPTION 'Expected 6 numbers/4 models/1 PNG, got %/%/%',mapped,plan_added,png_added; END IF;
END $kyushu2611_six_holiday$;
COMMIT;