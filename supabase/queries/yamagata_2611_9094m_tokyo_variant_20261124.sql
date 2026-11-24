-- 9094M/9094B: independent Tokyo-bound Tsubasa 94 variant.
-- Official 2611 detail: 2026-11-01 and 2026-11-22.
-- https://timetables.jreast.co.jp/2611/train/035/035132.html
-- Do not copy the 6094M Ueno terminal, dates or exact vehicle proof.
BEGIN;
DO $fix$
DECLARE sid bigint; tid bigint;
DECLARE pref constant text:='odpt.Station:JR-East.YamagataShinkansen.';
DECLARE url constant text:='https://timetables.jreast.co.jp/2611/train/035/035132.html';
DECLARE cal constant text:='odpt.Calendar:SaturdayHoliday';
BEGIN
 IF EXISTS(SELECT 1 FROM published_train_number_evidence WHERE line_key='YamagataShinkansen' AND edition='2611' AND train_number='9094M')
 OR EXISTS(SELECT 1 FROM manual_timetable_templates WHERE line_key='YamagataShinkansen' AND train_number='つばさ94' AND operating_dates && ARRAY['2026-11-01'::date,'2026-11-22'::date])
 THEN RAISE EXCEPTION '9094M variant already exists'; END IF;
 INSERT INTO manual_timetable_templates(line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,destination_urns,vehicle_type_label,source_path,source_trip_id,source_occurrence,operating_dates)
 SELECT line_key,cal,train_number,railway_urn,direction_urn,train_type_urn,ARRAY[pref||'Tokyo'],NULL,'official-sampled:jreast:2611:'||url,'2611:yamagata:9094M:20261101-22',1,ARRAY['2026-11-01'::date,'2026-11-22'::date]
 FROM manual_timetable_templates WHERE id=730 AND line_key='YamagataShinkansen' AND destination_urns=ARRAY[pref||'Ueno'] AND operating_dates=ARRAY['2026-11-20'::date,'2026-11-23'::date] RETURNING id INTO STRICT sid;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,seq,CASE WHEN arr IS NOT NULL THEN pref||station END,CASE WHEN dep IS NOT NULL THEN pref||station END,arr,dep FROM (VALUES
 (0,'Yamagata',NULL::text,'19:03'),
 (1,'Kaminoyama-Onsen','19:12','19:12'),
 (2,'Akayu','19:26','19:26'),
 (3,'Takahata','19:31','19:31'),
 (4,'Yonezawa','19:38','19:39'),
 (5,'Fukushima','20:13','20:16'),
 (6,'Omiya','21:14','21:15'),
 (7,'Ueno','21:34','21:35'),
 (8,'Tokyo','21:40',NULL)
 ) v(seq,station,arr,dep);
 INSERT INTO train_timetables(canonical_key,calendar_urn,primary_train_number,lead_source_template_id,group_evidence,timetable_validity)
 VALUES('source:'||sid,cal,'つばさ94',sid,'source_only','date_verified') RETURNING id INTO tid;
 INSERT INTO train_timetable_members(source_template_id,timetable_id,segment_order,member_role,first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop)
 VALUES(sid,tid,0,'primary',0,8,0,false);
 INSERT INTO published_train_number_evidence(edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,official_source_url,verification_scope)
 VALUES('2611','YamagataShinkansen',cal,'odpt.RailDirection:Inbound','9094M',sid,url,'train_number_only');
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>9 THEN RAISE EXCEPTION 'Unexpected canonical view'; END IF;
 UPDATE published_timetable_coverage_audit a SET template_count=x.n,calendar_count=x.cal,direction_count=x.dir,sampled_count=x.sampled,checked_at=now()
 FROM (SELECT count(*)::int n,count(DISTINCT calendar_urn)::int cal,count(DISTINCT direction_urn)::int dir,count(*) FILTER(WHERE source_path LIKE 'official-sampled:%')::int sampled FROM manual_timetable_templates WHERE line_key='YamagataShinkansen') x WHERE a.line_key='YamagataShinkansen' AND a.coverage_status='sparse_review';
END $fix$;
COMMIT;