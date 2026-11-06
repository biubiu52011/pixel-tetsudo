-- JR West official 2026-11-14 Hikari 704A 2611 edition.
-- Source template 9267 wrongly uses Shin-Osaka arrival 10:46 as
-- Tokaido departure 10:48 and omits official Hamamatsu, Shizuoka
-- and Atami stops. Rebuild the EXISTING source stop rows after
-- strict old-route/source-only validation, then read back through
-- the canonical train_timetable_stops VIEW. Official N700 family
-- planned only: never presume N700A/N700S or a specific PNG.
BEGIN;
SELECT pg_advisory_xact_lock(2611,704);
DO $tokaido_hikari704_2611$
DECLARE
 r record; id_ bigint; tt_ bigint; n int; i int; evidence_id bigint;
 new_path text; existing text; site text; event text; clock_ text;
BEGIN
 FOR r IN SELECT * FROM (VALUES
  (9267,'ひかり704','704A','Inbound','https://timetable.jr-odekake.net/train-timetable/314481?date=20261114','Shin-Osaka@10:46|Kyoto@11:06|Kyoto@11:07|Nagoya@11:41|Nagoya@11:42|Shin-Yokohama@13:23|Shin-Yokohama@13:24|Shinagawa@13:34|Shinagawa@13:35|Tokyo@13:43',ARRAY['Shin-Osaka','Kyoto','Kyoto','Nagoya','Nagoya','Hamamatsu','Hamamatsu','Shizuoka','Shizuoka','Atami','Atami','Shin-Yokohama','Shin-Yokohama','Shinagawa','Shinagawa','Tokyo']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['10:48','11:02','11:07','11:42','11:43','12:13','12:17','12:37','12:41','13:04','13:05','13:24','13:25','13:35','13:36','13:42']::text[],'Tokyo')
 ) AS v(template_id,service_name,full_number,direction,official_url,expected_old_route,stations,kinds,clocks,destination)
 LOOP
  IF array_length(r.stations,1)<>array_length(r.kinds,1)
     OR array_length(r.stations,1)<>array_length(r.clocks,1)
   THEN RAISE EXCEPTION 'Official 2611 stops are not aligned for %',r.service_name; END IF;
  SELECT m.id,mem.timetable_id INTO STRICT id_,tt_
  FROM manual_timetable_templates m
  JOIN train_timetable_members mem ON mem.source_template_id=m.id
    AND mem.member_role='primary' AND mem.first_stop_sequence=0
    AND mem.stop_offset=0 AND mem.merge_first_stop=false
  JOIN train_timetables t ON t.id=mem.timetable_id AND t.group_evidence='source_only'
    AND t.primary_train_number=m.train_number AND t.canonical_key='source:'||m.id
  WHERE m.id=r.template_id AND m.line_key='TokaidoShinkansen'
    AND m.railway_urn='odpt.Railway:JR-Central.TokaidoShinkansen'
    AND m.calendar_urn='odpt.Calendar:Weekday'
    AND m.direction_urn='odpt.RailDirection:'||r.direction
    AND m.train_number=r.service_name
    AND m.destination_urns=ARRAY['odpt.Station:JR-Central.TokaidoShinkansen.'||r.destination]::text[]
    AND m.source_path='data/timetables/TokaidoShinkansen-manual.js'
    AND mem.last_stop_sequence=(SELECT max(s.stop_sequence) FROM manual_timetable_template_stops s WHERE s.template_id=m.id)
    AND (SELECT count(*) FROM train_timetable_members x WHERE x.timetable_id=t.id)=1;
  IF EXISTS(SELECT 1 FROM published_train_number_evidence e WHERE e.edition='2611' AND e.source_template_id=id_)
    OR EXISTS(SELECT 1 FROM train_timetable_vehicle_mappings vm WHERE vm.timetable_id=tt_)
   THEN RAISE EXCEPTION 'Tokaido existing official evidence conflict for %',r.service_name; END IF;
  existing := (SELECT string_agg(regexp_replace(coalesce(s.departure_station_urn,s.arrival_station_urn),'^.*[.]','')||
     '@'||coalesce(s.departure_clock,s.arrival_clock),'|' ORDER BY s.stop_sequence)
     FROM manual_timetable_template_stops s WHERE s.template_id=id_);
  IF existing<>r.expected_old_route
    OR (SELECT count(*) FROM train_timetable_stops z WHERE z.source_template_id=id_ AND z.timetable_id=tt_)<>(
       SELECT count(*) FROM manual_timetable_template_stops s WHERE s.template_id=id_)
    THEN RAISE EXCEPTION 'Official Hikari source old stop mismatch %: %',r.service_name,existing; END IF;
  IF r.kinds[1]<>'D' OR r.kinds[array_length(r.kinds,1)]<>'A'
    OR r.stations[array_length(r.stations,1)]<>r.destination
    THEN RAISE EXCEPTION 'Unusable Hikari source stop boundaries %',r.service_name; END IF;
  DELETE FROM manual_timetable_template_stops s WHERE s.template_id=id_;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>array_length(string_to_array(r.expected_old_route,'|'),1)
     THEN RAISE EXCEPTION 'Hikari source deletion cardinality mismatch %',r.service_name; END IF;
  FOR i IN 1..array_length(r.stations,1) LOOP
    site:='odpt.Station:JR-Central.TokaidoShinkansen.'||r.stations[i];
    event:=r.kinds[i];clock_:=r.clocks[i];
    IF event='D' THEN
      INSERT INTO manual_timetable_template_stops
      (template_id,stop_sequence,departure_station_urn,departure_clock)
      VALUES(id_,i-1,site,clock_);
    ELSIF event='A' THEN
      INSERT INTO manual_timetable_template_stops
      (template_id,stop_sequence,arrival_station_urn,arrival_clock)
      VALUES(id_,i-1,site,clock_);
    ELSE
      RAISE EXCEPTION 'Unknown official stop event % for %',event,r.service_name;
    END IF;
  END LOOP;
  UPDATE train_timetable_members mem
   SET last_stop_sequence=array_length(r.stations,1)-1
   WHERE mem.source_template_id=id_ AND mem.timetable_id=tt_
     AND mem.first_stop_sequence=0
     AND mem.last_stop_sequence=array_length(string_to_array(r.expected_old_route,'|'),1)-1;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'Hikari member boundary mismatch %',r.service_name; END IF;
  new_path := (SELECT string_agg(regexp_replace(z.station_urn,'^.*[.]','')||'@'||
     coalesce(z.departure_clock,z.arrival_clock),'|' ORDER BY z.stop_sequence)
     FROM train_timetable_stops z WHERE z.source_template_id=id_ AND z.timetable_id=tt_);
  IF new_path<>(SELECT string_agg(r.stations[j]||'@'||r.clocks[j],'|' ORDER BY j)
      FROM generate_subscripts(r.stations,1) AS j)
    OR (SELECT count(*) FROM train_timetable_stops z WHERE z.source_template_id=id_ AND z.timetable_id=tt_)<>array_length(r.stations,1)
   THEN RAISE EXCEPTION 'Published Hikari view/rebuilt official route mismatch %',r.service_name; END IF;
  INSERT INTO published_train_number_evidence
    (edition,line_key,calendar_urn,direction_urn,train_number,
       source_template_id,official_source_url,verification_scope)
   VALUES('2611','TokaidoShinkansen','odpt.Calendar:Weekday','odpt.RailDirection:'||r.direction,
     r.full_number,id_,r.official_url,'train_number_only') ON CONFLICT DO NOTHING;
  IF (SELECT count(*) FROM published_train_number_evidence e WHERE e.edition='2611'
    AND e.source_template_id=id_ AND e.train_number=r.full_number
    AND e.official_source_url=r.official_url AND e.line_key='TokaidoShinkansen'
    AND e.calendar_urn='odpt.Calendar:Weekday'
    AND e.direction_urn='odpt.RailDirection:'||r.direction)<>1
   THEN RAISE EXCEPTION 'Hikari full number evidence mismatch %',r.service_name; END IF;
  INSERT INTO evidence_sources (id,source_key,source_url,source_type,evidence_grade,notes)
   VALUES ((SELECT coalesce(max(id),0)+1 FROM evidence_sources),
     'jreast-2611-tokaido-hikari-'||lower(r.full_number)||'-n700-family',
     r.official_url,'official','A','JR East 2611 individual Hikari official planned N700 family; no specific N700A/S vehicle or actual dispatch')
   RETURNING id INTO evidence_id;
  INSERT INTO train_timetable_vehicle_mappings
   (timetable_id,source_template_id,vehicle_type,mapping_level,source_id,source_path,actual_vehicle_confirmed)
  VALUES(tt_,id_,'N700系','official_service_vehicle_plan',evidence_id,'official-2611:'||r.official_url,false);
  IF (SELECT count(*) FROM train_timetable_vehicle_mappings v WHERE v.timetable_id=tt_
     AND v.source_template_id=id_ AND v.vehicle_type='N700系'
     AND v.mapping_level='official_service_vehicle_plan' AND v.source_id=evidence_id
     AND v.actual_vehicle_confirmed=false)<>1
   THEN RAISE EXCEPTION 'Hikari model mapping mismatch %',r.service_name; END IF;
 END LOOP;
END $tokaido_hikari704_2611$;
COMMIT;