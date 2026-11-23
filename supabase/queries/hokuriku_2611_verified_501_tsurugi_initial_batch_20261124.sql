BEGIN;
SELECT pg_advisory_xact_lock(2611,240501);
DO $batch$
DECLARE
  r record; cal text; sid bigint; tid bigint; stops jsonb; n int;
  dates date[]; prefix text:='odpt.Station:JR-East.HokurikuShinkansen.';
  line constant text:='HokurikuShinkansen';
BEGIN
  -- Reuse the already verified 3501E holiday stop chain; November edition
  -- down table identifies 3501E as daily, and JR West confirms Nov 24 Fukui.
  IF (SELECT count(*) FROM manual_timetable_templates WHERE id=1936 AND line_key=line AND train_number='かがやき501' AND calendar_urn='odpt.Calendar:Weekday' AND destination_urns=ARRAY[prefix||'Kanazawa'] AND operating_dates IS NULL)<>1
  OR (SELECT count(*) FROM manual_timetable_templates WHERE id=128899 AND line_key=line AND train_number='かがやき501' AND calendar_urn='odpt.Calendar:SaturdayHoliday' AND destination_urns=ARRAY[prefix||'Tsuruga'] AND operating_dates IS NULL)<>1
  OR (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=1936)<>8
  OR (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=128899)<>10
  OR (SELECT count(*) FROM published_train_number_evidence WHERE source_template_id=1936 AND edition='2611' AND train_number='35501E')<>1
  OR (SELECT count(*) FROM published_train_number_evidence WHERE source_template_id=128899 AND edition='2611' AND train_number='3501E')<>1
  THEN RAISE EXCEPTION '501 previous data changed'; END IF;
  IF EXISTS(SELECT 1 FROM train_timetable_members m JOIN train_timetables t ON t.id=m.timetable_id WHERE m.source_template_id IN (1936,128899) AND (m.member_role<>'primary' OR t.group_evidence<>'source_only' OR (SELECT count(*) FROM train_timetable_members mm WHERE mm.timetable_id=t.id)<>1)) THEN RAISE EXCEPTION '501 canonical ownership changed'; END IF;
  DELETE FROM manual_timetable_template_stops WHERE template_id=1936;
  INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
  SELECT 1936,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock FROM manual_timetable_template_stops WHERE template_id=128899;
  UPDATE train_timetable_members SET last_stop_sequence=9 WHERE source_template_id=1936 AND last_stop_sequence=7;
  IF NOT FOUND THEN RAISE EXCEPTION '501 member not updated'; END IF;
  UPDATE manual_timetable_templates SET destination_urns=ARRAY[prefix||'Tsuruga'],vehicle_type_label=NULL,source_path='official-sampled:weekday:https://timetables.jreast.co.jp/2611/train/095/098481.html' WHERE id=1936;
  UPDATE published_train_number_evidence SET train_number='3501E',official_source_url='https://timetables.jreast.co.jp/2611/train/095/098481.html',verified_at=now() WHERE source_template_id=1936 AND edition='2611' AND train_number='35501E';
  -- All dates are mutually exclusive between weekday and holiday sources.
  FOR cal IN SELECT unnest(ARRAY['Weekday','SaturdayHoliday']) LOOP
    SELECT array_agg(d::date ORDER BY d) INTO dates FROM generate_series('2026-11-01'::date,'2026-11-30'::date,'1 day') d
    WHERE (extract(isodow FROM d) IN (6,7) OR d::date IN ('2026-11-03','2026-11-23'))=(cal='SaturdayHoliday');
    UPDATE manual_timetable_templates SET operating_dates=dates WHERE id=CASE WHEN cal='Weekday' THEN 1936 ELSE 128899 END;
    UPDATE train_timetables SET timetable_validity='date_verified' WHERE lead_source_template_id=CASE WHEN cal='Weekday' THEN 1936 ELSE 128899 END;
    -- Small, individually verified daily JR West samples, not blanket duplication.
    FOR r IN SELECT * FROM (VALUES
      ('つるぎ1','1E','Outbound','Tsuruga','https://timetable.jr-odekake.net/train-timetable/249231?date=20261121','[["Kanazawa",null,"06:00"],["Komatsu","06:11","06:11"],["Kaga-Onsen","06:18","06:19"],["Awara-Onsen","06:27","06:27"],["Fukui-Echizen","06:35","06:36"],["Echizen-Takefu","06:44","06:45"],["Tsuruga","06:57",null]]'::jsonb),
      ('つるぎ2','1002E','Inbound','Toyama','https://timetable.jr-odekake.net/train-timetable/249191?date=20261102','[["Tsuruga",null,"08:06"],["Fukui-Echizen","08:23","08:24"],["Kanazawa","08:47","08:49"],["Shin-Takaoka","09:03","09:04"],["Toyama","09:12",null]]'::jsonb),
      ('つるぎ11','1011E','Outbound','Tsuruga','https://timetable.jr-odekake.net/train-timetable/278421?date=20261104','[["Toyama",null,"08:16"],["Shin-Takaoka","08:24","08:24"],["Kanazawa","08:38","08:40"],["Fukui-Echizen","09:07","09:08"],["Tsuruga","09:25",null]]'::jsonb)
    ) v(service,number,direction,destination,url,events) LOOP
      IF EXISTS(SELECT 1 FROM manual_timetable_templates WHERE line_key=line AND calendar_urn='odpt.Calendar:'||cal AND train_number=r.service) THEN RAISE EXCEPTION 'Duplicate % %',r.service,cal; END IF;
      IF EXISTS(SELECT 1 FROM jsonb_array_elements(r.events) e WHERE NOT EXISTS(SELECT 1 FROM line_stations WHERE line_id=line AND station_name=e->>0)) THEN RAISE EXCEPTION 'Unrecognized station'; END IF;
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
  END LOOP;
  IF EXISTS(SELECT 1 FROM generate_series('2026-11-01'::date,'2026-11-30'::date,'1 day') d CROSS JOIN (VALUES('かがやき501'),('つるぎ1'),('つるぎ2'),('つるぎ11')) v(service) WHERE (SELECT count(*) FROM manual_timetable_templates WHERE line_key=line AND train_number=v.service AND d::date=ANY(operating_dates))<>1) THEN RAISE EXCEPTION 'Date ownership overlap or gap'; END IF;
  UPDATE published_timetable_coverage_audit a SET template_count=x.n,calendar_count=x.cal,direction_count=x.dir,sampled_count=x.sampled,checked_at=now()
  FROM (SELECT count(*)::int n,count(DISTINCT calendar_urn)::int cal,count(DISTINCT direction_urn)::int dir,count(*) FILTER(WHERE source_path LIKE 'official-sampled:%')::int sampled FROM manual_timetable_templates WHERE line_key=line) x
  WHERE a.line_key=line;
END $batch$;
COMMIT;