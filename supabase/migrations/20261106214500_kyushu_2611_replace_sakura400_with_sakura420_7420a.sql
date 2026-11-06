-- JR Kyushu 2611 official: legacy さくら400 (400A) is no
-- longer the same November service. Starting 2026-10-23, the
-- 06:00 Kagoshima-Chuo -> 07:41 Hakata planned itinerary is さくら420,
-- formal 7420A, JR-Kyushu 800 series (6 cars).
-- Reuse source-only template 128970 and its original canonical member;
-- preserve old source_trip_id as historical imported provenance.
-- Official new 420 does NOT call at Shin-Yatsushiro: remove only that
-- old stop, shift subsequent stop_sequence and member boundary.
-- No new tables, no actual rolling-stock set claimed.
BEGIN;
SELECT pg_advisory_xact_lock(2611,7420);
DO $jrkyushu_sakura420_2611$
DECLARE
  m_id bigint; t_id bigint; source_id bigint; n int;
  i int; station text; old_clock text; new_clock text;
  old_stations text[]:=ARRAY['Kagoshima-Chuo','Sendai','Izumi','Shin-Minamata',
    'Shin-Yatsushiro','Kumamoto','Kurume','Shin-Tosu','Hakata'];
  legacy_times text[]:=ARRAY['06:04','06:17','06:29','06:36',
    '06:50','07:02','07:23','07:28','07:41'];
  new_times text[]:=ARRAY['06:00','06:12','06:24','06:31',
    null,'07:02','07:23','07:28','07:41'];
  source_url text:='https://www.jrkyushu-timetable.jp/sp/2611/0038/00385801.html?d=20261101&t=2814400';
