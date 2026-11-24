-- 2611 source-reference correction: restore actual branch junction and full itinerary.
-- Keep undated_not_current_verified and existing source identities; no operating-day or vehicle claim.
-- Coupled B and M services are NOT merged; 121B is the number on the Tohoku section.
BEGIN;
-- 121B: https://timetables.jreast.co.jp/2611/train/025/029831.html
DO $fix$
DECLARE sid constant bigint:=1382; tid bigint;
BEGIN
 SELECT c.id INTO STRICT tid FROM manual_timetable_templates t JOIN train_timetable_members m ON m.source_template_id=t.id JOIN train_timetables c ON c.id=m.timetable_id
 WHERE t.id=sid AND t.line_key='TohokuShinkansen' AND t.train_number='Tsubasa121' AND t.destination_urns=ARRAY['odpt.Station:JR-East.TohokuShinkansen.Yamagata']
 AND coalesce(cardinality(t.operating_dates),0)=0 AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified' AND m.first_stop_sequence=0 AND m.last_stop_sequence=3 AND m.stop_offset=0;
 IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=sid)<>4 OR NOT EXISTS(SELECT 1 FROM published_train_number_evidence WHERE source_template_id=sid AND edition='2611' AND train_number='121B') THEN RAISE EXCEPTION 'legacy guard failed %',sid; END IF;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,seq,CASE WHEN arr IS NOT NULL THEN urn END,CASE WHEN dep IS NOT NULL THEN urn END,arr,dep FROM (VALUES (0,'odpt.Station:JR-East.TohokuShinkansen.Tokyo',NULL::text,'06:12'::text),
(1,'odpt.Station:JR-East.TohokuShinkansen.Ueno','06:17'::text,'06:18'::text),
(2,'odpt.Station:JR-East.TohokuShinkansen.Omiya','06:36'::text,'06:37'::text),
(3,'odpt.Station:JR-East.TohokuShinkansen.Utsunomiya','07:00'::text,'07:01'::text),
(4,'odpt.Station:JR-East.TohokuShinkansen.Koriyama','07:29'::text,'07:30'::text),
(5,'odpt.Station:JR-East.TohokuShinkansen.Fukushima','07:44'::text,'07:48'::text),
(6,'odpt.Station:JR-East.YamagataShinkansen.Yonezawa','08:20'::text,'08:21'::text),
(7,'odpt.Station:JR-East.YamagataShinkansen.Takahata','08:28'::text,'08:31'::text),
(8,'odpt.Station:JR-East.YamagataShinkansen.Akayu','08:35'::text,'08:36'::text),
(9,'odpt.Station:JR-East.YamagataShinkansen.Kaminoyama-Onsen','08:49'::text,'08:49'::text),
(10,'odpt.Station:JR-East.YamagataShinkansen.Yamagata','08:59'::text,'09:01'::text),
(11,'odpt.Station:JR-East.YamagataShinkansen.Tendo','09:17'::text,'09:17'::text),
(12,'odpt.Station:JR-East.YamagataShinkansen.Sakuranbo-Higashine','09:22'::text,'09:23'::text),
(13,'odpt.Station:JR-East.YamagataShinkansen.Murayama','09:27'::text,'09:27'::text),
(14,'odpt.Station:JR-East.YamagataShinkansen.Oishida','09:40'::text,'09:41'::text),
(15,'odpt.Station:JR-East.YamagataShinkansen.Shinjo','09:55'::text,NULL::text)) v(seq,urn,arr,dep)
 ON CONFLICT(template_id,stop_sequence) DO UPDATE SET arrival_station_urn=excluded.arrival_station_urn,departure_station_urn=excluded.departure_station_urn,arrival_clock=excluded.arrival_clock,departure_clock=excluded.departure_clock;
 UPDATE manual_timetable_templates SET destination_urns=ARRAY['odpt.Station:JR-East.YamagataShinkansen.Shinjo'] WHERE id=sid;
 UPDATE train_timetable_members SET last_stop_sequence=15 WHERE source_template_id=sid AND timetable_id=tid;
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>16 THEN RAISE EXCEPTION 'canonical length mismatch %',sid; END IF;
END $fix$;

