-- Six individually evidenced JR-East 2026-11 Hikari 646A/656A/
-- 658A/660A/666A/668A. Restore all published arrival/departure stop
-- events in the EXISTING JR-Central Tokaido source template owner.
-- The source currently omits Odawara/Toyohashi/Shizuoka/Hamamatsu
-- stops and mislabels many arrival times. Full old-route assertion
-- precedes reconstruction; derived VIEW is verified event by event.
-- N700 family only; never assert N700A vs N700S or arbitrary PNG.
BEGIN;
SELECT pg_advisory_xact_lock(2611,646);
DO $tokaido_six_hikari_2611$
DECLARE
 r record; id_ bigint; tt_ bigint; n int; i int; evidence_id bigint;
 new_path text; existing text; site text; event text; clock_ text;
BEGIN
 FOR r IN SELECT * FROM (VALUES
  (9254,'ひかり646','646A','Inbound','https://timetables.jreast.co.jp/2611/train/025/027161.html','Shin-Osaka@10:18|Kyoto@10:32|Kyoto@10:33|Maibara@10:55|Maibara@10:56|Gifu-Hashima@11:08|Gifu-Hashima@11:09|Nagoya@11:24|Nagoya@11:25|Shin-Yokohama@12:52|Shin-Yokohama@12:53|Shinagawa@13:04|Shinagawa@13:05|Tokyo@13:13',ARRAY['Shin-Osaka','Kyoto','Kyoto','Maibara','Maibara','Gifu-Hashima','Gifu-Hashima','Nagoya','Nagoya','Odawara','Odawara','Shin-Yokohama','Shin-Yokohama','Shinagawa','Shinagawa','Tokyo']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['10:18','10:31','10:33','10:52','10:57','11:09','11:15','11:25','11:31','12:38','12:39','12:53','12:54','13:05','13:06','13:12']::text[],'Tokyo'),
  (9258,'ひかり656','656A','Inbound','https://timetables.jreast.co.jp/2611/train/060/062671.html','Shin-Osaka@15:18|Kyoto@15:32|Kyoto@15:33|Maibara@15:55|Maibara@15:56|Gifu-Hashima@16:08|Gifu-Hashima@16:09|Nagoya@16:22|Nagoya@16:23|Shin-Yokohama@17:53|Shin-Yokohama@17:54|Shinagawa@18:04|Shinagawa@18:05|Tokyo@18:13',ARRAY['Shin-Osaka','Kyoto','Kyoto','Maibara','Maibara','Gifu-Hashima','Gifu-Hashima','Nagoya','Nagoya','Toyohashi','Toyohashi','Shin-Yokohama','Shin-Yokohama','Shinagawa','Shinagawa','Tokyo']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['15:18','15:31','15:33','15:51','15:56','16:09','16:14','16:23','16:25','16:44','16:48','17:54','17:55','18:05','18:06','18:12']::text[],'Tokyo'),
  (9259,'ひかり658','658A','Inbound','https://timetables.jreast.co.jp/2611/train/025/027131.html','Shin-Osaka@16:18|Kyoto@16:32|Kyoto@16:33|Maibara@16:55|Maibara@16:56|Gifu-Hashima@17:08|Gifu-Hashima@17:09|Nagoya@17:22|Nagoya@17:23|Shin-Yokohama@18:49|Shin-Yokohama@18:50|Shinagawa@19:01|Shinagawa@19:02|Tokyo@19:10',ARRAY['Shin-Osaka','Kyoto','Kyoto','Maibara','Maibara','Gifu-Hashima','Gifu-Hashima','Nagoya','Nagoya','Odawara','Odawara','Shin-Yokohama','Shin-Yokohama','Shinagawa','Shinagawa','Tokyo']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['16:18','16:31','16:33','16:51','16:56','17:09','17:14','17:23','17:25','18:33','18:36','18:50','18:51','19:02','19:03','19:09']::text[],'Tokyo'),
  (9260,'ひかり660','660A','Inbound','https://timetables.jreast.co.jp/2611/train/060/062701.html','Shin-Osaka@17:18|Kyoto@17:32|Kyoto@17:33|Maibara@17:55|Maibara@17:56|Gifu-Hashima@18:08|Gifu-Hashima@18:09|Nagoya@18:22|Nagoya@18:23|Shin-Yokohama@19:53|Shin-Yokohama@19:54|Shinagawa@20:04|Shinagawa@20:05|Tokyo@20:13',ARRAY['Shin-Osaka','Kyoto','Kyoto','Maibara','Maibara','Gifu-Hashima','Gifu-Hashima','Nagoya','Nagoya','Toyohashi','Toyohashi','Shin-Yokohama','Shin-Yokohama','Shinagawa','Shinagawa','Tokyo']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['17:18','17:31','17:33','17:51','17:56','18:09','18:14','18:23','18:25','18:44','18:48','19:54','19:55','20:05','20:06','20:12']::text[],'Tokyo'),
  (9263,'ひかり666','666A','Inbound','https://timetables.jreast.co.jp/2611/train/025/027111.html','Shin-Osaka@20:21|Kyoto@20:35|Kyoto@20:36|Maibara@20:58|Maibara@20:59|Nagoya@21:17|Nagoya@21:18|Shin-Yokohama@22:46|Shin-Yokohama@22:47|Shinagawa@22:58|Shinagawa@22:59|Tokyo@23:07',ARRAY['Shin-Osaka','Kyoto','Kyoto','Maibara','Maibara','Nagoya','Nagoya','Shizuoka','Shizuoka','Shin-Yokohama','Shin-Yokohama','Shinagawa','Shinagawa','Tokyo']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['20:21','20:34','20:36','20:54','21:00','21:18','21:24','22:07','22:11','22:47','22:48','22:59','23:00','23:06']::text[],'Tokyo'),
  (9264,'ひかり668','668A','Inbound','https://timetables.jreast.co.jp/2611/train/060/062721.html','Shin-Osaka@20:45|Kyoto@20:58|Kyoto@20:59|Nagoya@21:32|Nagoya@21:33|Shin-Yokohama@23:10|Shin-Yokohama@23:11|Shinagawa@23:21|Shinagawa@23:22|Tokyo@23:30',ARRAY['Shin-Osaka','Kyoto','Kyoto','Nagoya','Nagoya','Hamamatsu','Hamamatsu','Shizuoka','Shizuoka','Odawara','Odawara','Shin-Yokohama','Shin-Yokohama','Shinagawa','Shinagawa','Tokyo']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['20:45','20:58','20:59','21:33','21:39','22:06','22:07','22:26','22:29','22:53','22:56','23:11','23:12','23:22','23:23','23:29']::text[],'Tokyo')
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
END $tokaido_six_hikari_2611$;
COMMIT;