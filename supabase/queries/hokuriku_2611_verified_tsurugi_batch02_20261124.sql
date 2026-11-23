-- Hokuriku 2611 sample reconciliation; existing source and canonical tables only.
BEGIN;
SELECT pg_advisory_xact_lock(2611,240502);
DO $batch$
DECLARE r record; cal text; sid bigint; tid bigint; dates date[];
  prefix constant text:='odpt.Station:JR-East.HokurikuShinkansen.';
  line constant text:='HokurikuShinkansen';
BEGIN
  FOR r IN SELECT * FROM (VALUES
('つるぎ4','4E','Inbound','Toyama','https://timetable.jr-odekake.net/train-timetable/249201?date=20261107',ARRAY[]::int[],'[["Tsuruga",null,"08:31"],["Echizen-Takefu","08:42","08:43"],["Fukui-Echizen","08:51","08:52"],["Awara-Onsen","09:00","09:01"],["Kaga-Onsen","09:08","09:09"],["Komatsu","09:16","09:17"],["Kanazawa","09:28","09:30"],["Shin-Takaoka","09:43","09:44"],["Toyama","09:52",null]]'::jsonb),
('つるぎ14','1014E','Inbound','Kanazawa','https://timetable.jr-odekake.net/train-timetable/249491?date=20261130',ARRAY[21,28]::int[],'[["Tsuruga",null,"11:17"],["Fukui-Echizen","11:34","11:35"],["Kanazawa","12:02",null]]'::jsonb),
('つるぎ17','17E','Outbound','Tsuruga','https://timetable.jr-odekake.net/train-timetable/249091?date=20261121',ARRAY[]::int[],'[["Toyama",null,"09:40"],["Shin-Takaoka","09:49","09:49"],["Kanazawa","10:03","10:05"],["Komatsu","10:15","10:16"],["Kaga-Onsen","10:23","10:24"],["Awara-Onsen","10:31","10:32"],["Fukui-Echizen","10:40","10:41"],["Echizen-Takefu","10:49","10:49"],["Tsuruga","11:01",null]]'::jsonb),
('つるぎ19','19E','Outbound','Tsuruga','https://timetable.jr-odekake.net/train-timetable/249151?date=20261103',ARRAY[23]::int[],'[["Kanazawa",null,"11:05"],["Komatsu","11:16","11:16"],["Kaga-Onsen","11:23","11:24"],["Awara-Onsen","11:32","11:32"],["Fukui-Echizen","11:40","11:41"],["Echizen-Takefu","11:49","11:50"],["Tsuruga","12:02",null]]'::jsonb),
('つるぎ26','26E','Inbound','Toyama','https://timetable.jr-odekake.net/train-timetable/249371?date=20261124',ARRAY[]::int[],'[["Tsuruga",null,"14:41"],["Echizen-Takefu","14:53","14:54"],["Fukui-Echizen","15:02","15:03"],["Awara-Onsen","15:11","15:11"],["Kaga-Onsen","15:19","15:20"],["Komatsu","15:27","15:28"],["Kanazawa","15:39","15:41"],["Shin-Takaoka","15:55","15:55"],["Toyama","16:04",null]]'::jsonb),
('つるぎ43','1043E','Outbound','Tsuruga','https://timetable.jr-odekake.net/train-timetable/249171?date=20261123',ARRAY[]::int[],'[["Toyama",null,"18:25"],["Shin-Takaoka","18:33","18:34"],["Kanazawa","18:48","18:50"],["Fukui-Echizen","19:14","19:15"],["Tsuruga","19:32",null]]'::jsonb),
('つるぎ44','1044E','Inbound','Kanazawa','https://timetable.jr-odekake.net/train-timetable/249541?date=20261122',ARRAY[]::int[],'[["Tsuruga",null,"20:22"],["Fukui-Echizen","20:39","20:40"],["Kanazawa","21:06",null]]'::jsonb),
('つるぎ45','45E','Outbound','Tsuruga','https://timetable.jr-odekake.net/train-timetable/249181?date=20261121',ARRAY[]::int[],'[["Toyama",null,"18:41"],["Shin-Takaoka","18:50","18:50"],["Kanazawa","19:04","19:06"],["Komatsu","19:16","19:17"],["Kaga-Onsen","19:24","19:25"],["Awara-Onsen","19:32","19:33"],["Fukui-Echizen","19:41","19:42"],["Echizen-Takefu","19:50","19:51"],["Tsuruga","20:02",null]]'::jsonb)
  ) v(service,number,direction,destination,url,excluded_days,events)
  LOOP
    IF jsonb_array_length(r.events)<2 OR r.events->0->>1 IS NOT NULL
       OR r.events->-1->>2 IS NOT NULL OR r.events->-1->>0<>r.destination
       OR EXISTS(SELECT 1 FROM jsonb_array_elements(r.events) e WHERE NOT EXISTS(SELECT 1 FROM line_stations WHERE line_id=line AND station_name=e->>0))
    THEN RAISE EXCEPTION 'Invalid station/endpoints %',r.service; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(r.events) WITH ORDINALITY a(e,o)
      JOIN jsonb_array_elements(r.events) WITH ORDINALITY b(f,k) ON k=o+1
      JOIN line_stations l ON l.line_id=line AND l.station_name=e->>0
      JOIN line_stations m ON m.line_id=line AND m.station_name=f->>0
      WHERE (r.direction='Outbound' AND l.station_index>=m.station_index)
         OR (r.direction='Inbound' AND l.station_index<=m.station_index)
         OR coalesce(e->>2,e->>1)>coalesce(f->>1,f->>2))
    THEN RAISE EXCEPTION 'Station or time order %',r.service; END IF;
    FOR cal IN SELECT unnest(ARRAY['Weekday','SaturdayHoliday']) LOOP
      SELECT array_agg(d::date ORDER BY d) INTO dates FROM generate_series('2026-11-01'::date,'2026-11-30'::date,'1 day') d
      WHERE (extract(isodow FROM d) IN (6,7) OR d::date IN ('2026-11-03','2026-11-23'))=(cal='SaturdayHoliday')
      AND NOT (extract(day FROM d)::int=ANY(r.excluded_days));
      IF EXISTS(SELECT 1 FROM manual_timetable_templates WHERE line_key=line AND train_number=r.service AND calendar_urn='odpt.Calendar:'||cal) THEN RAISE EXCEPTION 'Duplicate % %',r.service,cal; END IF;
      INSERT INTO manual_timetable_templates(line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,destination_urns,source_path,source_trip_id,operating_dates)
      VALUES(line,'odpt.Calendar:'||cal,r.service,'odpt.Railway:JR-East.HokurikuShinkansen','odpt.RailDirection:'||r.direction,'odpt.TrainType:JR-East.Shinkansen',ARRAY[prefix||r.destination],'official-sampled:jrwest:2611:'||r.url,'2611:hokuriku:'||r.number||':'||cal,dates) RETURNING id INTO sid;
      INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
      SELECT sid,ord-1,CASE WHEN e->>1 IS NOT NULL THEN prefix||(e->>0) END,CASE WHEN e->>2 IS NOT NULL THEN prefix||(e->>0) END,e->>1,e->>2 FROM jsonb_array_elements(r.events) WITH ORDINALITY a(e,ord);
      INSERT INTO train_timetables(canonical_key,calendar_urn,primary_train_number,lead_source_template_id,group_evidence,timetable_validity)
      VALUES('source:'||sid,'odpt.Calendar:'||cal,r.service,sid,'source_only','date_verified') RETURNING id INTO tid;
      INSERT INTO train_timetable_members(source_template_id,timetable_id,segment_order,member_role,first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop)
      VALUES(sid,tid,0,'primary',0,jsonb_array_length(r.events)-1,0,false);
      INSERT INTO published_train_number_evidence(edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,official_source_url,verification_scope)
      VALUES('2611',line,'odpt.Calendar:'||cal,'odpt.RailDirection:'||r.direction,r.number,sid,r.url,'train_number_only');
      IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>jsonb_array_length(r.events) THEN RAISE EXCEPTION 'View mismatch %',r.service; END IF;
    END LOOP;
    IF EXISTS(SELECT 1 FROM generate_series('2026-11-01'::date,'2026-11-30'::date,'1 day') d WHERE
      (SELECT count(*) FROM manual_timetable_templates WHERE line_key=line AND train_number=r.service AND d::date=ANY(operating_dates))
      <>CASE WHEN extract(day FROM d)::int=ANY(r.excluded_days) THEN 0 ELSE 1 END)
    THEN RAISE EXCEPTION 'Date gap/overlap %',r.service; END IF;
  END LOOP;
  UPDATE published_timetable_coverage_audit a SET template_count=x.n,calendar_count=x.cal,direction_count=x.dir,sampled_count=x.sampled,checked_at=now()
  FROM (SELECT count(*)::int n,count(DISTINCT calendar_urn)::int cal,count(DISTINCT direction_urn)::int dir,count(*) FILTER(WHERE source_path LIKE 'official-sampled:%')::int sampled FROM manual_timetable_templates WHERE line_key=line) x WHERE a.line_key=line;
END $batch$;
COMMIT;