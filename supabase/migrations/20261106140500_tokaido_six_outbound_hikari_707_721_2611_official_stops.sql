-- Six separately confirmed official 2611 JR-East Hikari outbound
-- trains 707/709/711/717/719/721 from Tokyo to Shin-Osaka,
-- continuing toward Okayama outside this existing Tokaido segment.
-- Legacy source misses Mishima/Atami, Shizuoka, Hamamatsu and
-- misstates Nagoya/Kyoto departure clocks. Rebuild ONLY the owned
-- manual_timetable_template_stops after asserting the FULL old route,
-- then read back derived train_timetable_stops. Official published
-- A numbers and N700-series planned family (NO physical carset/PNG).
BEGIN;
SELECT pg_advisory_xact_lock(2611,707);
DO $tokaido_six_outbound_hikari_2611$
DECLARE
 r record; id_ bigint; tt_ bigint; n int; i int; evidence_id bigint;
 new_path text; existing text; site text; event text; clock_ text;
BEGIN
 FOR r IN SELECT * FROM (VALUES
  (9242,'ひかり707','707A','Outbound','https://timetables.jreast.co.jp/2611/train/125/128521.html','Tokyo@10:03|Shinagawa@10:09|Shinagawa@10:10|Shin-Yokohama@10:20|Shin-Yokohama@10:21|Nagoya@11:43|Nagoya@11:44|Kyoto@12:35|Kyoto@12:36|Shin-Osaka@12:57',ARRAY['Tokyo','Shinagawa','Shinagawa','Shin-Yokohama','Shin-Yokohama','Atami','Atami','Shizuoka','Shizuoka','Hamamatsu','Hamamatsu','Nagoya','Nagoya','Kyoto','Kyoto','Shin-Osaka']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['10:03','10:09','10:10','10:20','10:21','10:39','10:40','11:02','11:07','11:27','11:31','12:01','12:03','12:37','12:43','12:57']::text[],'Shin-Osaka'),
  (9243,'ひかり709','709A','Outbound','https://timetables.jreast.co.jp/2611/train/125/128531.html','Tokyo@11:03|Shinagawa@11:09|Shinagawa@11:10|Shin-Yokohama@11:20|Shin-Yokohama@11:21|Nagoya@12:43|Nagoya@12:44|Kyoto@13:35|Kyoto@13:36|Shin-Osaka@13:57',ARRAY['Tokyo','Shinagawa','Shinagawa','Shin-Yokohama','Shin-Yokohama','Mishima','Mishima','Shizuoka','Shizuoka','Hamamatsu','Hamamatsu','Nagoya','Nagoya','Kyoto','Kyoto','Shin-Osaka']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['11:03','11:09','11:10','11:20','11:21','11:45','11:46','12:02','12:07','12:27','12:31','13:01','13:03','13:37','13:43','13:57']::text[],'Shin-Osaka'),
  (9244,'ひかり711','711A','Outbound','https://timetables.jreast.co.jp/2611/train/125/128541.html','Tokyo@12:03|Shinagawa@12:09|Shinagawa@12:10|Shin-Yokohama@12:20|Shin-Yokohama@12:21|Nagoya@13:43|Nagoya@13:44|Kyoto@14:35|Kyoto@14:36|Shin-Osaka@14:57',ARRAY['Tokyo','Shinagawa','Shinagawa','Shin-Yokohama','Shin-Yokohama','Shizuoka','Shizuoka','Hamamatsu','Hamamatsu','Nagoya','Nagoya','Kyoto','Kyoto','Shin-Osaka']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['12:03','12:09','12:10','12:20','12:21','13:02','13:07','13:27','13:31','14:01','14:03','14:37','14:43','14:57']::text[],'Shin-Osaka'),
  (9247,'ひかり717','717A','Outbound','https://timetables.jreast.co.jp/2611/train/125/128571.html','Tokyo@15:03|Shinagawa@15:09|Shinagawa@15:10|Shin-Yokohama@15:20|Shin-Yokohama@15:21|Nagoya@16:43|Nagoya@16:44|Kyoto@17:35|Kyoto@17:36|Shin-Osaka@17:57',ARRAY['Tokyo','Shinagawa','Shinagawa','Shin-Yokohama','Shin-Yokohama','Mishima','Mishima','Shizuoka','Shizuoka','Hamamatsu','Hamamatsu','Nagoya','Nagoya','Kyoto','Kyoto','Shin-Osaka']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['15:03','15:09','15:10','15:20','15:21','15:45','15:46','16:02','16:07','16:27','16:31','17:01','17:03','17:37','17:43','17:57']::text[],'Shin-Osaka'),
  (9248,'ひかり719','719A','Outbound','https://timetables.jreast.co.jp/2611/train/125/128581.html','Tokyo@16:03|Shinagawa@16:09|Shinagawa@16:10|Shin-Yokohama@16:20|Shin-Yokohama@16:21|Nagoya@17:43|Nagoya@17:44|Kyoto@18:35|Kyoto@18:36|Shin-Osaka@18:57',ARRAY['Tokyo','Shinagawa','Shinagawa','Shin-Yokohama','Shin-Yokohama','Atami','Atami','Shizuoka','Shizuoka','Hamamatsu','Hamamatsu','Nagoya','Nagoya','Kyoto','Kyoto','Shin-Osaka']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['16:03','16:09','16:10','16:20','16:21','16:39','16:40','17:02','17:07','17:27','17:31','18:01','18:03','18:37','18:43','18:57']::text[],'Shin-Osaka'),
  (9249,'ひかり721','721A','Outbound','https://timetables.jreast.co.jp/2611/train/125/128591.html','Tokyo@17:03|Shinagawa@17:09|Shinagawa@17:10|Shin-Yokohama@17:20|Shin-Yokohama@17:21|Nagoya@18:43|Nagoya@18:44|Kyoto@19:35|Kyoto@19:36|Shin-Osaka@19:57',ARRAY['Tokyo','Shinagawa','Shinagawa','Shin-Yokohama','Shin-Yokohama','Mishima','Mishima','Shizuoka','Shizuoka','Hamamatsu','Hamamatsu','Nagoya','Nagoya','Kyoto','Kyoto','Shin-Osaka']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['17:03','17:09','17:10','17:20','17:21','17:45','17:46','18:02','18:07','18:27','18:31','19:01','19:03','19:37','19:43','19:57']::text[],'Shin-Osaka')
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
END $tokaido_six_outbound_hikari_2611$;
COMMIT;