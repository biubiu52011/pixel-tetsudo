-- 5055M: date-specific November 21 run. November number evidence and
-- December edition retained November 21 full stop detail are separate sources.
-- Do not infer October 31 clocks or December service from this row.
BEGIN;
DO $fix$
DECLARE sid bigint; tid bigint; n int;
DECLARE pref constant text:='odpt.Station:JR-East.AkitaShinkansen.';
DECLARE number_url constant text:='https://timetables.jreast.co.jp/2611/timetable-v/003d2p.html';
DECLARE clock_url constant text:='https://timetables.jreast.co.jp/2612/train/045/047241.html';
DECLARE cal constant text:='odpt.Calendar:SaturdayHoliday';
BEGIN
 IF EXISTS(SELECT 1 FROM manual_timetable_templates WHERE line_key='AkitaShinkansen' AND train_number='こまち55') OR EXISTS(SELECT 1 FROM published_train_number_evidence WHERE edition='2611' AND line_key='AkitaShinkansen' AND train_number='5055M') OR EXISTS(SELECT 1 FROM published_train_png_number_ranges WHERE edition='2611' AND line_key='AkitaShinkansen' AND suffix='M' AND 5055 BETWEEN min_number AND max_number) THEN RAISE EXCEPTION '5055M already exists'; END IF;
 INSERT INTO manual_timetable_templates(line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,destination_urns,vehicle_type_label,source_path,source_trip_id,source_occurrence,operating_dates)
 SELECT line_key,cal,'こまち55',railway_urn,direction_urn,train_type_urn,destination_urns,'E6系','official-sampled:jreast:2612:'||clock_url,'2611:akita:5055M:20261121',1,ARRAY['2026-11-21'::date] FROM manual_timetable_templates WHERE id=770 AND line_key='AkitaShinkansen' AND direction_urn='odpt.RailDirection:Outbound' RETURNING id INTO STRICT sid;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,seq,CASE WHEN arr IS NOT NULL THEN urn END,CASE WHEN dep IS NOT NULL THEN urn END,arr,dep FROM (VALUES
 (0,pref||'Ueno',NULL::text,'07:56'),
 (1,pref||'Omiya','08:14','08:15'),
 (2,pref||'Sendai','09:22','09:24'),
 (3,'odpt.Station:JR-East.TohokuShinkansen.Ichinoseki','09:47','09:48'),
 (4,pref||'Morioka','10:14','10:18'),
 (5,pref||'Tazawako','10:57','10:58'),
 (6,pref||'Kakunodate','11:18','11:19'),
 (7,pref||'Omagari','11:31','11:33'),
 (8,pref||'Akita','12:04',NULL)
 ) v(seq,urn,arr,dep);
 INSERT INTO train_timetables(canonical_key,calendar_urn,primary_train_number,lead_source_template_id,group_evidence,timetable_validity)
 VALUES('source:'||sid,cal,'こまち55',sid,'source_only','date_verified') RETURNING id INTO tid;
 INSERT INTO train_timetable_members(source_template_id,timetable_id,segment_order,member_role,first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop)
 VALUES(sid,tid,0,'primary',0,8,0,false);
 INSERT INTO published_train_number_evidence(edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,official_source_url,verification_scope)
 VALUES('2611','AkitaShinkansen',cal,'odpt.RailDirection:Outbound','5055M',sid,number_url,'train_number_only');
 INSERT INTO train_timetable_vehicle_mappings(timetable_id,source_template_id,vehicle_type,mapping_level,source_id,source_path,actual_vehicle_confirmed)
 SELECT tid,sid,vehicle_type,mapping_level,source_id,'official-sampled:jreast:2612:'||clock_url,false FROM train_timetable_vehicle_mappings WHERE source_template_id=770 AND vehicle_type='E6系' AND mapping_level='official_service_vehicle_plan' AND NOT actual_vehicle_confirmed;
 GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Expected one E6 plan'; END IF;
 INSERT INTO published_train_png_number_ranges(edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
 SELECT '2611','AkitaShinkansen','holiday_verified_single_number',5055,5055,'M','E6系',png_reference,number_url,true,false FROM published_train_png_number_ranges WHERE edition='2611' AND line_key='AkitaShinkansen' AND min_number=5059 AND max_number=5059 AND suffix='M' AND vehicle_model='E6系' AND requires_exact_roster AND NOT actual_vehicle_confirmed;
 GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Expected one PNG rule'; END IF;
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>9 THEN RAISE EXCEPTION 'Unexpected canonical view'; END IF;
 UPDATE published_timetable_coverage_audit a SET template_count=x.n,calendar_count=x.cal,direction_count=x.dir,sampled_count=x.sampled,checked_at=now() FROM (SELECT count(*)::int n,count(DISTINCT calendar_urn)::int cal,count(DISTINCT direction_urn)::int dir,count(*) FILTER(WHERE source_path LIKE 'official-sampled:%')::int sampled FROM manual_timetable_templates WHERE line_key='AkitaShinkansen') x WHERE a.line_key='AkitaShinkansen' AND a.coverage_status='sparse_review';
END $fix$;
COMMIT;