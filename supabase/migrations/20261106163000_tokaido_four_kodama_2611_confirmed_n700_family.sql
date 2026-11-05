-- JR-East 2611 official individual-train timetable, JR-Central Tokaido
-- Shinkansen four weekday inbound Kodama trains. Official train number
-- and published planned N700-series model are supported; the precise
-- N700 variant, carset and operator-owned artwork are NOT inferred.
-- Follow existing source-only manual timetable / planned vehicle tables.
BEGIN;
SELECT pg_advisory_xact_lock(2611,701);
DO $kodama_2611$
DECLARE
 r record;
 v_id bigint;
 v_tt bigint;
 v_evidence bigint;
 n int:=0;
BEGIN
 FOR r IN SELECT * FROM (VALUES
  (9207,'こだま828','828A','Shin-Osaka','12:54','16:48','https://timetables.jreast.co.jp/2611/train/125/129361.html'),
  (9211,'こだま840','840A','Shin-Osaka','15:54','19:48','https://timetables.jreast.co.jp/2611/train/125/129391.html'),
  (9218,'こだま852','852A','Shin-Osaka','18:54','22:48','https://timetables.jreast.co.jp/2611/train/125/129411.html'),
  (9220,'こだま850','850A','Nagoya','19:38','22:12','https://timetables.jreast.co.jp/2611/train/125/129571.html')
 ) AS v(source_id,service_name,full_number,first_station,first_departure,last_arrival,source_url)
 LOOP
  SELECT m.id,tm.timetable_id INTO STRICT v_id,v_tt
  FROM manual_timetable_templates m
  JOIN train_timetable_members tm ON tm.source_template_id=m.id AND tm.member_role='primary'
  JOIN train_timetables tt ON tt.id=tm.timetable_id AND tt.group_evidence='source_only'
  WHERE m.id=r.source_id
    AND m.line_key='TokaidoShinkansen'
    AND m.railway_urn='odpt.Railway:JR-Central.TokaidoShinkansen'
    AND m.calendar_urn='odpt.Calendar:Weekday'
    AND m.direction_urn='odpt.RailDirection:Inbound'
    AND m.train_number=r.service_name
    AND EXISTS (SELECT 1 FROM manual_timetable_template_stops s
      WHERE s.template_id=m.id
        AND s.departure_station_urn='odpt.Station:JR-Central.TokaidoShinkansen.'||r.first_station
        AND s.departure_clock=r.first_departure)
    AND EXISTS (SELECT 1 FROM manual_timetable_template_stops s
      WHERE s.template_id=m.id
        AND s.arrival_station_urn='odpt.Station:JR-Central.TokaidoShinkansen.Tokyo'
        AND s.arrival_clock=r.last_arrival);

  IF EXISTS (SELECT 1 FROM published_train_number_evidence e WHERE e.edition='2611' AND e.source_template_id=v_id
    AND (e.train_number<>r.full_number OR e.official_source_url<>r.source_url))
  THEN RAISE EXCEPTION 'Conflicting number evidence: %',r.service_name; END IF;
  IF EXISTS (SELECT 1 FROM train_timetable_vehicle_mappings vm WHERE vm.timetable_id=v_tt
      AND (vm.source_template_id<>v_id OR vm.vehicle_type<>'N700系'
       OR vm.mapping_level<>'official_service_vehicle_plan' OR vm.actual_vehicle_confirmed IS DISTINCT FROM false))
  THEN RAISE EXCEPTION 'Conflicting vehicle plan: %',r.service_name; END IF;

  INSERT INTO published_train_number_evidence
    (edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,official_source_url,verification_scope)
  VALUES('2611','TokaidoShinkansen','odpt.Calendar:Weekday','odpt.RailDirection:Inbound',
   r.full_number,v_id,r.source_url,'train_number_only')
  ON CONFLICT DO NOTHING;
  IF (SELECT count(*) FROM published_train_number_evidence e
    WHERE e.edition='2611' AND e.line_key='TokaidoShinkansen'
      AND e.calendar_urn='odpt.Calendar:Weekday'
      AND e.direction_urn='odpt.RailDirection:Inbound'
      AND e.source_template_id=v_id AND e.train_number=r.full_number
      AND e.official_source_url=r.source_url AND e.verification_scope='train_number_only')<>1
  THEN RAISE EXCEPTION 'Number proof mismatch %',r.full_number; END IF;

  SELECT id INTO v_evidence FROM evidence_sources
  WHERE source_key='jr-east-2611-kodama-'||lower(r.full_number)||'-n700-planned';
  IF v_evidence IS NULL THEN
    INSERT INTO evidence_sources (id,source_key,source_url,source_type,evidence_grade,notes)
    VALUES((SELECT coalesce(max(id),0)+1 FROM evidence_sources),
      'jr-east-2611-kodama-'||lower(r.full_number)||'-n700-planned',
      r.source_url,'official','A',
      'Official November 2026 timetable: '||r.full_number||' is planned as N700系; no N700A/N700S subclass, actual carset or image ownership inferred')
    RETURNING id INTO v_evidence;
  END IF;
  IF (SELECT count(*) FROM evidence_sources e
    WHERE e.id=v_evidence AND e.source_url=r.source_url AND e.source_type='official'
      AND e.evidence_grade='A')<>1
  THEN RAISE EXCEPTION 'Evidence source mismatch %',r.full_number; END IF;
  INSERT INTO train_timetable_vehicle_mappings
     (timetable_id,source_template_id,vehicle_type,mapping_level,source_id,source_path,actual_vehicle_confirmed)
  SELECT v_tt,v_id,'N700系','official_service_vehicle_plan',v_evidence,
    'official-2611:'||r.source_url,false
  WHERE NOT EXISTS (SELECT 1 FROM train_timetable_vehicle_mappings vm WHERE vm.timetable_id=v_tt);
  IF (SELECT count(*) FROM train_timetable_vehicle_mappings vm
    WHERE vm.timetable_id=v_tt AND vm.source_template_id=v_id AND vm.vehicle_type='N700系'
     AND vm.mapping_level='official_service_vehicle_plan'
     AND vm.source_id=v_evidence AND vm.actual_vehicle_confirmed=false)<>1
  THEN RAISE EXCEPTION 'Vehicle plan mismatch %',r.full_number; END IF;
  n:=n+1;
 END LOOP;
 IF n<>4 THEN RAISE EXCEPTION 'Expected exactly four Kodama records, got %',n; END IF;
END $kodama_2611$;
COMMIT;