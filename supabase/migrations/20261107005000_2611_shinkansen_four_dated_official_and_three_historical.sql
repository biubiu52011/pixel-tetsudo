-- Repair the seven 2611 unresolved historical shinkansen templates
-- using their EXISTING owner tables and verified date whitelist.
-- Four sources get exact official stop events and November operating days;
-- three obsolete September/other-series sources get empty whitelist.
-- Dated train numbers are official for their Nov 2026 service dates ONLY;
-- do NOT claim a carset, a dynamic E7/W7 subtype or a new PNG.
-- Requires 20261107004000 operating_dates column.
BEGIN;
SELECT pg_advisory_xact_lock(2611,7177);
DO $shinkansen_2611_date_scoped_source_repair$
DECLARE r record; old_ record; i int; n int; tt_ bigint; oldroute text; newroute text; expected text; st text; oldlen int;
BEGIN
 FOR r IN SELECT * FROM (VALUES
  (725,'YamagataShinkansen','つばさ177','8177M','Outbound','Shinjo','https://timetables.jreast.co.jp/2611/train/020/022661.html','Tokyo@09:48#A|Ueno@09:54#A|Omiya@10:13#A|Fukushima@11:22#A|Yonezawa@11:53#A|Yonezawa@11:54#A|Takahata@12:01#A|Akayu@12:06#A|Kaminoyama-Onsen@12:20#A|Yamagata@12:30#A|Yamagata@12:32#A|Tendo@12:42#A|Sakuranbo-Higashine@12:48#A|Murayama@12:53#A|Oishida@13:02#A|Shinjo@13:16#A',ARRAY['2026-11-06','2026-11-07','2026-11-13','2026-11-14','2026-11-20','2026-11-21','2026-11-22','2026-11-27','2026-11-28']::date[],ARRAY['Tokyo','Ueno','Ueno','Omiya','Omiya','Fukushima','Yonezawa','Yonezawa','Takahata','Takahata','Akayu','Akayu','Kaminoyama-Onsen','Kaminoyama-Onsen','Yamagata','Yamagata','Tendo','Tendo','Sakuranbo-Higashine','Sakuranbo-Higashine','Murayama','Murayama','Oishida','Oishida','Shinjo']::text[],ARRAY['D','A','D','A','D','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['09:48','09:53','09:54','10:12','10:13','11:22','11:53','11:54','12:01','12:01','12:06','12:06','12:20','12:20','12:30','12:32','12:42','12:42','12:48','12:48','12:52','12:53','13:01','13:02','13:16']::text[]),
  (728,'YamagataShinkansen','つばさ88','9088M','Inbound','Tokyo','https://timetables.jreast.co.jp/2611/train/025/025641.html','Shinjo@13:57#A|Oishida@14:11#A|Murayama@14:23#A|Sakuranbo-Higashine@14:28#A|Tendo@14:35#A|Yamagata@14:50#A|Yamagata@14:52#A|Kaminoyama-Onsen@15:01#A|Akayu@15:15#A|Takahata@15:20#A|Yonezawa@15:27#A|Yonezawa@15:28#A|Fukushima@16:02#A',ARRAY['2026-11-03','2026-11-15','2026-11-23','2026-11-29']::date[],ARRAY['Shinjo','Oishida','Oishida','Murayama','Murayama','Sakuranbo-Higashine','Sakuranbo-Higashine','Tendo','Tendo','Yamagata','Yamagata','Kaminoyama-Onsen','Kaminoyama-Onsen','Akayu','Akayu','Takahata','Takahata','Yonezawa','Yonezawa','Fukushima','Fukushima','Utsunomiya','Utsunomiya','Omiya','Omiya','Ueno','Ueno','Tokyo']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['13:57','14:11','14:11','14:23','14:23','14:27','14:28','14:33','14:35','14:50','14:52','15:01','15:01','15:14','15:15','15:19','15:20','15:27','15:28','16:02','16:04','16:44','16:47','17:11','17:12','17:30','17:31','17:36']::text[]),
  (729,'YamagataShinkansen','つばさ90','9090M','Inbound','Tokyo','https://timetables.jreast.co.jp/2611/train/045/048321.html','Shinjo@15:51#A|Oishida@16:07#A|Murayama@16:17#A|Sakuranbo-Higashine@16:22#A|Tendo@16:28#A|Yamagata@16:42#A|Yamagata@16:44#A|Kaminoyama-Onsen@16:55#A|Akayu@17:12#A|Takahata@17:17#A|Yonezawa@17:25#A|Yonezawa@17:25#A|Fukushima@18:02#A',ARRAY['2026-11-01','2026-11-02','2026-11-08','2026-11-15','2026-11-22','2026-11-23','2026-11-29']::date[],ARRAY['Shinjo','Oishida','Oishida','Murayama','Murayama','Sakuranbo-Higashine','Sakuranbo-Higashine','Tendo','Tendo','Yamagata','Yamagata','Kaminoyama-Onsen','Kaminoyama-Onsen','Akayu','Akayu','Takahata','Takahata','Yonezawa','Yonezawa','Fukushima','Fukushima','Utsunomiya','Utsunomiya','Omiya','Omiya','Ueno','Ueno','Tokyo']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['15:51','16:07','16:07','16:16','16:17','16:21','16:22','16:27','16:28','16:42','16:44','16:54','16:55','17:10','17:12','17:16','17:17','17:25','17:25','18:02','18:05','18:44','18:48','19:15','19:16','19:34','19:35','19:40']::text[]),
  (1968,'HokurikuShinkansen','はくたか595','9595E','Outbound','Kanazawa','https://timetables.jreast.co.jp/2611/train/185/188191.html','Tokyo@13:04#D|Ueno@13:10#D|Omiya@13:30#D|Kumagaya@13:43#D|Honjo-Waseda@13:52#D|Takasaki@14:02#D|Karuizawa@14:18#D|Sakudaira@14:27#D|Ueda@14:37#D|Nagano@14:48#A|Nagano@14:54#D|Iiyama@15:05#D|Joetsu-Myoko@15:17#D|Itoigawa@15:30#D|Kurobe-Unazukionsen@15:45#D|Toyama@15:57#A|Toyama@15:58#D|Shin-Takaoka@16:07#D|Kanazawa@16:20#A',ARRAY['2026-11-07','2026-11-14']::date[],ARRAY['Tokyo','Ueno','Ueno','Omiya','Omiya','Takasaki','Takasaki','Karuizawa','Karuizawa','Nagano','Nagano','Iiyama','Iiyama','Joetsu-Myoko','Joetsu-Myoko','Toyama','Toyama','Shin-Takaoka','Shin-Takaoka','Kanazawa']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['10:30','10:35','10:36','10:53','10:54','11:15','11:16','11:31','11:32','11:55','11:57','12:08','12:09','12:20','12:20','12:52','12:53','13:01','13:01','13:15']::text[])
 ) AS v(src_id,line_key,service_name,formal_number,rail_direction,destination,official_url,prior_events,nov_dates,official_stop_names,official_event_kinds,official_clocks)
 LOOP
   IF array_length(r.official_stop_names,1)<>array_length(r.official_event_kinds,1)
     OR array_length(r.official_stop_names,1)<>array_length(r.official_clocks,1)
     OR array_length(r.nov_dates,1) < 1
     OR r.official_event_kinds[1]<>'D'
     OR r.official_event_kinds[array_length(r.official_stop_names,1)]<>'A'
     OR r.official_stop_names[array_length(r.official_stop_names,1)]<>r.destination
     OR EXISTS(SELECT 1 FROM unnest(r.nov_dates) d WHERE d < '2026-11-01'::date OR d > '2026-11-30'::date)
   THEN RAISE EXCEPTION 'Official 2611 events/date invalid at %',r.service_name; END IF;
   SELECT m.*, mem.timetable_id,mem.last_stop_sequence,mem.first_stop_sequence,mem.stop_offset,mem.merge_first_stop,tt.group_evidence,tt.canonical_key,tt.primary_train_number
   INTO STRICT old_
   FROM manual_timetable_templates m
   JOIN train_timetable_members mem ON mem.source_template_id=m.id AND mem.member_role='primary'
   JOIN train_timetables tt ON tt.id=mem.timetable_id
   WHERE m.id=r.src_id AND m.line_key=r.line_key
    AND m.train_number=r.service_name AND m.calendar_urn='odpt.Calendar:Weekday'
    AND m.direction_urn='odpt.RailDirection:'||r.rail_direction
    AND m.railway_urn='odpt.Railway:JR-East.'||r.line_key
    AND m.source_path='data/timetables/'||r.line_key||'-manual.js'
    AND m.destination_urns=ARRAY['odpt.Station:JR-East.'||r.line_key||'.'||r.destination]::text[]
    AND m.operating_dates IS NULL
    AND tt.canonical_key='source:'||m.id::text
    AND tt.group_evidence='source_only' AND tt.primary_train_number=m.train_number
    AND mem.first_stop_sequence=0 AND mem.stop_offset=0 AND mem.merge_first_stop=false
    AND (SELECT count(*) FROM train_timetable_members x WHERE x.timetable_id=tt.id)=1;
   tt_:=old_.timetable_id;
   oldroute:=(SELECT string_agg(regexp_replace(coalesce(s.arrival_station_urn,s.departure_station_urn),'^.*[.]','')
      ||'@'||coalesce(s.arrival_clock,s.departure_clock)||'#'||
      (CASE WHEN s.departure_station_urn IS NOT NULL THEN 'D' ELSE 'A' END),'|' ORDER BY s.stop_sequence)
      FROM manual_timetable_template_stops s WHERE s.template_id=r.src_id);
   oldlen:=array_length(string_to_array(oldroute,'|'),1);
   IF oldroute<>r.prior_events OR oldlen<>old_.last_stop_sequence+1
     OR (SELECT count(*) FROM train_timetable_stops z WHERE z.source_template_id=r.src_id AND z.timetable_id=tt_)<>oldlen
     OR EXISTS (SELECT 1 FROM published_train_number_evidence p WHERE p.edition='2611' AND p.source_template_id=r.src_id)
   THEN RAISE EXCEPTION 'Existing source differs from audited prior route %',r.service_name; END IF;
   DELETE FROM manual_timetable_template_stops s WHERE s.template_id=r.src_id;
   GET DIAGNOSTICS n=ROW_COUNT;
   IF n<>oldlen THEN RAISE EXCEPTION 'Unexpected old source row count %',r.service_name; END IF;
   FOR i IN 1..array_length(r.official_stop_names,1) LOOP
      st:='odpt.Station:JR-East.'||r.line_key||'.'||r.official_stop_names[i];
      IF NOT EXISTS(SELECT 1 FROM stations catalog WHERE catalog.id=r.official_stop_names[i])
        OR (i>1 AND r.official_clocks[i]<r.official_clocks[i-1])
      THEN RAISE EXCEPTION 'Unrecognized station/clock % at %',r.official_stop_names[i],r.service_name; END IF;
      IF r.official_event_kinds[i]='D' THEN
        INSERT INTO manual_timetable_template_stops (template_id,stop_sequence,departure_station_urn,departure_clock)
        VALUES(r.src_id,i-1,st,r.official_clocks[i]);
      ELSIF r.official_event_kinds[i]='A' THEN
        INSERT INTO manual_timetable_template_stops (template_id,stop_sequence,arrival_station_urn,arrival_clock)
        VALUES(r.src_id,i-1,st,r.official_clocks[i]);
      ELSE RAISE EXCEPTION 'Bad official event kind at %',r.service_name; END IF;
   END LOOP;
   UPDATE train_timetable_members mem
      SET last_stop_sequence=array_length(r.official_stop_names,1)-1
    WHERE mem.timetable_id=tt_ AND mem.source_template_id=r.src_id
      AND mem.first_stop_sequence=0 AND mem.last_stop_sequence=oldlen-1;
   GET DIAGNOSTICS n=ROW_COUNT;
   IF n<>1 THEN RAISE EXCEPTION 'Member stop range update unexpected %',r.service_name; END IF;
   UPDATE manual_timetable_templates m SET operating_dates=r.nov_dates
    WHERE m.id=r.src_id AND m.operating_dates IS NULL
      AND m.calendar_urn='odpt.Calendar:Weekday';
   GET DIAGNOSTICS n=ROW_COUNT;
   IF n<>1 THEN RAISE EXCEPTION 'Operating date whitelist update unexpected %',r.service_name; END IF;
   UPDATE train_timetables tt SET timetable_validity='date_verified'
    WHERE tt.id=tt_ AND tt.timetable_validity='undated_not_current_verified'
      AND tt.primary_train_number=r.service_name AND tt.group_evidence='source_only';
   GET DIAGNOSTICS n=ROW_COUNT;
   IF n<>1 THEN RAISE EXCEPTION 'Date verification status mismatch %',r.service_name; END IF;
   newroute:=(SELECT string_agg(regexp_replace(z.station_urn,'^.*[.]','')||'@'||
      coalesce(z.arrival_clock,z.departure_clock)||'#'||
      (CASE WHEN z.departure_station_urn IS NOT NULL THEN 'D' ELSE 'A' END),'|' ORDER BY z.stop_sequence)
    FROM train_timetable_stops z WHERE z.source_template_id=r.src_id AND z.timetable_id=tt_);
   expected:=(SELECT string_agg(r.official_stop_names[j]||'@'||r.official_clocks[j]||'#'||
       r.official_event_kinds[j],'|' ORDER BY j)
     FROM generate_subscripts(r.official_stop_names,1) j);
   IF newroute<>expected
     OR (SELECT count(*) FROM train_timetable_stops z WHERE z.source_template_id=r.src_id AND z.timetable_id=tt_)<>array_length(r.official_stop_names,1)
   THEN RAISE EXCEPTION 'Derived VIEW differs from official stop plan %',r.service_name; END IF;
   INSERT INTO published_train_number_evidence
     (edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,official_source_url,verification_scope)
   VALUES ('2611',r.line_key,'odpt.Calendar:Weekday','odpt.RailDirection:'||r.rail_direction,
     r.formal_number,r.src_id,r.official_url,'train_number_only');
   IF (SELECT count(*) FROM published_train_number_evidence e WHERE e.edition='2611'
     AND e.source_template_id=r.src_id AND e.train_number=r.formal_number
     AND e.official_source_url=r.official_url)<>1
   THEN RAISE EXCEPTION 'Missing exact official train number %',r.service_name; END IF;
 END LOOP;

 FOR r IN SELECT * FROM (VALUES
 (1982,'HokurikuShinkansen','はくたか592','Inbound','Tokyo','Kanazawa@10:56#D|Shin-Takaoka@11:10#D|Toyama@11:18#A|Toyama@11:19#D|Kurobe-Unazukionsen@11:32#D|Itoigawa@11:46#D|Joetsu-Myoko@11:59#D|Iiyama@12:11#D|Nagano@12:22#A|Nagano@12:27#D|Ueda@12:39#D|Sakudaira@12:49#D|Karuizawa@12:59#D|Takasaki@13:15#D|Honjo-Waseda@13:23#D|Kumagaya@13:33#D|Omiya@13:46#A|Ueno@14:06#A|Tokyo@14:12#A'),
 (1983,'HokurikuShinkansen','はくたか594','Inbound','Tokyo','Kanazawa@13:56#D|Shin-Takaoka@14:10#D|Toyama@14:18#A|Toyama@14:19#D|Kurobe-Unazukionsen@14:32#D|Itoigawa@14:46#D|Joetsu-Myoko@14:59#D|Nagano@15:18#A|Nagano@15:23#D|Ueda@15:36#D|Sakudaira@15:46#D|Karuizawa@15:55#D|Annaka-Haruna@16:05#D|Takasaki@16:15#D|Honjo-Waseda@16:23#D|Kumagaya@16:33#D|Omiya@16:46#A|Ueno@17:06#A|Tokyo@17:12#A'),
 (9369,'SanyoShinkansen','ひかり782','Inbound','Shin-Osaka','Okayama@19:36#D|Himeji@20:07#A|Himeji@20:08#D|Shin-Kobe@20:40#A|Shin-Kobe@20:41#D|Shin-Osaka@20:53#A')
 ) AS v(src_id,line_key,service_name,rail_direction,destination,prior_events)
 LOOP
   SELECT m.*,mem.timetable_id,mem.last_stop_sequence,tt.group_evidence,tt.canonical_key,tt.primary_train_number
   INTO STRICT old_
   FROM manual_timetable_templates m
   JOIN train_timetable_members mem ON mem.source_template_id=m.id AND mem.member_role='primary'
   JOIN train_timetables tt ON tt.id=mem.timetable_id
   WHERE m.id=r.src_id AND m.line_key=r.line_key
     AND m.train_number=r.service_name AND m.operating_dates IS NULL
     AND m.calendar_urn='odpt.Calendar:Weekday'
     AND m.direction_urn='odpt.RailDirection:'||r.rail_direction
     AND m.railway_urn='odpt.Railway:'||
       (CASE WHEN r.line_key='SanyoShinkansen' THEN 'JR-West' ELSE 'JR-East' END)||'.'||r.line_key
     AND m.source_path='data/timetables/'||r.line_key||'-manual.js'
     AND m.destination_urns=ARRAY['odpt.Station:'||
       (CASE WHEN r.line_key='SanyoShinkansen' THEN 'JR-West' ELSE 'JR-East' END)||'.'||r.line_key||'.'||r.destination]::text[]
     AND tt.canonical_key='source:'||m.id::text AND tt.group_evidence='source_only'
     AND tt.primary_train_number=m.train_number
     AND (SELECT count(*) FROM train_timetable_members x WHERE x.timetable_id=tt.id)=1;
   oldroute:=(SELECT string_agg(regexp_replace(coalesce(s.arrival_station_urn,s.departure_station_urn),
      '^.*[.]','')||'@'||coalesce(s.arrival_clock,s.departure_clock)||'#'||
      (CASE WHEN s.departure_station_urn IS NOT NULL THEN 'D' ELSE 'A' END),'|' ORDER BY s.stop_sequence)
       FROM manual_timetable_template_stops s WHERE s.template_id=r.src_id);
   IF oldroute<>r.prior_events
      OR old_.last_stop_sequence<>array_length(string_to_array(oldroute,'|'),1)-1
      OR EXISTS (SELECT 1 FROM published_train_number_evidence e WHERE e.edition='2611' AND e.source_template_id=r.src_id)
   THEN RAISE EXCEPTION 'Retired source mismatch %',r.service_name; END IF;
   UPDATE manual_timetable_templates m
     SET operating_dates=ARRAY[]::date[]
   WHERE m.id=r.src_id AND m.operating_dates IS NULL
     AND m.train_number=r.service_name;
   GET DIAGNOSTICS n=ROW_COUNT;
   IF n<>1 THEN RAISE EXCEPTION 'Old November source quarantine mismatch %',r.service_name; END IF;
 END LOOP;
END $shinkansen_2611_date_scoped_source_repair$;
COMMIT;