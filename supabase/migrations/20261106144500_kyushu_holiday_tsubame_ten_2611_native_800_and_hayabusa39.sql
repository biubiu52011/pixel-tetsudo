-- 2611 JR-Kyushu holiday timetable: ten EXACT origin/destination/time
-- matched Tsubame services, independent official full numbers and
-- scheduled model evidence. 8x native JR-Kyushu 800-series PNG; do not
-- substitute foreign N700 PNG or claim actual physical consist.
-- つばめ303/336 are withheld due to obsolete source arrival/departure clocks.
BEGIN;
SELECT pg_advisory_xact_lock(2611,800);
DO $kyushu_holiday_2611$
DECLARE
 r record;
 v_template_id bigint;
 v_timetable_id bigint;
 v_source_id bigint;
 v_png text:='../images/列车/JR九州/JR九州_800系.png';
 v_count int:=0;
 v_800 int:=0;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM vehicle_image_assets a WHERE a.operator='JR-Kyushu'
    AND a.vehicle_type='800系' AND a.image_path='images/列车/JR九州/JR九州_800系.png'
    AND a.asset_status='available' AND a.file_format_status='native_png'
    AND a.is_generic=true) THEN
   RAISE EXCEPTION 'JR-Kyushu 800 native PNG asset unavailable';
 END IF;
 FOR r IN SELECT * FROM (VALUES
  ('つばめ317','317A',128978,'09:36','10:24','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00350301.html?d=20261103&t=2828300'),
  ('つばめ319','319A',128967,'10:47','11:35','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00350401.html?d=20261101&t=2828300'),
  ('つばめ321','321A',129001,'11:36','12:26','N700系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00359501.html?d=20261103&t=2828300'),
  ('つばめ323','323A',129009,'12:47','13:36','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00350501.html?d=20261103&t=2828300'),
  ('つばめ325','325A',128992,'14:36','15:24','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00350601.html?d=20261103&t=2828300'),
  ('つばめ327','327A',128997,'15:12','16:00','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00350701.html?d=20261103&t=2828300'),
  ('つばめ329','329A',128989,'16:12','17:00','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00350801.html?d=20261105&t=2828300'),
  ('つばめ331','331A',129012,'17:06','17:55','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00350901.html?d=20261105&t=2828300'),
  ('つばめ333','333A',129047,'18:06','18:55','N700系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00351001.html?d=20261101&t=2828300'),
  ('つばめ335','335A',129038,'18:36','19:25','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00351101.html?d=20261103&t=2828300')
 ) AS x(service_label,full_number,source_id,departure_clock,arrival_clock,scheduled_model,official_url)
 LOOP
   SELECT m.id,mem.timetable_id INTO STRICT v_template_id,v_timetable_id
   FROM manual_timetable_templates m
   JOIN train_timetable_members mem ON mem.source_template_id=m.id AND mem.member_role='primary'
   JOIN train_timetables tt ON tt.id=mem.timetable_id AND tt.group_evidence='source_only'
   WHERE m.id=r.source_id
     AND m.line_key='KyushuShinkansen'
     AND m.railway_urn='odpt.Railway:JR-Kyushu.KyushuShinkansen'
     AND m.train_number=r.service_label
     AND m.calendar_urn='odpt.Calendar:SaturdayHoliday'
     AND m.direction_urn='odpt.RailDirection:Outbound'
     AND EXISTS (SELECT 1 FROM manual_timetable_template_stops s WHERE s.template_id=m.id
       AND s.departure_station_urn='odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata'
       AND s.departure_clock=r.departure_clock)
     AND EXISTS (SELECT 1 FROM manual_timetable_template_stops s WHERE s.template_id=m.id
       AND s.arrival_station_urn='odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto'
       AND s.arrival_clock=r.arrival_clock);
   IF EXISTS (SELECT 1 FROM published_train_number_evidence e
      WHERE e.source_template_id=v_template_id AND e.edition='2611'
        AND (e.train_number<>r.full_number OR e.official_source_url<>r.official_url))
   THEN RAISE EXCEPTION 'Conflicting official evidence for %',r.service_label; END IF;
   INSERT INTO published_train_number_evidence
      (edition,line_key,calendar_urn,direction_urn,train_number,
       source_template_id,official_source_url,verification_scope)
   VALUES ('2611','KyushuShinkansen','odpt.Calendar:SaturdayHoliday',
     'odpt.RailDirection:Outbound',r.full_number,v_template_id,r.official_url,'train_number_only')
   ON CONFLICT DO NOTHING;
   IF (SELECT count(*) FROM published_train_number_evidence e
       WHERE e.edition='2611' AND e.line_key='KyushuShinkansen'
         AND e.calendar_urn='odpt.Calendar:SaturdayHoliday'
         AND e.direction_urn='odpt.RailDirection:Outbound'
         AND e.source_template_id=v_template_id
         AND e.train_number=r.full_number AND e.official_source_url=r.official_url
         AND e.verification_scope='train_number_only')<>1
   THEN RAISE EXCEPTION 'Official full-number write mismatch %',r.full_number; END IF;

   SELECT id INTO v_source_id FROM evidence_sources
   WHERE source_key='jrkyushu-2611-kyushu-shinkansen-'||lower(r.full_number)||'-'||lower(replace(r.scheduled_model,'系',''));
   IF v_source_id IS NULL THEN
     INSERT INTO evidence_sources (id,source_key,source_url,source_type,evidence_grade,notes)
     VALUES ((SELECT coalesce(max(id),0)+1 FROM evidence_sources),
      'jrkyushu-2611-kyushu-shinkansen-'||lower(r.full_number)||'-'||lower(replace(r.scheduled_model,'系','')),
      r.official_url,'official','A',
      'JR Kyushu 2611 holiday timetable official planned '||r.full_number||': '||r.scheduled_model||'; not an actual carset confirmation')
     RETURNING id INTO v_source_id;
   END IF;
   IF NOT EXISTS (SELECT 1 FROM evidence_sources e WHERE e.id=v_source_id
      AND e.source_url=r.official_url AND e.source_type='official' AND e.evidence_grade='A')
   THEN RAISE EXCEPTION 'Model source conflict %',r.full_number; END IF;
   IF EXISTS (SELECT 1 FROM train_timetable_vehicle_mappings v
      WHERE v.timetable_id=v_timetable_id AND
        (v.vehicle_type<>r.scheduled_model OR v.mapping_level<>'official_service_vehicle_plan'
         OR v.actual_vehicle_confirmed<>false))
   THEN RAISE EXCEPTION 'Existing model mapping conflict %',r.full_number; END IF;
   INSERT INTO train_timetable_vehicle_mappings
    (timetable_id,source_template_id,vehicle_type,mapping_level,
     source_id,source_path,actual_vehicle_confirmed)
   SELECT v_timetable_id,v_template_id,r.scheduled_model,'official_service_vehicle_plan',
       v_source_id,'official-2611:'||r.official_url,false
   WHERE NOT EXISTS (SELECT 1 FROM train_timetable_vehicle_mappings v
      WHERE v.timetable_id=v_timetable_id);
   IF (SELECT count(*) FROM train_timetable_vehicle_mappings v
      WHERE v.timetable_id=v_timetable_id AND v.source_template_id=v_template_id
        AND v.vehicle_type=r.scheduled_model
        AND v.mapping_level='official_service_vehicle_plan' AND v.source_id=v_source_id
        AND v.actual_vehicle_confirmed=false)<>1
   THEN RAISE EXCEPTION 'Model write mismatch %',r.full_number; END IF;

   IF r.scheduled_model='800系' THEN
     INSERT INTO published_train_png_number_ranges
       (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
       png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
     VALUES ('2611','KyushuShinkansen','holiday_verified_single_number',
       substring(r.full_number FROM '^[0-9]+')::int,
       substring(r.full_number FROM '^[0-9]+')::int,
       'A','800系',v_png,r.official_url,true,false)
     ON CONFLICT DO NOTHING;
     IF (SELECT count(*) FROM published_train_png_number_ranges p
        WHERE p.edition='2611' AND p.line_key='KyushuShinkansen'
          AND p.min_number=substring(r.full_number FROM '^[0-9]+')::int
          AND p.max_number=p.min_number AND p.suffix='A' AND p.vehicle_model='800系'
          AND p.png_reference=v_png AND p.requires_exact_roster=true
          AND p.actual_vehicle_confirmed=false)<>1
     THEN RAISE EXCEPTION '800-series PNG mismatch %',r.full_number; END IF;
     v_800:=v_800+1;
   END IF;
   v_count:=v_count+1;
 END LOOP;
 IF v_count<>10 OR v_800<>8 THEN
  RAISE EXCEPTION 'Expected 10 holiday proofs and 8 native PNG, got %/%',v_count,v_800;
 END IF;
END $kyushu_holiday_2611$;

-- No bare name or numeric range permitted. Hayabusa39 has an exact
-- official Nov-2026 published number, matching Tokyo 19:20 -> Shin-Aomori 22:30.
-- Does not assert H5/E5 model or exact trainset.
DO $hayabusa39$
DECLARE v_id bigint;
BEGIN
 SELECT m.id INTO STRICT v_id FROM manual_timetable_templates m
 JOIN train_timetable_members mem ON mem.source_template_id=m.id AND mem.member_role='primary'
 JOIN train_timetables tt ON tt.id=mem.timetable_id AND tt.group_evidence='source_only'
 WHERE m.id=1329 AND m.line_key='TohokuShinkansen'
 AND m.railway_urn='odpt.Railway:JR-East.TohokuShinkansen'
 AND m.calendar_urn='odpt.Calendar:Weekday'
 AND m.direction_urn='odpt.RailDirection:Outbound'
 AND m.train_number='Hayabusa39'
 AND EXISTS(SELECT 1 FROM manual_timetable_template_stops s
    WHERE s.template_id=m.id AND s.departure_station_urn='odpt.Station:JR-East.TohokuShinkansen.Tokyo'
      AND s.departure_clock='19:20')
 AND EXISTS(SELECT 1 FROM manual_timetable_template_stops s
    WHERE s.template_id=m.id AND s.arrival_station_urn='odpt.Station:JR-East.TohokuShinkansen.Shin-Aomori'
      AND s.arrival_clock='22:30');
 INSERT INTO published_train_number_evidence
  (edition,line_key,calendar_urn,direction_urn,train_number,
    source_template_id,official_source_url,verification_scope)
 VALUES ('2611','TohokuShinkansen','odpt.Calendar:Weekday','odpt.RailDirection:Outbound',
  '3039B',v_id,'https://timetables.jreast.co.jp/2611/train/050/051791.html','train_number_only')
 ON CONFLICT DO NOTHING;
 IF (SELECT count(*) FROM published_train_number_evidence e
   WHERE e.edition='2611' AND e.source_template_id=v_id
     AND e.train_number='3039B' AND e.line_key='TohokuShinkansen'
     AND e.official_source_url='https://timetables.jreast.co.jp/2611/train/050/051791.html')<>1
 THEN RAISE EXCEPTION 'Hayabusa39 number mismatch'; END IF;
END $hayabusa39$;
COMMIT;
