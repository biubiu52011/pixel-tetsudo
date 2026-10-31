-- Six official JR Kyushu recurring Nishi Kyushu Shinkansen short-section trains.
-- Source: https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf

BEGIN;
CREATE TEMP TABLE holiday_short_train(key text PRIMARY KEY,train_number text,direction text) ON COMMIT DROP;
INSERT INTO holiday_short_train VALUES ('20260314:NishiKyushuShinkansen:かもめ101号','かもめ101号','Outbound'),('20260314:NishiKyushuShinkansen:かもめ103号','かもめ103号','Outbound'),('20260314:NishiKyushuShinkansen:かもめ12号','かもめ12号','Inbound'),('20260314:NishiKyushuShinkansen:かもめ18号','かもめ18号','Inbound'),('20260314:NishiKyushuShinkansen:かもめ26号','かもめ26号','Inbound'),('20260314:NishiKyushuShinkansen:かもめ102号','かもめ102号','Inbound');
CREATE TEMP TABLE holiday_short_stops(key text,seq int,station text,clock text,is_last boolean) ON COMMIT DROP;
INSERT INTO holiday_short_stops VALUES ('20260314:NishiKyushuShinkansen:かもめ101号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','06:20',FALSE),('20260314:NishiKyushuShinkansen:かもめ101号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','06:27',FALSE),('20260314:NishiKyushuShinkansen:かもめ101号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','06:36',TRUE),('20260314:NishiKyushuShinkansen:かもめ103号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','08:12',FALSE),('20260314:NishiKyushuShinkansen:かもめ103号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','08:18',FALSE),('20260314:NishiKyushuShinkansen:かもめ103号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','08:26',TRUE),('20260314:NishiKyushuShinkansen:かもめ12号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','08:44',FALSE),('20260314:NishiKyushuShinkansen:かもめ12号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','08:53',FALSE),('20260314:NishiKyushuShinkansen:かもめ12号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','09:08',TRUE),('20260314:NishiKyushuShinkansen:かもめ18号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','09:50',FALSE),('20260314:NishiKyushuShinkansen:かもめ18号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','09:59',FALSE),('20260314:NishiKyushuShinkansen:かもめ18号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','10:13',TRUE),('20260314:NishiKyushuShinkansen:かもめ26号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','11:45',FALSE),('20260314:NishiKyushuShinkansen:かもめ26号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','11:55',FALSE),('20260314:NishiKyushuShinkansen:かもめ26号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','12:01',FALSE),('20260314:NishiKyushuShinkansen:かもめ26号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','12:13',TRUE),('20260314:NishiKyushuShinkansen:かもめ102号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','23:30',FALSE),('20260314:NishiKyushuShinkansen:かもめ102号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','23:40',FALSE),('20260314:NishiKyushuShinkansen:かもめ102号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','23:46',TRUE);
DO $$ BEGIN IF (SELECT count(*) FROM holiday_short_train)<>6 OR
 EXISTS(SELECT 1 FROM holiday_short_train t WHERE (SELECT count(*) FROM holiday_short_stops s WHERE s.key=t.key)<2)
 THEN RAISE EXCEPTION 'Short section schedule count incorrect'; END IF; END $$;
INSERT INTO manual_timetable_templates(line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,destination_urns,source_path,source_trip_id)
SELECT 'NishiKyushuShinkansen','odpt.Calendar:SaturdayHoliday',t.train_number,
'odpt.Railway:JR-Kyushu.NishiKyushuShinkansen','odpt.RailDirection:'||t.direction,'odpt.TrainType:JR-Kyushu.Shinkansen',
ARRAY[(SELECT station FROM holiday_short_stops s WHERE s.key=t.key ORDER BY seq DESC LIMIT 1)],
'official-sampled:holiday:https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf',t.key
FROM holiday_short_train t WHERE NOT EXISTS(SELECT 1 FROM manual_timetable_templates m WHERE m.source_trip_id=t.key AND m.calendar_urn='odpt.Calendar:SaturdayHoliday');
CREATE TEMP TABLE holiday_short_map ON COMMIT DROP AS
SELECT m.id,t.key FROM holiday_short_train t JOIN manual_timetable_templates m ON m.source_trip_id=t.key AND m.calendar_urn='odpt.Calendar:SaturdayHoliday' AND m.line_key='NishiKyushuShinkansen';
DO $$ BEGIN IF (SELECT count(*) FROM holiday_short_map)<>6 THEN RAISE EXCEPTION 'Source map mismatch'; END IF; END $$;
INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
SELECT m.id,s.seq,CASE WHEN s.is_last THEN s.station END,CASE WHEN NOT s.is_last THEN s.station END,
CASE WHEN s.is_last THEN s.clock END,CASE WHEN NOT s.is_last THEN s.clock END
FROM holiday_short_map m JOIN holiday_short_stops s ON s.key=m.key
WHERE NOT EXISTS(SELECT 1 FROM manual_timetable_template_stops x WHERE x.template_id=m.id AND x.stop_sequence=s.seq);
INSERT INTO train_timetables(canonical_key,calendar_urn,primary_train_number,lead_source_template_id,group_evidence,timetable_validity)
SELECT 'source:'||m.id,'odpt.Calendar:SaturdayHoliday',t.train_number,m.id,'source_only','undated_not_current_verified'
FROM holiday_short_map m JOIN manual_timetable_templates t ON t.id=m.id
WHERE NOT EXISTS(SELECT 1 FROM train_timetables x WHERE x.lead_source_template_id=m.id);
INSERT INTO train_timetable_members(source_template_id,timetable_id,segment_order,member_role,first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop)
SELECT m.id,t.id,0,'primary',0,(SELECT max(stop_sequence) FROM manual_timetable_template_stops s WHERE s.template_id=m.id),0,false
FROM holiday_short_map m JOIN train_timetables t ON t.lead_source_template_id=m.id
WHERE NOT EXISTS(SELECT 1 FROM train_timetable_members x WHERE x.source_template_id=m.id);
DO $$BEGIN IF EXISTS(SELECT 1 FROM holiday_short_map m WHERE NOT EXISTS(SELECT 1 FROM train_timetable_members tm WHERE tm.source_template_id=m.id)
OR (SELECT count(*) FROM manual_timetable_template_stops s WHERE s.template_id=m.id)<2) THEN RAISE EXCEPTION 'Incomplete source membership'; END IF; END$$;
WITH c AS(SELECT line_key,count(*)::int n,count(distinct calendar_urn)::int cal,count(distinct direction_urn)::int dirs,count(*) filter(where source_path LIKE 'official-sampled:%')::int sample FROM manual_timetable_templates WHERE line_key='NishiKyushuShinkansen' GROUP BY line_key)
UPDATE published_timetable_coverage_audit a SET template_count=c.n,calendar_count=c.cal,direction_count=c.dirs,sampled_count=c.sample,checked_at=now()
FROM c WHERE c.line_key=a.line_key;
COMMIT;
