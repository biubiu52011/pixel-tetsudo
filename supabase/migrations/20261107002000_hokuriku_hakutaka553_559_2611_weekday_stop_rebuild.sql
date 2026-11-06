-- Two official JR East 2611 weekdays regular Hakutaka 553E/559E.
-- The original HokurikuShinkansen source-only schedule has obsolete
-- intermediate stops/times. The existing Joetsu-Myoko station-id
-- correction is in 20261107001000 migration and must run first.
-- Number variants on different days (553: 5553E on Nov23; 559:
-- 5559E on selected Sundays/holidays) are NOT generic weekday plans.
-- Evidence is official NUMBER for Weekday only. E7/W7 not distinguished,
-- so NO model/PNG claim. Keep source_revision/date validity distinct.
BEGIN;
SELECT pg_advisory_xact_lock(2611,5559);
DO $jr_hokuriku_hakutaka_553_559$
DECLARE
 r record; template_ bigint; timetable_ bigint; i int; n int;
 original_route text; reconstructed text;
 station_urn text; expected_route text;
BEGIN
 FOR r IN SELECT * FROM (VALUES
  (1955,'はくたか553','553E','https://timetables.jreast.co.jp/2611/train/035/038621.html','Tokyo@07:52|Ueno@07:58|Omiya@08:18|Takasaki@08:43|Annaka-Haruna@08:52|Karuizawa@09:03|Sakudaira@09:12|Ueda@09:22|Nagano@09:33|Nagano@09:35|Iiyama@09:47|Joetsu-Myoko@09:58|Itoigawa@10:12|Kurobe-Unazukionsen@10:26|Toyama@10:38|Toyama@10:39|Shin-Takaoka@10:48|Kanazawa@11:02',ARRAY['Tokyo','Ueno','Ueno','Omiya','Omiya','Takasaki','Takasaki','Karuizawa','Karuizawa','Sakudaira','Sakudaira','Ueda','Ueda','Nagano','Nagano','Iiyama','Iiyama','Joetsu-Myoko','Joetsu-Myoko','Itoigawa','Itoigawa','Kurobe-Unazukionsen','Kurobe-Unazukionsen','Toyama','Toyama','Shin-Takaoka','Shin-Takaoka','Kanazawa']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['07:52','07:57','07:58','08:16','08:17','08:42','08:43','08:58','08:59','09:08','09:09','09:18','09:18','09:30','09:32','09:43','09:43','09:54','09:57','10:10','10:11','10:24','10:25','10:37','10:38','10:47','10:47','11:01']::text[]),
  (1958,'はくたか559','559E','https://timetables.jreast.co.jp/2611/train/035/038651.html','Tokyo@10:32|Ueno@10:38|Omiya@10:58|Takasaki@11:23|Karuizawa@11:40|Sakudaira@11:48|Ueda@11:58|Nagano@12:09|Nagano@12:11|Iiyama@12:23|Joetsu-Myoko@12:35|Itoigawa@12:48|Kurobe-Unazukionsen@13:03|Toyama@13:16|Toyama@13:17|Shin-Takaoka@13:25|Kanazawa@13:39',ARRAY['Tokyo','Ueno','Ueno','Omiya','Omiya','Takasaki','Takasaki','Karuizawa','Karuizawa','Ueda','Ueda','Nagano','Nagano','Iiyama','Iiyama','Joetsu-Myoko','Joetsu-Myoko','Itoigawa','Itoigawa','Kurobe-Unazukionsen','Kurobe-Unazukionsen','Toyama','Toyama','Shin-Takaoka','Shin-Takaoka','Kanazawa']::text[],ARRAY['D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A','D','A']::text[],ARRAY['10:33','10:38','10:39','10:57','10:58','11:20','11:21','11:36','11:37','11:51','11:52','12:04','12:06','12:17','12:17','12:28','12:32','12:45','12:45','12:59','13:00','13:13','13:14','13:22','13:22','13:36']::text[])
 ) AS src(template_id,service_name,full_number,official_url,expected_old_route,
           official_stations,official_event_kinds,official_clocks)
 LOOP
  IF array_length(r.official_stations,1)<>array_length(r.official_event_kinds,1)
     OR array_length(r.official_clocks,1)<>array_length(r.official_stations,1)
     OR r.official_event_kinds[1]<>'D'
     OR r.official_event_kinds[array_length(r.official_event_kinds,1)]<>'A'
   THEN RAISE EXCEPTION 'Malformed published full stop list %',r.service_name; END IF;
  SELECT m.id,mem.timetable_id INTO STRICT template_,timetable_
  FROM manual_timetable_templates m
  JOIN train_timetable_members mem ON mem.source_template_id=m.id
   AND mem.member_role='primary' AND mem.first_stop_sequence=0
   AND mem.stop_offset=0 AND mem.merge_first_stop=false
  JOIN train_timetables t ON t.id=mem.timetable_id
   AND t.group_evidence='source_only' AND t.canonical_key='source:'||m.id::text
   AND t.primary_train_number=m.train_number
  WHERE m.id=r.template_id AND m.line_key='HokurikuShinkansen'
    AND m.calendar_urn='odpt.Calendar:Weekday'
    AND m.direction_urn='odpt.RailDirection:Outbound'
    AND m.railway_urn='odpt.Railway:JR-East.HokurikuShinkansen'
    AND m.train_number=r.service_name
    AND m.destination_urns=ARRAY['odpt.Station:JR-East.HokurikuShinkansen.Kanazawa']::text[]
    AND m.source_path='data/timetables/HokurikuShinkansen-manual.js'
    AND mem.last_stop_sequence=(SELECT max(s.stop_sequence) FROM manual_timetable_template_stops s WHERE s.template_id=m.id)
    AND (SELECT count(*) FROM train_timetable_members x WHERE x.timetable_id=t.id)=1;
  IF EXISTS (SELECT 1 FROM published_train_number_evidence e
      WHERE e.edition='2611' AND e.source_template_id=template_)
    OR EXISTS (SELECT 1 FROM train_timetable_vehicle_mappings v WHERE v.timetable_id=timetable_)
   THEN RAISE EXCEPTION 'Existing official mapping requires reconciliation: %',r.service_name; END IF;
  original_route:=(SELECT string_agg(regexp_replace(coalesce(s.departure_station_urn,s.arrival_station_urn),
     '^.*[.]','')||'@'||coalesce(s.departure_clock,s.arrival_clock),'|' ORDER BY s.stop_sequence)
     FROM manual_timetable_template_stops s WHERE s.template_id=template_);
  IF original_route<>r.expected_old_route
    OR (SELECT count(*) FROM train_timetable_stops z
      WHERE z.source_template_id=template_ AND z.timetable_id=timetable_)<>array_length(string_to_array(original_route,'|'),1)
   THEN RAISE EXCEPTION 'Original Hakutaka source/view differs from expected %',r.service_name; END IF;
  DELETE FROM manual_timetable_template_stops s WHERE s.template_id=template_;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>array_length(string_to_array(original_route,'|'),1)
   THEN RAISE EXCEPTION 'Hakutaka original stop deletion mismatch %',r.service_name; END IF;
  FOR i IN 1..array_length(r.official_stations,1) LOOP
    station_urn:='odpt.Station:JR-East.HokurikuShinkansen.'||r.official_stations[i];
    IF NOT EXISTS (SELECT 1 FROM stations WHERE id=r.official_stations[i])
     THEN RAISE EXCEPTION 'Missing station in existing catalog % at %',r.official_stations[i],r.service_name; END IF;
    IF r.official_event_kinds[i]='D' THEN
      INSERT INTO manual_timetable_template_stops
       (template_id,stop_sequence,departure_station_urn,departure_clock)
      VALUES(template_,i-1,station_urn,r.official_clocks[i]);
    ELSIF r.official_event_kinds[i]='A' THEN
      INSERT INTO manual_timetable_template_stops
       (template_id,stop_sequence,arrival_station_urn,arrival_clock)
      VALUES(template_,i-1,station_urn,r.official_clocks[i]);
    ELSE
      RAISE EXCEPTION 'Unexpected official event kind %',r.official_event_kinds[i];
    END IF;
  END LOOP;
  UPDATE train_timetable_members mem SET last_stop_sequence=array_length(r.official_stations,1)-1
    WHERE mem.source_template_id=template_ AND mem.timetable_id=timetable_
      AND mem.first_stop_sequence=0
      AND mem.last_stop_sequence=array_length(string_to_array(original_route,'|'),1)-1;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'Hakutaka member range mismatch %',r.service_name; END IF;
  reconstructed:=(SELECT string_agg(regexp_replace(z.station_urn,'^.*[.]','')||
    '@'||coalesce(z.departure_clock,z.arrival_clock),'|' ORDER BY z.stop_sequence)
    FROM train_timetable_stops z WHERE z.source_template_id=template_ AND z.timetable_id=timetable_);
  expected_route:=(SELECT string_agg(r.official_stations[j]||'@'||r.official_clocks[j],'|' ORDER BY j)
   FROM generate_subscripts(r.official_stations,1) j);
  IF reconstructed<>expected_route OR
   (SELECT count(*) FROM train_timetable_stops z WHERE z.source_template_id=template_ AND z.timetable_id=timetable_)<>array_length(r.official_stations,1)
   THEN RAISE EXCEPTION 'Hakutaka new timetable VIEW differs %',r.service_name; END IF;
  INSERT INTO published_train_number_evidence
   (edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,
      official_source_url,verification_scope)
   VALUES('2611','HokurikuShinkansen','odpt.Calendar:Weekday','odpt.RailDirection:Outbound',
      r.full_number,template_,r.official_url,'train_number_only');
  IF (SELECT count(*) FROM published_train_number_evidence e WHERE e.edition='2611'
       AND e.source_template_id=template_ AND e.train_number=r.full_number
       AND e.official_source_url=r.official_url
       AND e.line_key='HokurikuShinkansen'
       AND e.calendar_urn='odpt.Calendar:Weekday'
       AND e.direction_urn='odpt.RailDirection:Outbound')<>1
   THEN RAISE EXCEPTION 'Hakutaka number evidence mismatch %',r.service_name; END IF;
 END LOOP;
END $jr_hokuriku_hakutaka_553_559$;
COMMIT;