-- 123M: https://timetables.jreast.co.jp/2611/train/000/001861.html
DO $fix$
DECLARE sid constant bigint:=1383; tid bigint;
BEGIN
 SELECT c.id INTO STRICT tid FROM manual_timetable_templates t JOIN train_timetable_members m ON m.source_template_id=t.id JOIN train_timetables c ON c.id=m.timetable_id
 WHERE t.id=sid AND t.line_key='TohokuShinkansen' AND t.train_number='Tsubasa123' AND t.destination_urns=ARRAY['odpt.Station:JR-East.TohokuShinkansen.Yamagata']
 AND coalesce(cardinality(t.operating_dates),0)=0 AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified' AND m.first_stop_sequence=0 AND m.last_stop_sequence=3 AND m.stop_offset=0;
 IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=sid)<>4 OR NOT EXISTS(SELECT 1 FROM published_train_number_evidence WHERE source_template_id=sid AND edition='2611' AND train_number='123M') THEN RAISE EXCEPTION 'legacy guard failed %',sid; END IF;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,seq,CASE WHEN arr IS NOT NULL THEN urn END,CASE WHEN dep IS NOT NULL THEN urn END,arr,dep FROM (VALUES (0,'odpt.Station:JR-East.TohokuShinkansen.Tokyo',NULL::text,'07:12'::text),
(1,'odpt.Station:JR-East.TohokuShinkansen.Ueno','07:17'::text,'07:18'::text),
(2,'odpt.Station:JR-East.TohokuShinkansen.Omiya','07:36'::text,'07:37'::text),
(3,'odpt.Station:JR-East.TohokuShinkansen.Utsunomiya','08:00'::text,'08:03'::text),
(4,'odpt.Station:JR-East.TohokuShinkansen.Koriyama','08:30'::text,'08:31'::text),
(5,'odpt.Station:JR-East.TohokuShinkansen.Fukushima','08:44'::text,'08:48'::text),
(6,'odpt.Station:JR-East.YamagataShinkansen.Yonezawa','09:20'::text,'09:23'::text),
(7,'odpt.Station:JR-East.YamagataShinkansen.Yamagata','09:53'::text,'09:55'::text),
(8,'odpt.Station:JR-East.YamagataShinkansen.Tendo','10:07'::text,'10:08'::text),
(9,'odpt.Station:JR-East.YamagataShinkansen.Sakuranbo-Higashine','10:13'::text,'10:16'::text),
(10,'odpt.Station:JR-East.YamagataShinkansen.Murayama','10:20'::text,'10:21'::text),
(11,'odpt.Station:JR-East.YamagataShinkansen.Oishida','10:29'::text,'10:31'::text),
(12,'odpt.Station:JR-East.YamagataShinkansen.Shinjo','10:46'::text,NULL::text)) v(seq,urn,arr,dep)
 ON CONFLICT(template_id,stop_sequence) DO UPDATE SET arrival_station_urn=excluded.arrival_station_urn,departure_station_urn=excluded.departure_station_urn,arrival_clock=excluded.arrival_clock,departure_clock=excluded.departure_clock;
 UPDATE manual_timetable_templates SET destination_urns=ARRAY['odpt.Station:JR-East.YamagataShinkansen.Shinjo'] WHERE id=sid;
 UPDATE train_timetable_members SET last_stop_sequence=12 WHERE source_template_id=sid AND timetable_id=tid;
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>13 THEN RAISE EXCEPTION 'canonical length mismatch %',sid; END IF;
END $fix$;

