-- Remaining five trains of official JR Kyushu regular schedule PDF page index 1.
-- https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf
-- Also correct MIZUHO 602, whose official stop at Sendai 07:45 was
-- omitted by the prior manual transfer. No extra source or operational dates.
BEGIN;
CREATE TEMP TABLE p1remaining(key text PRIMARY KEY,name text) ON COMMIT DROP;
INSERT INTO p1remaining VALUES ('jrkyushu:20260314:p1final:kyushu:さくら744','さくら744'),
('jrkyushu:20260314:p1final:kyushu:つばめ310','つばめ310'),
('jrkyushu:20260314:p1final:kyushu:さくら746','さくら746'),
('jrkyushu:20260314:p1final:kyushu:さくら748','さくら748'),
('jrkyushu:20260314:p1final:kyushu:さくら750','さくら750');
CREATE TEMP TABLE p1remaining_stops(key text,seq int,station text,clock text,last_stop boolean) ON COMMIT DROP;
INSERT INTO p1remaining_stops VALUES ('jrkyushu:20260314:p1final:kyushu:さくら744',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','07:42',false),
('jrkyushu:20260314:p1final:kyushu:さくら744',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Sendai','07:54',false),
('jrkyushu:20260314:p1final:kyushu:さくら744',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Izumi','08:06',false),
('jrkyushu:20260314:p1final:kyushu:さくら744',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Minamata','08:13',false),
('jrkyushu:20260314:p1final:kyushu:さくら744',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Yatsushiro','08:27',false),
('jrkyushu:20260314:p1final:kyushu:さくら744',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','08:39',false),
('jrkyushu:20260314:p1final:kyushu:さくら744',6,'odpt.Station:JR-Kyushu.KyushuShinkansen.Chikugo-Funagoya','08:56',false),
('jrkyushu:20260314:p1final:kyushu:さくら744',7,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','09:04',false),
('jrkyushu:20260314:p1final:kyushu:さくら744',8,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','09:08',false),
('jrkyushu:20260314:p1final:kyushu:さくら744',9,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','09:23',true),
('jrkyushu:20260314:p1final:kyushu:つばめ310',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','08:12',false),
('jrkyushu:20260314:p1final:kyushu:つばめ310',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Sendai','08:24',false),
('jrkyushu:20260314:p1final:kyushu:つばめ310',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Izumi','08:36',false),
('jrkyushu:20260314:p1final:kyushu:つばめ310',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Minamata','08:44',false),
('jrkyushu:20260314:p1final:kyushu:つばめ310',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Yatsushiro','08:58',false),
('jrkyushu:20260314:p1final:kyushu:つばめ310',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','09:20',false),
('jrkyushu:20260314:p1final:kyushu:つばめ310',6,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tamana','09:30',false),
('jrkyushu:20260314:p1final:kyushu:つばめ310',7,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Omuta','09:38',false),
('jrkyushu:20260314:p1final:kyushu:つばめ310',8,'odpt.Station:JR-Kyushu.KyushuShinkansen.Chikugo-Funagoya','09:44',false),
('jrkyushu:20260314:p1final:kyushu:つばめ310',9,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','09:52',false),
('jrkyushu:20260314:p1final:kyushu:つばめ310',10,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','09:56',false),
('jrkyushu:20260314:p1final:kyushu:つばめ310',11,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','10:09',true),
('jrkyushu:20260314:p1final:kyushu:さくら746',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','08:43',false),
('jrkyushu:20260314:p1final:kyushu:さくら746',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Sendai','08:55',false),
('jrkyushu:20260314:p1final:kyushu:さくら746',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Izumi','09:07',false),
('jrkyushu:20260314:p1final:kyushu:さくら746',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Minamata','09:14',false),
('jrkyushu:20260314:p1final:kyushu:さくら746',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Yatsushiro','09:28',false),
('jrkyushu:20260314:p1final:kyushu:さくら746',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','09:39',false),
('jrkyushu:20260314:p1final:kyushu:さくら746',6,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Omuta','09:53',false),
('jrkyushu:20260314:p1final:kyushu:さくら746',7,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','10:04',false),
('jrkyushu:20260314:p1final:kyushu:さくら746',8,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','10:08',false),
('jrkyushu:20260314:p1final:kyushu:さくら746',9,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','10:23',true),
('jrkyushu:20260314:p1final:kyushu:さくら748',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','09:17',false),
('jrkyushu:20260314:p1final:kyushu:さくら748',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Sendai','09:30',false),
('jrkyushu:20260314:p1final:kyushu:さくら748',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','10:04',false),
('jrkyushu:20260314:p1final:kyushu:さくら748',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','10:26',false),
('jrkyushu:20260314:p1final:kyushu:さくら748',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','10:30',false),
('jrkyushu:20260314:p1final:kyushu:さくら748',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','10:45',true),
('jrkyushu:20260314:p1final:kyushu:さくら750',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','09:41',false),
('jrkyushu:20260314:p1final:kyushu:さくら750',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Sendai','09:53',false),
('jrkyushu:20260314:p1final:kyushu:さくら750',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Izumi','10:05',false),
('jrkyushu:20260314:p1final:kyushu:さくら750',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Minamata','10:13',false),
('jrkyushu:20260314:p1final:kyushu:さくら750',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Yatsushiro','10:27',false),
('jrkyushu:20260314:p1final:kyushu:さくら750',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','10:39',false),
('jrkyushu:20260314:p1final:kyushu:さくら750',6,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tamana','10:49',false),
('jrkyushu:20260314:p1final:kyushu:さくら750',7,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','11:03',false),
('jrkyushu:20260314:p1final:kyushu:さくら750',8,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','11:08',false),
('jrkyushu:20260314:p1final:kyushu:さくら750',9,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','11:23',true);
DO $$BEGIN IF (SELECT count(*) FROM p1remaining)<>5 THEN RAISE EXCEPTION 'Expected 5 remaining p1 services'; END IF;END$$;
INSERT INTO manual_timetable_templates
(line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,destination_urns,source_path,source_trip_id)
SELECT 'KyushuShinkansen','odpt.Calendar:SaturdayHoliday',r.name,
'odpt.Railway:JR-Kyushu.KyushuShinkansen','odpt.RailDirection:Inbound',
'odpt.TrainType:JR-Kyushu.Shinkansen',
ARRAY[(SELECT s.station FROM p1remaining_stops s WHERE s.key=r.key ORDER BY seq DESC LIMIT 1)],
'official-sampled:holiday:https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf',r.key
FROM p1remaining r WHERE NOT EXISTS(SELECT 1 FROM manual_timetable_templates m WHERE m.source_trip_id=r.key AND m.calendar_urn='odpt.Calendar:SaturdayHoliday');
CREATE TEMP TABLE p1remaining_map ON COMMIT DROP AS SELECT r.key,m.id FROM p1remaining r JOIN manual_timetable_templates m ON m.source_trip_id=r.key AND m.calendar_urn='odpt.Calendar:SaturdayHoliday' AND m.line_key='KyushuShinkansen';
DO $$BEGIN IF (SELECT count(*) FROM p1remaining_map)<>5 THEN RAISE EXCEPTION 'Unexpected remaining p1 map';END IF;END$$;
INSERT INTO manual_timetable_template_stops
(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
SELECT m.id,s.seq,CASE WHEN s.last_stop THEN s.station END,CASE WHEN NOT s.last_stop THEN s.station END,
CASE WHEN s.last_stop THEN s.clock END,CASE WHEN NOT s.last_stop THEN s.clock END
FROM p1remaining_map m JOIN p1remaining_stops s ON s.key=m.key
WHERE NOT EXISTS(SELECT 1 FROM manual_timetable_template_stops old WHERE old.template_id=m.id AND old.stop_sequence=s.seq);
INSERT INTO train_timetables(canonical_key,calendar_urn,primary_train_number,lead_source_template_id,group_evidence,timetable_validity)
SELECT 'source:'||m.id,'odpt.Calendar:SaturdayHoliday',t.train_number,m.id,'source_only','undated_not_current_verified'
FROM p1remaining_map m JOIN manual_timetable_templates t ON t.id=m.id
WHERE NOT EXISTS(SELECT 1 FROM train_timetables e WHERE e.lead_source_template_id=m.id);
INSERT INTO train_timetable_members
(source_template_id,timetable_id,segment_order,member_role,first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop)
SELECT m.id,t.id,0,'primary',0,(SELECT max(stop_sequence) FROM manual_timetable_template_stops s WHERE s.template_id=m.id),0,false
FROM p1remaining_map m JOIN train_timetables t ON t.lead_source_template_id=m.id
WHERE NOT EXISTS(SELECT 1 FROM train_timetable_members e WHERE e.source_template_id=m.id);
-- Correct the existing official-source MIZUHO 602 template (no weekday source edit).
DO $$BEGIN IF (SELECT count(*) FROM manual_timetable_templates WHERE
source_trip_id='jrkyushu:20260314:kyushu:みずほ602' AND calendar_urn='odpt.Calendar:SaturdayHoliday')<>1
THEN RAISE EXCEPTION 'Mizuho602 template not present';END IF;END$$;
CREATE TEMP TABLE fix602(seq int,station text,clock text,last_stop boolean) ON COMMIT DROP;
INSERT INTO fix602 VALUES (0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','07:32',false),(1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Sendai','07:45',false),(2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','08:19',false),(3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','08:53',true);
DELETE FROM manual_timetable_template_stops WHERE template_id IN
(SELECT id FROM manual_timetable_templates WHERE source_trip_id='jrkyushu:20260314:kyushu:みずほ602' AND calendar_urn='odpt.Calendar:SaturdayHoliday');
INSERT INTO manual_timetable_template_stops
(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
SELECT m.id,s.seq,CASE WHEN s.last_stop THEN s.station END,CASE WHEN NOT s.last_stop THEN s.station END,
CASE WHEN s.last_stop THEN s.clock END,CASE WHEN NOT s.last_stop THEN s.clock END
FROM manual_timetable_templates m CROSS JOIN fix602 s
WHERE m.source_trip_id='jrkyushu:20260314:kyushu:みずほ602' AND m.calendar_urn='odpt.Calendar:SaturdayHoliday';
UPDATE train_timetable_members SET last_stop_sequence=3
WHERE source_template_id IN (SELECT id FROM manual_timetable_templates WHERE source_trip_id='jrkyushu:20260314:kyushu:みずほ602' AND calendar_urn='odpt.Calendar:SaturdayHoliday');
DO $$BEGIN IF EXISTS(SELECT 1 FROM p1remaining_map m WHERE
(SELECT count(*) FROM manual_timetable_template_stops s WHERE s.template_id=m.id)<2
OR NOT EXISTS(SELECT 1 FROM train_timetable_members tm WHERE tm.source_template_id=m.id))
THEN RAISE EXCEPTION 'Incomplete p1 train';END IF;END$$;
WITH c AS (SELECT line_key,count(*)::int ct,count(distinct calendar_urn)::int cal,count(distinct direction_urn)::int dir,count(*) filter(where source_path like 'official-sampled:%')::int sampled FROM manual_timetable_templates WHERE line_key='KyushuShinkansen' GROUP BY line_key)
UPDATE published_timetable_coverage_audit a SET template_count=c.ct,calendar_count=c.cal,direction_count=c.dir,sampled_count=c.sampled,
issues=(SELECT array_agg(DISTINCT issue ORDER BY issue) FROM unnest(a.issues||ARRAY['KYUSHU_2026_HOLIDAY_P1_ALL_SERVICES_IMPORTED','MIZUHO602_SENDAI_STOP_CORRECTED']::text[]) issue),checked_at=now() FROM c WHERE c.line_key=a.line_key;
COMMIT;