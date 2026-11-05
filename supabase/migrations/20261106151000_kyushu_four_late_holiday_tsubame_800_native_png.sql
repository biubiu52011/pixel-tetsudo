-- JR Kyushu official 2611 late outbound Tsubame four holiday templates.
-- Exact Hakata -> Kumamoto source time and JR Kyushu 800-series planned
-- cars only. No actual-carset claim and no range guess.
BEGIN;
SELECT pg_advisory_xact_lock(2611,800);
DO $holiday_late_800$
DECLARE r record; v_id bigint; v_tt bigint; v_source bigint; n int:=0;
BEGIN
 FOR r IN SELECT * FROM (VALUES
 ('つばめ337','337A',129027,'19:36','20:25','https://www.jrkyushu-timetable.jp/sp/2611/0035/00351201.html?d=20261103&t=0829301'),
 ('つばめ339','339A',129031,'20:06','20:55','https://www.jrkyushu-timetable.jp/sp/2611/0035/00351301.html?d=20261103&t=2828300'),
 ('つばめ341','341A',129049,'20:39','21:27','https://www.jrkyushu-timetable.jp/sp/2611/0035/00351401.html?d=20261103&t=2828300'),
 ('つばめ345','345A',129033,'22:39','23:28','https://www.jrkyushu-timetable.jp/sp/2611/0035/00351601.html?d=20261103&t=2828300')
 ) AS x(service_name,number_full,source_id,first_clock,last_clock,official_url)
 LOOP
  SELECT m.id,tm.timetable_id INTO STRICT v_id,v_tt
  FROM manual_timetable_templates m
  JOIN train_timetable_members tm ON tm.source_template_id=m.id AND tm.member_role='primary'
  JOIN train_timetables tt ON tt.id=tm.timetable_id AND tt.group_evidence='source_only'
  WHERE m.id=r.source_id
    AND m.line_key='KyushuShinkansen'
    AND m.railway_urn='odpt.Railway:JR-Kyushu.KyushuShinkansen'
    AND m.calendar_urn='odpt.Calendar:SaturdayHoliday'
    AND m.direction_urn='odpt.RailDirection:Outbound'
    AND m.train_number=r.service_name
    AND EXISTS (SELECT 1 FROM manual_timetable_template_stops s
       WHERE s.template_id=m.id AND s.departure_station_urn='odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata'
         AND s.departure_clock=r.first_clock)
    AND EXISTS (SELECT 1 FROM manual_timetable_template_stops s
       WHERE s.template_id=m.id AND s.arrival_station_urn='odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto'
         AND s.arrival_clock=r.last_clock);
  IF EXISTS (SELECT 1 FROM published_train_number_evidence e WHERE e.edition='2611'
      AND e.source_template_id=v_id AND (e.train_number<>r.number_full OR e.official_source_url<>r.official_url))
  THEN RAISE EXCEPTION 'Existing number conflict %',r.number_full; END IF;
  INSERT INTO published_train_number_evidence
    (edition,line_key,calendar_urn,direction_urn,train_number,
      source_template_id,official_source_url,verification_scope)
  VALUES('2611','KyushuShinkansen','odpt.Calendar:SaturdayHoliday','odpt.RailDirection:Outbound',
    r.number_full,v_id,r.official_url,'train_number_only') ON CONFLICT DO NOTHING;
  IF (SELECT count(*) FROM published_train_number_evidence e WHERE e.edition='2611'
     AND e.source_template_id=v_id AND e.train_number=r.number_full AND e.official_source_url=r.official_url)<>1
  THEN RAISE EXCEPTION 'Official number mismatch %',r.number_full; END IF;

  SELECT id INTO v_source FROM evidence_sources WHERE source_key=
    'jrkyushu-2611-kyushu-shinkansen-'||lower(r.number_full)||'-800';
  IF v_source IS NULL THEN
   INSERT INTO evidence_sources(id,source_key,source_url,source_type,evidence_grade,notes)
   VALUES((SELECT coalesce(max(id),0)+1 FROM evidence_sources),
    'jrkyushu-2611-kyushu-shinkansen-'||lower(r.number_full)||'-800',
    r.official_url,'official','A','JR Kyushu 2611 published 800系 planned stock for '||r.number_full||'; no actual vehicle confirmed')
   RETURNING id INTO v_source;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM evidence_sources es WHERE es.id=v_source
    AND es.source_url=r.official_url AND es.evidence_grade='A' AND es.source_type='official')
  THEN RAISE EXCEPTION 'Source mismatch %',r.number_full; END IF;
  IF EXISTS (SELECT 1 FROM train_timetable_vehicle_mappings vm WHERE vm.timetable_id=v_tt
    AND (vm.vehicle_type<>'800系' OR vm.mapping_level<>'official_service_vehicle_plan'
     OR vm.source_id<>v_source OR vm.actual_vehicle_confirmed<>false))
  THEN RAISE EXCEPTION 'Plan conflict %',r.number_full; END IF;
  INSERT INTO train_timetable_vehicle_mappings
     (timetable_id,source_template_id,vehicle_type,mapping_level,source_id,source_path,actual_vehicle_confirmed)
  SELECT v_tt,v_id,'800系','official_service_vehicle_plan',v_source,'official-2611:'||r.official_url,false
  WHERE NOT EXISTS(SELECT 1 FROM train_timetable_vehicle_mappings vm WHERE vm.timetable_id=v_tt);
  IF (SELECT count(*) FROM train_timetable_vehicle_mappings vm WHERE vm.timetable_id=v_tt
    AND vm.source_template_id=v_id AND vm.vehicle_type='800系'
    AND vm.mapping_level='official_service_vehicle_plan' AND vm.source_id=v_source
    AND vm.actual_vehicle_confirmed=false)<>1
  THEN RAISE EXCEPTION 'Plan mismatch %',r.number_full; END IF;
  IF NOT EXISTS (SELECT 1 FROM vehicle_image_assets a
      WHERE a.operator='JR-Kyushu' AND a.vehicle_type='800系' AND a.asset_status='available'
      AND a.image_path='images/列车/JR九州/JR九州_800系.png'
      AND a.file_format_status='native_png' AND a.is_generic=true)
  THEN RAISE EXCEPTION 'Native 800 PNG absent'; END IF;
  INSERT INTO published_train_png_number_ranges
     (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url,
      requires_exact_roster,actual_vehicle_confirmed)
  VALUES ('2611','KyushuShinkansen','holiday_verified_single_number',
    substring(r.number_full FROM '^[0-9]+')::int,substring(r.number_full FROM '^[0-9]+')::int,
    'A','800系','../images/列车/JR九州/JR九州_800系.png',r.official_url,true,false)
  ON CONFLICT DO NOTHING;
  IF (SELECT count(*) FROM published_train_png_number_ranges p
    WHERE p.edition='2611' AND p.line_key='KyushuShinkansen'
    AND p.min_number=substring(r.number_full FROM '^[0-9]+')::int
    AND p.max_number=p.min_number AND p.vehicle_model='800系' AND p.suffix='A'
    AND p.png_reference='../images/列车/JR九州/JR九州_800系.png'
    AND p.source_url=r.official_url AND p.requires_exact_roster=true
    AND p.actual_vehicle_confirmed=false)<>1
  THEN RAISE EXCEPTION 'PNG mismatch %',r.number_full; END IF;
  n:=n+1;
 END LOOP;
 IF n<>4 THEN RAISE EXCEPTION 'Unexpected count %',n; END IF;
END $holiday_late_800$;
COMMIT;