-- 137M: https://timetables.jreast.co.jp/2611/train/030/030121.html
DO $fix$
DECLARE sid constant bigint:=1385; tid bigint;
BEGIN
 SELECT c.id INTO STRICT tid FROM manual_timetable_templates t JOIN train_timetable_members m ON m.source_template_id=t.id JOIN train_timetables c ON c.id=m.timetable_id
 WHERE t.id=sid AND t.line_key='TohokuShinkansen' AND t.train_number='Tsubasa137' AND t.destination_urns=ARRAY['odpt.Station:JR-East.TohokuShinkansen.Yamagata']
 AND coalesce(cardinality(t.operating_dates),0)=0 AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified' AND m.first_stop_sequence=0 AND m.last_stop_sequence=3 AND m.stop_offset=0;
 IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=sid)<>4 OR NOT EXISTS(SELECT 1 FROM published_train_number_evidence WHERE source_template_id=sid AND edition='2611' AND train_number='137M') THEN RAISE EXCEPTION 'legacy guard failed %',sid; END IF;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,seq,CASE WHEN arr IS NOT NULL THEN urn END,CASE WHEN dep IS NOT NULL THEN urn END,arr,dep FROM (VALUES (0,'odpt.Station:JR-East.TohokuShinkansen.Tokyo',NULL::text,'12:00'::text),
(1,'odpt.Station:JR-East.TohokuShinkansen.Ueno','12:05'::text,'12:06'::text),
(2,'odpt.Station:JR-East.TohokuShinkansen.Omiya','12:24'::text,'12:25'::text),
(3,'odpt.Station:JR-East.TohokuShinkansen.Utsunomiya','12:48'::text,'12:49'::text),
(4,'odpt.Station:JR-East.TohokuShinkansen.Koriyama','13:17'::text,'13:18'::text),
(5,'odpt.Station:JR-East.TohokuShinkansen.Fukushima','13:31'::text,'13:35'::text),
(6,'odpt.Station:JR-East.YamagataShinkansen.Yonezawa','14:07'::text,'14:08'::text),
(7,'odpt.Station:JR-East.YamagataShinkansen.Akayu','14:19'::text,'14:20'::text),
(8,'odpt.Station:JR-East.YamagataShinkansen.Kaminoyama-Onsen','14:32'::text,'14:33'::text),
(9,'odpt.Station:JR-East.YamagataShinkansen.Yamagata','14:42'::text,'14:44'::text),
(10,'odpt.Station:JR-East.YamagataShinkansen.Tendo','14:55'::text,'14:55'::text),
(11,'odpt.Station:JR-East.YamagataShinkansen.Sakuranbo-Higashine','15:01'::text,'15:01'::text),
(12,'odpt.Station:JR-East.YamagataShinkansen.Murayama','15:06'::text,'15:07'::text),
(13,'odpt.Station:JR-East.YamagataShinkansen.Oishida','15:15'::text,'15:16'::text),
(14,'odpt.Station:JR-East.YamagataShinkansen.Shinjo','15:30'::text,NULL::text)) v(seq,urn,arr,dep)
 ON CONFLICT(template_id,stop_sequence) DO UPDATE SET arrival_station_urn=excluded.arrival_station_urn,departure_station_urn=excluded.departure_station_urn,arrival_clock=excluded.arrival_clock,departure_clock=excluded.departure_clock;
 UPDATE manual_timetable_templates SET destination_urns=ARRAY['odpt.Station:JR-East.YamagataShinkansen.Shinjo'] WHERE id=sid;
 UPDATE train_timetable_members SET last_stop_sequence=14 WHERE source_template_id=sid AND timetable_id=tid;
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>15 THEN RAISE EXCEPTION 'canonical length mismatch %',sid; END IF;
END $fix$;

-- 157M: https://timetables.jreast.co.jp/2611/train/025/029882.html
-- Fukushima departure 20:56 corroborated by legacy Yamagata 722 and 2612/train/025/029901.html; dates unverified.
DO $fix$
DECLARE sid constant bigint:=1391; tid bigint;
BEGIN
 SELECT c.id INTO STRICT tid FROM manual_timetable_templates t JOIN train_timetable_members m ON m.source_template_id=t.id JOIN train_timetables c ON c.id=m.timetable_id
 WHERE t.id=sid AND t.line_key='TohokuShinkansen' AND t.train_number='Tsubasa157' AND t.destination_urns=ARRAY['odpt.Station:JR-East.TohokuShinkansen.Yamagata']
 AND coalesce(cardinality(t.operating_dates),0)=0 AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified' AND m.first_stop_sequence=0 AND m.last_stop_sequence=3 AND m.stop_offset=0;
 IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=sid)<>4 OR NOT EXISTS(SELECT 1 FROM published_train_number_evidence WHERE source_template_id=sid AND edition='2611' AND train_number='157M') THEN RAISE EXCEPTION 'legacy guard failed %',sid; END IF;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,seq,CASE WHEN arr IS NOT NULL THEN urn END,CASE WHEN dep IS NOT NULL THEN urn END,arr,dep FROM (VALUES (0,'odpt.Station:JR-East.TohokuShinkansen.Tokyo',NULL::text,'19:16'::text),
(1,'odpt.Station:JR-East.TohokuShinkansen.Ueno','19:21'::text,'19:22'::text),
(2,'odpt.Station:JR-East.TohokuShinkansen.Omiya','19:40'::text,'19:41'::text),
(3,'odpt.Station:JR-East.TohokuShinkansen.Utsunomiya','20:04'::text,'20:08'::text),
(4,'odpt.Station:JR-East.TohokuShinkansen.Koriyama','20:38'::text,'20:39'::text),
(5,'odpt.Station:JR-East.TohokuShinkansen.Fukushima','20:53'::text,'20:56'::text),
(6,'odpt.Station:JR-East.YamagataShinkansen.Yonezawa','21:27'::text,'21:28'::text),
(7,'odpt.Station:JR-East.YamagataShinkansen.Yamagata','21:58'::text,'22:00'::text),
(8,'odpt.Station:JR-East.YamagataShinkansen.Tendo','22:09'::text,'22:10'::text),
(9,'odpt.Station:JR-East.YamagataShinkansen.Sakuranbo-Higashine','22:15'::text,'22:16'::text),
(10,'odpt.Station:JR-East.YamagataShinkansen.Murayama','22:20'::text,'22:21'::text),
(11,'odpt.Station:JR-East.YamagataShinkansen.Oishida','22:30'::text,'22:31'::text),
(12,'odpt.Station:JR-East.YamagataShinkansen.Shinjo','22:46'::text,NULL::text)) v(seq,urn,arr,dep)
 ON CONFLICT(template_id,stop_sequence) DO UPDATE SET arrival_station_urn=excluded.arrival_station_urn,departure_station_urn=excluded.departure_station_urn,arrival_clock=excluded.arrival_clock,departure_clock=excluded.departure_clock;
 UPDATE manual_timetable_templates SET destination_urns=ARRAY['odpt.Station:JR-East.YamagataShinkansen.Shinjo'] WHERE id=sid;
 UPDATE train_timetable_members SET last_stop_sequence=12 WHERE source_template_id=sid AND timetable_id=tid;
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>13 THEN RAISE EXCEPTION 'canonical length mismatch %',sid; END IF;
END $fix$;