BEGIN
  SELECT m.id,mem.timetable_id INTO STRICT m_id,t_id
  FROM manual_timetable_templates m
  JOIN train_timetable_members mem ON mem.source_template_id=m.id AND mem.member_role='primary'
  JOIN train_timetables t ON t.id=mem.timetable_id AND t.group_evidence='source_only'
  WHERE m.id=128970 AND m.line_key='KyushuShinkansen'
    AND m.railway_urn='odpt.Railway:JR-Kyushu.KyushuShinkansen'
    AND m.calendar_urn='odpt.Calendar:SaturdayHoliday'
    AND m.direction_urn='odpt.RailDirection:Inbound'
    AND m.train_number='さくら400'
    AND m.destination_urns=ARRAY['odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata']::text[]
    AND m.source_trip_id='jrkyushu:20260314:kyushu:さくら400'
    AND m.source_path='official-sampled:holiday:https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf'
    AND t.canonical_key='source:128970' AND t.primary_train_number='さくら400'
    AND mem.first_stop_sequence=0 AND mem.last_stop_sequence=8
    AND mem.stop_offset=0 AND mem.merge_first_stop=false
    AND (SELECT count(*) FROM train_timetable_members x WHERE x.timetable_id=t.id)=1;
  IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=m_id)<>9
   OR (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=m_id AND timetable_id=t_id)<>9
    THEN RAISE EXCEPTION 'Source 400 original stops mismatch'; END IF;
  IF EXISTS(SELECT 1 FROM manual_timetable_templates z WHERE z.id<>m_id AND z.line_key='KyushuShinkansen'
     AND z.train_number='さくら420' AND z.calendar_urn='odpt.Calendar:SaturdayHoliday')
    THEN RAISE EXCEPTION '420 already exists on this calendar'; END IF;
  IF EXISTS(SELECT 1 FROM published_train_number_evidence e WHERE e.edition='2611'
     AND (e.source_template_id=m_id OR
        (e.line_key='KyushuShinkansen' AND e.calendar_urn='odpt.Calendar:SaturdayHoliday'
         AND e.direction_urn='odpt.RailDirection:Inbound' AND e.train_number='7420A')))
    THEN RAISE EXCEPTION 'Conflicting official 420 November number'; END IF;
  IF EXISTS (SELECT 1 FROM train_timetable_vehicle_mappings vm WHERE vm.timetable_id=t_id)
    THEN RAISE EXCEPTION '400 legacy has unexpected planned model'; END IF;
  IF NOT EXISTS(SELECT 1 FROM vehicle_image_assets a WHERE a.operator='JR-Kyushu'
    AND a.vehicle_type='800系' AND a.image_path='images/列车/JR九州/JR九州_800系.png'
    AND a.asset_status='available' AND a.file_format_status='native_png' AND a.is_generic=true)
    THEN RAISE EXCEPTION 'JR-Kyushu 800 native PNG asset missing'; END IF;

  FOR i IN 1..9 LOOP
    station:='odpt.Station:JR-Kyushu.KyushuShinkansen.'||old_stations[i];
    old_clock:=legacy_times[i];new_clock:=new_times[i];
    IF (SELECT count(*) FROM manual_timetable_template_stops s
         WHERE s.template_id=m_id AND s.stop_sequence=i-1
           AND coalesce(s.departure_station_urn,s.arrival_station_urn)=station
           AND coalesce(s.departure_clock,s.arrival_clock)=old_clock
           AND ((i<9 AND s.departure_clock IS NOT NULL AND s.arrival_clock IS NULL)
             OR (i=9 AND s.arrival_clock IS NOT NULL AND s.departure_clock IS NULL)))<>1
      THEN RAISE EXCEPTION '420 source old stop mismatch at %',i; END IF;
  END LOOP;
  FOR i IN 1..9 LOOP
    IF i=5 THEN
      DELETE FROM manual_timetable_template_stops s
      WHERE s.template_id=m_id AND s.stop_sequence=4
        AND s.departure_station_urn='odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Yatsushiro'
        AND s.departure_clock='06:50' AND s.arrival_station_urn IS NULL AND s.arrival_clock IS NULL;
    ELSIF i<9 THEN
      UPDATE manual_timetable_template_stops s SET departure_clock=new_times[i]
      WHERE s.template_id=m_id AND s.stop_sequence=i-1
        AND s.departure_clock=legacy_times[i]
        AND s.departure_station_urn='odpt.Station:JR-Kyushu.KyushuShinkansen.'||old_stations[i];
    ELSE
      UPDATE manual_timetable_template_stops s SET arrival_clock=new_times[i]
      WHERE s.template_id=m_id AND s.stop_sequence=8
        AND s.arrival_clock=legacy_times[i]
        AND s.arrival_station_urn='odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata';
    END IF;
    GET DIAGNOSTICS n=ROW_COUNT;
    IF n<>1 THEN RAISE EXCEPTION '420 replacement expected one row at %',i; END IF;
  END LOOP;
  UPDATE manual_timetable_template_stops s SET stop_sequence=s.stop_sequence+100
    WHERE s.template_id=m_id AND s.stop_sequence BETWEEN 5 AND 8;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>4 THEN RAISE EXCEPTION '420 stop shift first stage mismatch'; END IF;
  UPDATE manual_timetable_template_stops s SET stop_sequence=s.stop_sequence-101
    WHERE s.template_id=m_id AND s.stop_sequence BETWEEN 105 AND 108;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>4 THEN RAISE EXCEPTION '420 stop shift second stage mismatch'; END IF;
  UPDATE train_timetable_members mem SET last_stop_sequence=7
    WHERE mem.source_template_id=m_id AND mem.timetable_id=t_id
      AND mem.first_stop_sequence=0 AND mem.last_stop_sequence=8;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION '420 member last stop mismatch'; END IF;
  UPDATE manual_timetable_templates m SET train_number='さくら420'
    WHERE m.id=m_id AND m.train_number='さくら400';
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION '420 template name mismatch'; END IF;
  UPDATE train_timetables t SET primary_train_number='さくら420'
    WHERE t.id=t_id AND t.primary_train_number='さくら400';
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION '420 canonical number mismatch'; END IF;

  IF (SELECT count(*) FROM train_timetable_stops z
    WHERE z.source_template_id=m_id AND z.timetable_id=t_id)<>8
    OR EXISTS (SELECT 1 FROM train_timetable_stops z
      WHERE z.source_template_id=m_id AND z.timetable_id=t_id
        AND z.station_urn='odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Yatsushiro')
    THEN RAISE EXCEPTION '420 derived 8-stop view mismatch'; END IF;
  IF (SELECT string_agg(regexp_replace(z.station_urn,'^.*[.]','')||'@'||
      coalesce(z.departure_clock,z.arrival_clock),'|' ORDER BY z.stop_sequence)
      FROM train_timetable_stops z WHERE z.source_template_id=m_id AND z.timetable_id=t_id)
     <>'Kagoshima-Chuo@06:00|Sendai@06:12|Izumi@06:24|Shin-Minamata@06:31|Kumamoto@07:02|Kurume@07:23|Shin-Tosu@07:28|Hakata@07:41'
   THEN RAISE EXCEPTION '420 published running plan clock sequence mismatch'; END IF;
  INSERT INTO published_train_number_evidence
   (edition,line_key,calendar_urn,direction_urn,train_number,
    source_template_id,official_source_url,verification_scope)
  VALUES('2611','KyushuShinkansen','odpt.Calendar:SaturdayHoliday',
     'odpt.RailDirection:Inbound','7420A',m_id,source_url,'train_number_only');
  INSERT INTO evidence_sources
    (id,source_key,source_url,source_type,evidence_grade,notes)
  VALUES ((SELECT coalesce(max(id),0)+1 FROM evidence_sources),
    'jrkyushu-2611-kyushu-sakura420-7420a-800',source_url,'official','A',
    'From 2026-10-23 JR Kyushu 2611 Sakura420 7420A replaces imported March Sakura400; eight-stop planned 800 series, real trainset not verified')
  RETURNING id INTO source_id;
  INSERT INTO train_timetable_vehicle_mappings
   (timetable_id,source_template_id,vehicle_type,mapping_level,source_id,source_path,actual_vehicle_confirmed)
  VALUES (t_id,m_id,'800系','official_service_vehicle_plan',source_id,'official-2611:'||source_url,false);
  INSERT INTO published_train_png_number_ranges
    (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
      png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
  VALUES ('2611','KyushuShinkansen','holiday_verified_single_number',7420,7420,'A',
     '800系','../images/列车/JR九州/JR九州_800系.png',source_url,true,false);
  IF (SELECT count(*) FROM published_train_number_evidence e
      WHERE e.source_template_id=m_id AND e.edition='2611' AND e.train_number='7420A')<>1
    OR (SELECT count(*) FROM train_timetable_vehicle_mappings vm
      WHERE vm.source_template_id=m_id AND vm.vehicle_type='800系'
       AND vm.actual_vehicle_confirmed=false AND vm.mapping_level='official_service_vehicle_plan')<>1
    OR (SELECT count(*) FROM published_train_png_number_ranges png
      WHERE png.edition='2611' AND png.line_key='KyushuShinkansen'
       AND png.min_number=7420 AND png.max_number=7420 AND png.suffix='A'
       AND png.actual_vehicle_confirmed=false AND png.requires_exact_roster=true)<>1
    THEN RAISE EXCEPTION '420 final evidence contract failed'; END IF;
END $jrkyushu_sakura420_2611$;
COMMIT;