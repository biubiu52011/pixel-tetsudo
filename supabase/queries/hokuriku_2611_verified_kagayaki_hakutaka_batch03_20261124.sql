-- Individual schedule corrections, scoped to November 2026.
-- Source check for 503 also: JR West Kanazawa 20261101 and Fukui 20261124.
-- Preserve existing canonical IDs; no vehicle model or actual trainset claim.
BEGIN;
SELECT pg_advisory_xact_lock(2611,240503);
DO $batch$
DECLARE r record; cal text; sid bigint; tid bigint; dates date[]; old_count int;
  prefix constant text:='odpt.Station:JR-East.HokurikuShinkansen.';
  line constant text:='HokurikuShinkansen';
BEGIN
  FOR r IN SELECT * FROM (VALUES
(1937::bigint,'かがやき503','3503E','35503E'::text,'Outbound','Tsuruga','https://timetable.jr-odekake.net/train-timetable/248601?date=20261003','[["Tokyo",null,"07:20"],["Omiya","07:42","07:43"],["Nagano","08:37","08:39"],["Toyama","09:24","09:25"],["Kanazawa","09:44","09:46"],["Fukui-Echizen","10:09","10:10"],["Tsuruga","10:26",null]]'::jsonb),
(1938::bigint,'かがやき505','3505E','35505E'::text,'Outbound','Tsuruga','https://timetable.jr-odekake.net/train-timetable/248681?date=20261114','[["Tokyo",null,"08:11"],["Ueno","08:16","08:17"],["Omiya","08:35","08:36"],["Nagano","09:38","09:40"],["Toyama","10:25","10:26"],["Kanazawa","10:45","10:47"],["Fukui-Echizen","11:09","11:10"],["Tsuruga","11:26",null]]'::jsonb),
(1946::bigint,'かがやき504','3504E','35504E'::text,'Inbound','Tokyo','https://timetable.jr-odekake.net/train-timetable/248761?date=20261031','[["Tsuruga",null,"07:27"],["Fukui-Echizen","07:44","07:45"],["Kanazawa","08:08","08:10"],["Toyama","08:28","08:29"],["Nagano","09:15","09:17"],["Omiya","10:12","10:13"],["Ueno","10:31","10:32"],["Tokyo","10:37",null]]'::jsonb),
(NULL::bigint,'はくたか560','560E',NULL::text,'Inbound','Tokyo','https://timetable.jr-odekake.net/train-timetable/248891?date=20261112','[["Tsuruga",null,"09:58"],["Echizen-Takefu","10:10","10:10"],["Fukui-Echizen","10:19","10:20"],["Awara-Onsen","10:28","10:28"],["Kaga-Onsen","10:36","10:37"],["Komatsu","10:44","10:44"],["Kanazawa","10:56","10:58"],["Shin-Takaoka","11:11","11:12"],["Toyama","11:20","11:21"],["Kurobe-Unazukionsen","11:33","11:34"],["Itoigawa","11:47","11:48"],["Joetsu-Myoko","12:00","12:01"],["Iiyama","12:13","12:13"],["Nagano","12:24","12:26"],["Takasaki","13:03","13:04"],["Omiya","13:27","13:28"],["Ueno","13:46","13:47"],["Tokyo","13:52",null]]'::jsonb)
  ) v(old_id,service,number,old_number,direction,destination,url,events)
  LOOP
    IF jsonb_array_length(r.events)<2 OR r.events->0->>1 IS NOT NULL OR r.events->-1->>2 IS NOT NULL OR r.events->-1->>0<>r.destination OR EXISTS(SELECT 1 FROM jsonb_array_elements(r.events) e WHERE NOT EXISTS(SELECT 1 FROM line_stations WHERE line_id=line AND station_name=e->>0)) THEN RAISE EXCEPTION 'Invalid stations %',r.service; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(r.events) WITH ORDINALITY a(e,o)
      JOIN jsonb_array_elements(r.events) WITH ORDINALITY b(f,k) ON k=o+1
      JOIN line_stations l ON l.line_id=line AND l.station_name=e->>0
      JOIN line_stations m ON m.line_id=line AND m.station_name=f->>0
      WHERE (r.direction='Outbound' AND l.station_index>=m.station_index)
         OR (r.direction='Inbound' AND l.station_index<=m.station_index)
         OR coalesce(e->>2,e->>1)>coalesce(f->>1,f->>2))
    THEN RAISE EXCEPTION 'Station/time order %',r.service; END IF;
    FOR cal IN SELECT unnest(ARRAY['Weekday','SaturdayHoliday']) LOOP
      SELECT array_agg(d::date ORDER BY d) INTO dates FROM generate_series('2026-11-01'::date,'2026-11-30'::date,'1 day') d WHERE (extract(isodow FROM d) IN (6,7) OR d::date IN ('2026-11-03','2026-11-23'))=(cal='SaturdayHoliday');
      IF r.old_id IS NOT NULL AND cal='Weekday' THEN
        SELECT t.id,m.timetable_id,m.last_stop_sequence+1 INTO STRICT sid,tid,old_count FROM manual_timetable_templates t JOIN train_timetable_members m ON m.source_template_id=t.id JOIN train_timetables v ON v.id=m.timetable_id JOIN published_train_number_evidence e ON e.source_template_id=t.id AND e.edition='2611' AND e.train_number=r.old_number
        WHERE t.id=r.old_id AND t.line_key=line AND t.train_number=r.service AND t.calendar_urn='odpt.Calendar:'||cal AND t.direction_urn='odpt.RailDirection:'||r.direction AND t.operating_dates IS NULL AND t.source_path='data/timetables/HokurikuShinkansen-manual.js' AND m.member_role='primary' AND m.first_stop_sequence=0 AND m.stop_offset=0 AND m.merge_first_stop=false AND v.group_evidence='source_only' AND v.canonical_key='source:'||t.id AND (SELECT count(*) FROM train_timetable_members WHERE timetable_id=v.id)=1 AND NOT EXISTS(SELECT 1 FROM train_timetable_vehicle_mappings WHERE timetable_id=v.id);
        IF old_count<>8 OR (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=sid)<>old_count THEN RAISE EXCEPTION 'Old stop count changed %',r.service; END IF;
        DELETE FROM manual_timetable_template_stops WHERE template_id=sid;
        UPDATE manual_timetable_templates SET destination_urns=ARRAY[prefix||r.destination],vehicle_type_label=NULL,source_path='official-sampled:jrwest:2611:'||r.url,operating_dates=dates WHERE id=sid;
        UPDATE train_timetables SET timetable_validity='date_verified' WHERE id=tid;
        UPDATE train_timetable_members SET last_stop_sequence=jsonb_array_length(r.events)-1 WHERE source_template_id=sid AND timetable_id=tid;
        UPDATE published_train_number_evidence SET train_number=r.number,official_source_url=r.url,verified_at=now() WHERE source_template_id=sid AND edition='2611' AND train_number=r.old_number;
      ELSE
        IF EXISTS(SELECT 1 FROM manual_timetable_templates WHERE line_key=line AND train_number=r.service AND calendar_urn='odpt.Calendar:'||cal) THEN RAISE EXCEPTION 'Duplicate % %',r.service,cal; END IF;
        INSERT INTO manual_timetable_templates(line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,destination_urns,source_path,source_trip_id,operating_dates)
        VALUES(line,'odpt.Calendar:'||cal,r.service,'odpt.Railway:JR-East.HokurikuShinkansen','odpt.RailDirection:'||r.direction,'odpt.TrainType:JR-East.Shinkansen',ARRAY[prefix||r.destination],'official-sampled:jrwest:2611:'||r.url,'2611:hokuriku:'||r.number||':'||cal,dates) RETURNING id INTO sid;
        INSERT INTO train_timetables(canonical_key,calendar_urn,primary_train_number,lead_source_template_id,group_evidence,timetable_validity)
        VALUES('source:'||sid,'odpt.Calendar:'||cal,r.service,sid,'source_only','date_verified') RETURNING id INTO tid;
        INSERT INTO train_timetable_members(source_template_id,timetable_id,segment_order,member_role,first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop)
        VALUES(sid,tid,0,'primary',0,jsonb_array_length(r.events)-1,0,false);
        INSERT INTO published_train_number_evidence(edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,official_source_url,verification_scope)
        VALUES('2611',line,'odpt.Calendar:'||cal,'odpt.RailDirection:'||r.direction,r.number,sid,r.url,'train_number_only');
      END IF;
      INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
      SELECT sid,ord-1,CASE WHEN e->>1 IS NOT NULL THEN prefix||(e->>0) END,CASE WHEN e->>2 IS NOT NULL THEN prefix||(e->>0) END,e->>1,e->>2 FROM jsonb_array_elements(r.events) WITH ORDINALITY a(e,ord);
      IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>jsonb_array_length(r.events) THEN RAISE EXCEPTION 'View mismatch %',r.service; END IF;
    END LOOP;
    IF EXISTS(SELECT 1 FROM generate_series('2026-11-01'::date,'2026-11-30'::date,'1 day') d WHERE (SELECT count(*) FROM manual_timetable_templates WHERE line_key=line AND train_number=r.service AND d::date=ANY(operating_dates))<>1) THEN RAISE EXCEPTION 'Date gap/overlap %',r.service; END IF;
  END LOOP;
  UPDATE published_timetable_coverage_audit a SET template_count=x.n,calendar_count=x.cal,direction_count=x.dir,sampled_count=x.sampled,checked_at=now()
  FROM (SELECT count(*)::int n,count(DISTINCT calendar_urn)::int cal,count(DISTINCT direction_urn)::int dir,count(*) FILTER(WHERE source_path LIKE 'official-sampled:%')::int sampled FROM manual_timetable_templates WHERE line_key=line) x WHERE a.line_key=line;
END $batch$;
COMMIT;