-- 3027M: https://timetables.jreast.co.jp/2611/train/125/129781.html
DO $fix$
DECLARE sid constant bigint:=1368; tid bigint;
BEGIN
 SELECT c.id INTO STRICT tid FROM manual_timetable_templates t JOIN train_timetable_members m ON m.source_template_id=t.id JOIN train_timetables c ON c.id=m.timetable_id
 WHERE t.id=sid AND t.line_key='TohokuShinkansen' AND t.train_number='Komachi27' AND t.destination_urns=ARRAY['odpt.Station:JR-East.TohokuShinkansen.Akita']
 AND coalesce(cardinality(t.operating_dates),0)=0 AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified' AND m.first_stop_sequence=0 AND m.last_stop_sequence=4 AND m.stop_offset=0;
 IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=sid)<>5 OR NOT EXISTS(SELECT 1 FROM published_train_number_evidence WHERE source_template_id=sid AND edition='2611' AND train_number='3027M') THEN RAISE EXCEPTION 'legacy guard failed %',sid; END IF;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,seq,CASE WHEN arr IS NOT NULL THEN urn END,CASE WHEN dep IS NOT NULL THEN urn END,arr,dep FROM (VALUES (0,'odpt.Station:JR-East.TohokuShinkansen.Tokyo',NULL::text,'14:20'::text),
(1,'odpt.Station:JR-East.TohokuShinkansen.Ueno','14:25'::text,'14:26'::text),
(2,'odpt.Station:JR-East.TohokuShinkansen.Omiya','14:44'::text,'14:45'::text),
(3,'odpt.Station:JR-East.TohokuShinkansen.Sendai','15:51'::text,'15:53'::text),
(4,'odpt.Station:JR-East.TohokuShinkansen.Morioka','16:33'::text,'16:35'::text),
(5,'odpt.Station:JR-East.AkitaShinkansen.Tazawako','17:10'::text,'17:12'::text),
(6,'odpt.Station:JR-East.AkitaShinkansen.Kakunodate','17:28'::text,'17:28'::text),
(7,'odpt.Station:JR-East.AkitaShinkansen.Omagari','17:39'::text,'17:41'::text),
(8,'odpt.Station:JR-East.AkitaShinkansen.Akita','18:12'::text,NULL::text)) v(seq,urn,arr,dep)
 ON CONFLICT(template_id,stop_sequence) DO UPDATE SET arrival_station_urn=excluded.arrival_station_urn,departure_station_urn=excluded.departure_station_urn,arrival_clock=excluded.arrival_clock,departure_clock=excluded.departure_clock;
 UPDATE manual_timetable_templates SET destination_urns=ARRAY['odpt.Station:JR-East.AkitaShinkansen.Akita'] WHERE id=sid;
 UPDATE train_timetable_members SET last_stop_sequence=8 WHERE source_template_id=sid AND timetable_id=tid;
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>9 THEN RAISE EXCEPTION 'canonical length mismatch %',sid; END IF;
END $fix$;
COMMIT;