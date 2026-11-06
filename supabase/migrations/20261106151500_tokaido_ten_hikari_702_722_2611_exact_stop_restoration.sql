-- Ten independent JR East 2611 official Hikari A numbers, 702 to
-- 722 (except 704). Rebuild only the existing JR-Central Tokaido
-- source-template event rows after asserting their complete original
-- route and each canonical source-only association. Official 2611
-- pages show Shin-Osaka DEPARTURE 2 minutes after Sanyo ARRIVAL;
-- legacy Tokaido templates incorrectly used the latter, and omitted
-- Hamamatsu, Shizuoka and variable Mishima/Atami/Toyohashi stops.
-- Source table is sole owner; derived train_timetable_stops VIEW
-- is verified after each reconstruction. Only published N700 family,
-- no unique N700A/S, no claimed carset and no PNG guessing.
BEGIN;
SELECT pg_advisory_xact_lock(2611,702);
DO $tokaido_ten_inbound_hikari_2611$
DECLARE
 r record; id_ bigint; tt_ bigint; n int; i int; evidence_id bigint;
 new_path text; existing text; site text; event text; clock_ text;
BEGIN
 FOR r IN SELECT * FROM (VALUES
  (9266,'ひかり702','702A','Inbound','https://timetables.jreast.co.jp/2611/train/125/128721.html','Shin-Osaka@09:46|Kyoto@10:06|Kyoto@10:07|Nagoya@10:41|Nagoya@10:42|Shin-Yokohama@12:23|Shin-Yokohama@12:24|Shinagawa@12:34|Shinagawa@12:35|Tokyo@12:43',ARRAY['Shin-Osaka','Kyoto','Kyoto','Nagoya','Nagoya','Hamamatsu','Hamamatsu','Shizuoka','Shizuoka','Mishima','Mishima','Shin-Yokohama','Shin-Yokohama','Shinagawa','Shinagawa','Tokyo']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['09:48','10:02','10:07','10:42','10:43','11:13','11:17','11:37','11:41','11:57','11:58','12:24','12:25','12:35','12:36','12:42']::text[],'Tokyo'),
  (9268,'ひかり706','706A','Inbound','https://timetables.jreast.co.jp/2611/train/125/128741.html','Shin-Osaka@11:46|Kyoto@12:06|Kyoto@12:07|Nagoya@12:41|Nagoya@12:42|Shin-Yokohama@14:23|Shin-Yokohama@14:24|Shinagawa@14:34|Shinagawa@14:35|Tokyo@14:43',ARRAY['Shin-Osaka','Kyoto','Kyoto','Nagoya','Nagoya','Hamamatsu','Hamamatsu','Shizuoka','Shizuoka','Mishima','Mishima','Shin-Yokohama','Shin-Yokohama','Shinagawa','Shinagawa','Tokyo']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['11:48','12:02','12:07','12:42','12:43','13:13','13:17','13:37','13:41','13:57','13:58','14:24','14:25','14:35','14:36','14:42']::text[],'Tokyo'),
  (9269,'ひかり708','708A','Inbound','https://timetables.jreast.co.jp/2611/train/125/128751.html','Shin-Osaka@12:46|Kyoto@13:06|Kyoto@13:07|Nagoya@13:41|Nagoya@13:42|Shin-Yokohama@15:23|Shin-Yokohama@15:24|Shinagawa@15:34|Shinagawa@15:35|Tokyo@15:43',ARRAY['Shin-Osaka','Kyoto','Kyoto','Nagoya','Nagoya','Hamamatsu','Hamamatsu','Shizuoka','Shizuoka','Shin-Yokohama','Shin-Yokohama','Shinagawa','Shinagawa','Tokyo']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['12:48','13:02','13:07','13:42','13:43','14:13','14:17','14:37','14:41','15:24','15:25','15:35','15:36','15:42']::text[],'Tokyo'),
  (9270,'ひかり710','710A','Inbound','https://timetables.jreast.co.jp/2611/train/125/128761.html','Shin-Osaka@13:46|Kyoto@14:06|Kyoto@14:07|Nagoya@14:41|Nagoya@14:42|Shin-Yokohama@16:23|Shin-Yokohama@16:24|Shinagawa@16:34|Shinagawa@16:35|Tokyo@16:43',ARRAY['Shin-Osaka','Kyoto','Kyoto','Nagoya','Nagoya','Hamamatsu','Hamamatsu','Shizuoka','Shizuoka','Mishima','Mishima','Shin-Yokohama','Shin-Yokohama','Shinagawa','Shinagawa','Tokyo']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['13:48','14:02','14:07','14:42','14:43','15:13','15:17','15:37','15:41','15:57','15:58','16:24','16:25','16:35','16:36','16:42']::text[],'Tokyo'),
  (9271,'ひかり712','712A','Inbound','https://timetables.jreast.co.jp/2611/train/125/128771.html','Shin-Osaka@14:46|Kyoto@15:06|Kyoto@15:07|Nagoya@15:41|Nagoya@15:42|Shin-Yokohama@17:23|Shin-Yokohama@17:24|Shinagawa@17:34|Shinagawa@17:35|Tokyo@17:43',ARRAY['Shin-Osaka','Kyoto','Kyoto','Nagoya','Nagoya','Hamamatsu','Hamamatsu','Shizuoka','Shizuoka','Shin-Yokohama','Shin-Yokohama','Shinagawa','Shinagawa','Tokyo']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['14:48','15:02','15:07','15:42','15:43','16:13','16:17','16:37','16:41','17:24','17:25','17:35','17:36','17:42']::text[],'Tokyo'),
  (9272,'ひかり714','714A','Inbound','https://timetables.jreast.co.jp/2611/train/125/128781.html','Shin-Osaka@15:46|Kyoto@16:06|Kyoto@16:07|Nagoya@16:41|Nagoya@16:42|Shin-Yokohama@18:23|Shin-Yokohama@18:24|Shinagawa@18:34|Shinagawa@18:35|Tokyo@18:43',ARRAY['Shin-Osaka','Kyoto','Kyoto','Nagoya','Nagoya','Hamamatsu','Hamamatsu','Shizuoka','Shizuoka','Mishima','Mishima','Shin-Yokohama','Shin-Yokohama','Shinagawa','Shinagawa','Tokyo']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['15:48','16:02','16:07','16:42','16:43','17:13','17:17','17:37','17:41','17:57','17:58','18:24','18:25','18:35','18:36','18:42']::text[],'Tokyo'),
  (9273,'ひかり716','716A','Inbound','https://timetables.jreast.co.jp/2611/train/125/128791.html','Shin-Osaka@16:46|Kyoto@17:06|Kyoto@17:07|Nagoya@17:41|Nagoya@17:42|Shin-Yokohama@19:23|Shin-Yokohama@19:24|Shinagawa@19:34|Shinagawa@19:35|Tokyo@19:43',ARRAY['Shin-Osaka','Kyoto','Kyoto','Nagoya','Nagoya','Hamamatsu','Hamamatsu','Shizuoka','Shizuoka','Atami','Atami','Shin-Yokohama','Shin-Yokohama','Shinagawa','Shinagawa','Tokyo']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['16:48','17:02','17:07','17:42','17:43','18:13','18:17','18:37','18:41','19:04','19:05','19:24','19:25','19:35','19:36','19:42']::text[],'Tokyo'),
  (9274,'ひかり718','718A','Inbound','https://timetables.jreast.co.jp/2611/train/125/128801.html','Shin-Osaka@17:46|Kyoto@18:06|Kyoto@18:07|Nagoya@18:41|Nagoya@18:42|Shin-Yokohama@20:23|Shin-Yokohama@20:24|Shinagawa@20:34|Shinagawa@20:35|Tokyo@20:43',ARRAY['Shin-Osaka','Kyoto','Kyoto','Nagoya','Nagoya','Hamamatsu','Hamamatsu','Shizuoka','Shizuoka','Mishima','Mishima','Shin-Yokohama','Shin-Yokohama','Shinagawa','Shinagawa','Tokyo']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['17:48','18:02','18:07','18:42','18:43','19:13','19:17','19:37','19:41','19:57','19:58','20:24','20:25','20:35','20:36','20:42']::text[],'Tokyo'),
  (9275,'ひかり720','720A','Inbound','https://timetables.jreast.co.jp/2611/train/125/128811.html','Shin-Osaka@18:46|Kyoto@19:06|Kyoto@19:07|Nagoya@19:41|Nagoya@19:42|Shin-Yokohama@21:15|Shin-Yokohama@21:16|Shinagawa@21:27|Shinagawa@21:28|Tokyo@21:36',ARRAY['Shin-Osaka','Kyoto','Kyoto','Nagoya','Nagoya','Hamamatsu','Hamamatsu','Shizuoka','Shizuoka','Shin-Yokohama','Shin-Yokohama','Shinagawa','Shinagawa','Tokyo']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['18:48','19:02','19:07','19:42','19:43','20:11','20:17','20:37','20:39','21:16','21:17','21:28','21:29','21:36']::text[],'Tokyo'),
  (9276,'ひかり722','722A','Inbound','https://timetables.jreast.co.jp/2611/train/125/128821.html','Shin-Osaka@19:46|Kyoto@20:02|Kyoto@20:03|Nagoya@20:37|Nagoya@20:38|Shin-Yokohama@22:07|Shin-Yokohama@22:08|Shinagawa@22:19|Shinagawa@22:20|Tokyo@22:28',ARRAY['Shin-Osaka','Kyoto','Kyoto','Nagoya','Nagoya','Toyohashi','Toyohashi','Shizuoka','Shizuoka','Shin-Yokohama','Shin-Yokohama','Shinagawa','Shinagawa','Tokyo']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['19:48','20:02','20:03','20:38','20:40','20:59','21:02','21:29','21:31','22:08','22:09','22:20','22:21','22:27']::text[],'Tokyo')
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
END $tokaido_ten_inbound_hikari_2611$;
COMMIT;