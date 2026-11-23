BEGIN;
DO $fix$
DECLARE base_id bigint; sid bigint; tid bigint; n int; pref constant text:='odpt.Station:JR-East.HokurikuShinkansen.'; dates constant date[]:=ARRAY['2026-11-07','2026-11-14','2026-11-21','2026-11-28']::date[];
BEGIN
 SELECT t.id INTO STRICT base_id FROM manual_timetable_templates t JOIN published_train_number_evidence e ON e.source_template_id=t.id AND e.edition='2611' AND e.train_number='1014E' WHERE t.line_key='HokurikuShinkansen' AND t.train_number='つるぎ14' AND t.calendar_urn='odpt.Calendar:SaturdayHoliday' AND t.destination_urns=ARRAY[pref||'Kanazawa'] AND t.operating_dates=ARRAY['2026-11-01','2026-11-03','2026-11-07','2026-11-08','2026-11-14','2026-11-15','2026-11-22','2026-11-23','2026-11-29']::date[];
 IF EXISTS(SELECT 1 FROM manual_timetable_templates WHERE line_key='HokurikuShinkansen' AND train_number='つるぎ14' AND source_trip_id='2611:hokuriku:8014E:SaturdayHoliday') THEN RAISE EXCEPTION '8014E variant already exists'; END IF;
 IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=base_id)<>3 OR NOT EXISTS(SELECT 1 FROM manual_timetable_template_stops WHERE template_id=base_id AND stop_sequence=2 AND arrival_station_urn=pref||'Kanazawa' AND arrival_clock='12:02' AND departure_clock IS NULL) THEN RAISE EXCEPTION 'Unexpected 1014E stop chain'; END IF;
 UPDATE manual_timetable_templates SET operating_dates=ARRAY(SELECT d FROM unnest(operating_dates) d WHERE NOT d=ANY(dates) ORDER BY d),source_path='official-sampled:jrwest:2611:https://timetable.jr-odekake.net/train-timetable/249391?date=20261101' WHERE id=base_id;
 UPDATE published_train_number_evidence SET official_source_url='https://timetable.jr-odekake.net/train-timetable/249391?date=20261101',verified_at=now() WHERE source_template_id=base_id AND edition='2611' AND train_number='1014E';
 INSERT INTO manual_timetable_templates(line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,destination_urns,source_path,source_trip_id,source_occurrence,operating_dates)
 SELECT line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,ARRAY[pref||'Toyama'],'official-sampled:jrwest:2611:https://timetable.jr-odekake.net/train-timetable/385411?date=20261107','2611:hokuriku:8014E:SaturdayHoliday',1,dates FROM manual_timetable_templates WHERE id=base_id RETURNING id INTO sid;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock FROM manual_timetable_template_stops WHERE template_id=base_id AND stop_sequence<2
 UNION ALL SELECT sid,2,pref||'Kanazawa',pref||'Kanazawa','12:02','12:04'
 UNION ALL SELECT sid,3,pref||'Shin-Takaoka',pref||'Shin-Takaoka','12:17','12:18'
 UNION ALL SELECT sid,4,pref||'Toyama',NULL,'12:26',NULL;
 INSERT INTO train_timetables(canonical_key,calendar_urn,primary_train_number,lead_source_template_id,group_evidence,timetable_validity)
 VALUES('source:'||sid,'odpt.Calendar:SaturdayHoliday','つるぎ14',sid,'source_only','date_verified') RETURNING id INTO tid;
 INSERT INTO train_timetable_members(source_template_id,timetable_id,segment_order,member_role,first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop) VALUES(sid,tid,0,'primary',0,4,0,false);
 INSERT INTO published_train_number_evidence(edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,official_source_url,verification_scope) VALUES('2611','HokurikuShinkansen','odpt.Calendar:SaturdayHoliday','odpt.RailDirection:Inbound','8014E',sid,'https://timetable.jr-odekake.net/train-timetable/385411?date=20261107','train_number_only');
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>5 THEN RAISE EXCEPTION 'Unexpected 8014E view'; END IF;
 IF EXISTS(SELECT 1 FROM generate_series('2026-11-01'::date,'2026-11-30'::date,'1 day') d WHERE (SELECT count(*) FROM manual_timetable_templates WHERE line_key='HokurikuShinkansen' AND train_number='つるぎ14' AND d::date=ANY(operating_dates))<>1) THEN RAISE EXCEPTION '14 date overlap or gap'; END IF;
 UPDATE published_timetable_coverage_audit a SET template_count=x.n,calendar_count=x.cal,direction_count=x.dir,sampled_count=x.sampled,checked_at=now() FROM (SELECT count(*)::int n,count(DISTINCT calendar_urn)::int cal,count(DISTINCT direction_urn)::int dir,count(*) FILTER(WHERE source_path LIKE 'official-sampled:%')::int sampled FROM manual_timetable_templates WHERE line_key='HokurikuShinkansen') x WHERE a.line_key='HokurikuShinkansen';
END $fix$;
COMMIT;