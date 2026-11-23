-- Fourth Hokuriku source reconciliation, November 2026 only.
-- Daily services cross-checked against JR East and JR West.
-- 508 and 562 have time variants; excluded from this batch.
-- 506: JR East 2612 098581/098582 have identical stop times.
BEGIN;
SELECT pg_advisory_xact_lock(2611,240504);
DO $batch$
DECLARE r record; cal text; sid bigint; tid bigint; dates date[]; old_count int;
  prefix constant text:='odpt.Station:JR-East.HokurikuShinkansen.';
  line constant text:='HokurikuShinkansen';
BEGIN
  FOR r IN SELECT * FROM (VALUES
(NULL::bigint,'かがやき502','3502E',NULL::text,'Inbound','Tokyo','https://timetable.jr-odekake.net/train-timetable/248751?date=20261112','[["Tsuruga",null,"06:12"],["Echizen-Takefu","06:23","06:24"],["Fukui-Echizen","06:32","06:33"],["Komatsu","06:49","06:50"],["Kanazawa","07:01","07:03"],["Toyama","07:22","07:23"],["Nagano","08:08","08:10"],["Omiya","09:07","09:08"],["Ueno","09:26","09:27"],["Tokyo","09:32",null]]'::jsonb),
(1947::bigint,'かがやき506','3506E','35506E'::text,'Inbound','Tokyo','https://timetable.jr-odekake.net/train-timetable/248771?date=20261106','[["Tsuruga",null,"08:15"],["Fukui-Echizen","08:31","08:32"],["Awara-Onsen","08:40","08:41"],["Kaga-Onsen","08:49","08:49"],["Kanazawa","09:05","09:07"],["Toyama","09:25","09:26"],["Nagano","10:12","10:14"],["Omiya","11:11","11:12"],["Ueno","11:30","11:31"],["Tokyo","11:36",null]]'::jsonb),
(1939::bigint,'かがやき507','3507E','35507E'::text,'Outbound','Tsuruga','https://timetable.jr-odekake.net/train-timetable/248791?date=20261123','[["Tokyo",null,"09:20"],["Ueno","09:25","09:26"],["Omiya","09:44","09:45"],["Nagano","10:44","10:46"],["Toyama","11:32","11:33"],["Kanazawa","11:52","11:54"],["Kaga-Onsen","12:08","12:09"],["Awara-Onsen","12:16","12:17"],["Fukui-Echizen","12:25","12:26"],["Tsuruga","12:42",null]]'::jsonb),
(1940::bigint,'かがやき509','3509E','35509E'::text,'Outbound','Tsuruga','https://timetable.jr-odekake.net/train-timetable/248701?date=20261114','[["Tokyo",null,"10:22"],["Ueno","10:27","10:28"],["Omiya","10:46","10:47"],["Nagano","11:41","11:43"],["Toyama","12:29","12:30"],["Kanazawa","12:49","12:51"],["Kaga-Onsen","13:05","13:06"],["Awara-Onsen","13:13","13:14"],["Fukui-Echizen","13:22","13:23"],["Tsuruga","13:39",null]]'::jsonb)
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
        IF old_count<>(CASE WHEN r.old_id=1940 THEN 7 ELSE 8 END) OR (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=sid)<>old_count THEN RAISE EXCEPTION 'Old stop count changed %',r.service; END IF;
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