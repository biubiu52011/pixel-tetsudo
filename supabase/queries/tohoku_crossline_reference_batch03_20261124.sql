-- Undated reference itinerary repair; NOT a verified 2611 date-specific schedule.
-- 159M is from 2611 detail. Other six use 2612 detailed reference clocks, corroborated
-- by existing 2611 branch templates and 2611 number indexes; dates remain NULL.
-- 2611 3031M variants exist (e.g. 129795.html arrives Akita 19:18); do not merge.
-- Preserve original source identifiers, source-only canonical identity, and vehicle evidence.
-- Official source URLs here distinguish edition; no exact operating dates inferred.
BEGIN;
-- 3031M: https://timetables.jreast.co.jp/2612/train/125/129793.html
DO $fix$
DECLARE sid constant bigint:=1369; tid bigint;
BEGIN
 SELECT c.id INTO STRICT tid FROM manual_timetable_templates t JOIN train_timetable_members m ON m.source_template_id=t.id JOIN train_timetables c ON c.id=m.timetable_id
 WHERE t.id=sid AND t.line_key='TohokuShinkansen' AND t.train_number='Komachi31' AND t.destination_urns=ARRAY['odpt.Station:JR-East.TohokuShinkansen.Akita']
 AND coalesce(cardinality(t.operating_dates),0)=0 AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified' AND m.first_stop_sequence=0 AND m.last_stop_sequence=4 AND m.stop_offset=0;
 IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=sid)<>5
 OR NOT EXISTS(SELECT 1 FROM manual_timetable_template_stops WHERE template_id=sid AND stop_sequence=4 AND arrival_station_urn='odpt.Station:JR-East.TohokuShinkansen.Akita' AND arrival_clock='19:06')
 OR NOT EXISTS(SELECT 1 FROM published_train_number_evidence WHERE source_template_id=sid AND edition='2611' AND train_number='3031M') THEN RAISE EXCEPTION 'legacy guard failed %',sid; END IF;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,seq,CASE WHEN arr IS NOT NULL THEN urn END,CASE WHEN dep IS NOT NULL THEN urn END,arr,dep FROM (VALUES (0,'odpt.Station:JR-East.TohokuShinkansen.Tokyo',NULL::text,'15:20'::text),
(1,'odpt.Station:JR-East.TohokuShinkansen.Ueno','15:25'::text,'15:26'::text),
(2,'odpt.Station:JR-East.TohokuShinkansen.Omiya','15:44'::text,'15:45'::text),
(3,'odpt.Station:JR-East.TohokuShinkansen.Sendai','16:51'::text,'16:53'::text),
(4,'odpt.Station:JR-East.TohokuShinkansen.Morioka','17:32'::text,'17:35'::text),
(5,'odpt.Station:JR-East.AkitaShinkansen.Shizukuishi','17:48'::text,'17:48'::text),
(6,'odpt.Station:JR-East.AkitaShinkansen.Tazawako','18:08'::text,'18:09'::text),
(7,'odpt.Station:JR-East.AkitaShinkansen.Kakunodate','18:22'::text,'18:22'::text),
(8,'odpt.Station:JR-East.AkitaShinkansen.Omagari','18:32'::text,'18:34'::text),
(9,'odpt.Station:JR-East.AkitaShinkansen.Akita','19:06'::text,NULL::text)) v(seq,urn,arr,dep)
 ON CONFLICT(template_id,stop_sequence) DO UPDATE SET arrival_station_urn=excluded.arrival_station_urn,departure_station_urn=excluded.departure_station_urn,arrival_clock=excluded.arrival_clock,departure_clock=excluded.departure_clock;
 UPDATE manual_timetable_templates SET destination_urns=ARRAY['odpt.Station:JR-East.AkitaShinkansen.Akita'] WHERE id=sid;
 UPDATE train_timetable_members SET last_stop_sequence=9 WHERE source_template_id=sid AND timetable_id=tid;
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>10 THEN RAISE EXCEPTION 'canonical length mismatch %',sid; END IF;
END $fix$;

-- 3035M: https://timetables.jreast.co.jp/2612/train/030/030482.html
DO $fix$
DECLARE sid constant bigint:=1370; tid bigint;
BEGIN
 SELECT c.id INTO STRICT tid FROM manual_timetable_templates t JOIN train_timetable_members m ON m.source_template_id=t.id JOIN train_timetables c ON c.id=m.timetable_id
 WHERE t.id=sid AND t.line_key='TohokuShinkansen' AND t.train_number='Komachi35' AND t.destination_urns=ARRAY['odpt.Station:JR-East.TohokuShinkansen.Akita']
 AND coalesce(cardinality(t.operating_dates),0)=0 AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified' AND m.first_stop_sequence=0 AND m.last_stop_sequence=4 AND m.stop_offset=0;
 IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=sid)<>5
 OR NOT EXISTS(SELECT 1 FROM manual_timetable_template_stops WHERE template_id=sid AND stop_sequence=4 AND arrival_station_urn='odpt.Station:JR-East.TohokuShinkansen.Akita' AND arrival_clock='21:04')
 OR NOT EXISTS(SELECT 1 FROM published_train_number_evidence WHERE source_template_id=sid AND edition='2611' AND train_number='3035M') THEN RAISE EXCEPTION 'legacy guard failed %',sid; END IF;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,seq,CASE WHEN arr IS NOT NULL THEN urn END,CASE WHEN dep IS NOT NULL THEN urn END,arr,dep FROM (VALUES (0,'odpt.Station:JR-East.TohokuShinkansen.Tokyo',NULL::text,'17:20'::text),
(1,'odpt.Station:JR-East.TohokuShinkansen.Ueno','17:25'::text,'17:26'::text),
(2,'odpt.Station:JR-East.TohokuShinkansen.Omiya','17:44'::text,'17:45'::text),
(3,'odpt.Station:JR-East.TohokuShinkansen.Sendai','18:52'::text,'18:54'::text),
(4,'odpt.Station:JR-East.TohokuShinkansen.Morioka','19:33'::text,'19:35'::text),
(5,'odpt.Station:JR-East.AkitaShinkansen.Tazawako','20:07'::text,'20:07'::text),
(6,'odpt.Station:JR-East.AkitaShinkansen.Kakunodate','20:20'::text,'20:21'::text),
(7,'odpt.Station:JR-East.AkitaShinkansen.Omagari','20:31'::text,'20:33'::text),
(8,'odpt.Station:JR-East.AkitaShinkansen.Akita','21:04'::text,NULL::text)) v(seq,urn,arr,dep)
 ON CONFLICT(template_id,stop_sequence) DO UPDATE SET arrival_station_urn=excluded.arrival_station_urn,departure_station_urn=excluded.departure_station_urn,arrival_clock=excluded.arrival_clock,departure_clock=excluded.departure_clock;
 UPDATE manual_timetable_templates SET destination_urns=ARRAY['odpt.Station:JR-East.AkitaShinkansen.Akita'] WHERE id=sid;
 UPDATE train_timetable_members SET last_stop_sequence=8 WHERE source_template_id=sid AND timetable_id=tid;
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>9 THEN RAISE EXCEPTION 'canonical length mismatch %',sid; END IF;
END $fix$;

-- 139M: https://timetables.jreast.co.jp/2612/train/075/076101.html
DO $fix$
DECLARE sid constant bigint:=1386; tid bigint;
BEGIN
 SELECT c.id INTO STRICT tid FROM manual_timetable_templates t JOIN train_timetable_members m ON m.source_template_id=t.id JOIN train_timetables c ON c.id=m.timetable_id
 WHERE t.id=sid AND t.line_key='TohokuShinkansen' AND t.train_number='Tsubasa139' AND t.destination_urns=ARRAY['odpt.Station:JR-East.TohokuShinkansen.Yamagata']
 AND coalesce(cardinality(t.operating_dates),0)=0 AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified' AND m.first_stop_sequence=0 AND m.last_stop_sequence=3 AND m.stop_offset=0;
 IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=sid)<>4
 OR NOT EXISTS(SELECT 1 FROM manual_timetable_template_stops WHERE template_id=sid AND stop_sequence=3 AND arrival_station_urn='odpt.Station:JR-East.TohokuShinkansen.Yamagata' AND arrival_clock='15:50')
 OR NOT EXISTS(SELECT 1 FROM published_train_number_evidence WHERE source_template_id=sid AND edition='2611' AND train_number='139M') THEN RAISE EXCEPTION 'legacy guard failed %',sid; END IF;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,seq,CASE WHEN arr IS NOT NULL THEN urn END,CASE WHEN dep IS NOT NULL THEN urn END,arr,dep FROM (VALUES (0,'odpt.Station:JR-East.TohokuShinkansen.Tokyo',NULL::text,'13:00'::text),
(1,'odpt.Station:JR-East.TohokuShinkansen.Ueno','13:05'::text,'13:06'::text),
(2,'odpt.Station:JR-East.TohokuShinkansen.Omiya','13:24'::text,'13:25'::text),
(3,'odpt.Station:JR-East.TohokuShinkansen.Utsunomiya','13:48'::text,'13:49'::text),
(4,'odpt.Station:JR-East.TohokuShinkansen.Koriyama','14:17'::text,'14:18'::text),
(5,'odpt.Station:JR-East.TohokuShinkansen.Fukushima','14:31'::text,'14:35'::text),
(6,'odpt.Station:JR-East.YamagataShinkansen.Yonezawa','15:09'::text,'15:12'::text),
(7,'odpt.Station:JR-East.YamagataShinkansen.Takahata','15:19'::text,'15:20'::text),
(8,'odpt.Station:JR-East.YamagataShinkansen.Akayu','15:25'::text,'15:26'::text),
(9,'odpt.Station:JR-East.YamagataShinkansen.Kaminoyama-Onsen','15:40'::text,'15:40'::text),
(10,'odpt.Station:JR-East.YamagataShinkansen.Yamagata','15:50'::text,NULL::text)) v(seq,urn,arr,dep)
 ON CONFLICT(template_id,stop_sequence) DO UPDATE SET arrival_station_urn=excluded.arrival_station_urn,departure_station_urn=excluded.departure_station_urn,arrival_clock=excluded.arrival_clock,departure_clock=excluded.departure_clock;
 UPDATE manual_timetable_templates SET destination_urns=ARRAY['odpt.Station:JR-East.YamagataShinkansen.Yamagata'] WHERE id=sid;
 UPDATE train_timetable_members SET last_stop_sequence=10 WHERE source_template_id=sid AND timetable_id=tid;
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>11 THEN RAISE EXCEPTION 'canonical length mismatch %',sid; END IF;
END $fix$;

-- 141M: https://timetables.jreast.co.jp/2612/train/030/030131.html
DO $fix$
DECLARE sid constant bigint:=1387; tid bigint;
BEGIN
 SELECT c.id INTO STRICT tid FROM manual_timetable_templates t JOIN train_timetable_members m ON m.source_template_id=t.id JOIN train_timetables c ON c.id=m.timetable_id
 WHERE t.id=sid AND t.line_key='TohokuShinkansen' AND t.train_number='Tsubasa141' AND t.destination_urns=ARRAY['odpt.Station:JR-East.TohokuShinkansen.Yamagata']
 AND coalesce(cardinality(t.operating_dates),0)=0 AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified' AND m.first_stop_sequence=0 AND m.last_stop_sequence=3 AND m.stop_offset=0;
 IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=sid)<>4
 OR NOT EXISTS(SELECT 1 FROM manual_timetable_template_stops WHERE template_id=sid AND stop_sequence=3 AND arrival_station_urn='odpt.Station:JR-East.TohokuShinkansen.Yamagata' AND arrival_clock='16:49')
 OR NOT EXISTS(SELECT 1 FROM published_train_number_evidence WHERE source_template_id=sid AND edition='2611' AND train_number='141M') THEN RAISE EXCEPTION 'legacy guard failed %',sid; END IF;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,seq,CASE WHEN arr IS NOT NULL THEN urn END,CASE WHEN dep IS NOT NULL THEN urn END,arr,dep FROM (VALUES (0,'odpt.Station:JR-East.TohokuShinkansen.Tokyo',NULL::text,'14:00'::text),
(1,'odpt.Station:JR-East.TohokuShinkansen.Ueno','14:05'::text,'14:06'::text),
(2,'odpt.Station:JR-East.TohokuShinkansen.Omiya','14:24'::text,'14:25'::text),
(3,'odpt.Station:JR-East.TohokuShinkansen.Utsunomiya','14:48'::text,'14:49'::text),
(4,'odpt.Station:JR-East.TohokuShinkansen.Koriyama','15:17'::text,'15:18'::text),
(5,'odpt.Station:JR-East.TohokuShinkansen.Fukushima','15:31'::text,'15:35'::text),
(6,'odpt.Station:JR-East.YamagataShinkansen.Yonezawa','16:09'::text,'16:12'::text),
(7,'odpt.Station:JR-East.YamagataShinkansen.Akayu','16:26'::text,'16:27'::text),
(8,'odpt.Station:JR-East.YamagataShinkansen.Kaminoyama-Onsen','16:39'::text,'16:40'::text),
(9,'odpt.Station:JR-East.YamagataShinkansen.Yamagata','16:49'::text,'16:51'::text),
(10,'odpt.Station:JR-East.YamagataShinkansen.Tendo','17:02'::text,'17:03'::text),
(11,'odpt.Station:JR-East.YamagataShinkansen.Sakuranbo-Higashine','17:08'::text,'17:09'::text),
(12,'odpt.Station:JR-East.YamagataShinkansen.Murayama','17:13'::text,'17:14'::text),
(13,'odpt.Station:JR-East.YamagataShinkansen.Oishida','17:24'::text,'17:27'::text),
(14,'odpt.Station:JR-East.YamagataShinkansen.Shinjo','17:41'::text,NULL::text)) v(seq,urn,arr,dep)
 ON CONFLICT(template_id,stop_sequence) DO UPDATE SET arrival_station_urn=excluded.arrival_station_urn,departure_station_urn=excluded.departure_station_urn,arrival_clock=excluded.arrival_clock,departure_clock=excluded.departure_clock;
 UPDATE manual_timetable_templates SET destination_urns=ARRAY['odpt.Station:JR-East.YamagataShinkansen.Shinjo'] WHERE id=sid;
 UPDATE train_timetable_members SET last_stop_sequence=14 WHERE source_template_id=sid AND timetable_id=tid;
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>15 THEN RAISE EXCEPTION 'canonical length mismatch %',sid; END IF;
END $fix$;

-- 149M: https://timetables.jreast.co.jp/2612/train/030/033821.html
DO $fix$
DECLARE sid constant bigint:=1389; tid bigint;
BEGIN
 SELECT c.id INTO STRICT tid FROM manual_timetable_templates t JOIN train_timetable_members m ON m.source_template_id=t.id JOIN train_timetables c ON c.id=m.timetable_id
 WHERE t.id=sid AND t.line_key='TohokuShinkansen' AND t.train_number='Tsubasa149' AND t.destination_urns=ARRAY['odpt.Station:JR-East.TohokuShinkansen.Yamagata']
 AND coalesce(cardinality(t.operating_dates),0)=0 AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified' AND m.first_stop_sequence=0 AND m.last_stop_sequence=3 AND m.stop_offset=0;
 IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=sid)<>4
 OR NOT EXISTS(SELECT 1 FROM manual_timetable_template_stops WHERE template_id=sid AND stop_sequence=3 AND arrival_station_urn='odpt.Station:JR-East.TohokuShinkansen.Yamagata' AND arrival_clock='19:45')
 OR NOT EXISTS(SELECT 1 FROM published_train_number_evidence WHERE source_template_id=sid AND edition='2611' AND train_number='149M') THEN RAISE EXCEPTION 'legacy guard failed %',sid; END IF;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,seq,CASE WHEN arr IS NOT NULL THEN urn END,CASE WHEN dep IS NOT NULL THEN urn END,arr,dep FROM (VALUES (0,'odpt.Station:JR-East.TohokuShinkansen.Tokyo',NULL::text,'17:00'::text),
(1,'odpt.Station:JR-East.TohokuShinkansen.Ueno','17:05'::text,'17:06'::text),
(2,'odpt.Station:JR-East.TohokuShinkansen.Omiya','17:24'::text,'17:25'::text),
(3,'odpt.Station:JR-East.TohokuShinkansen.Utsunomiya','17:48'::text,'17:49'::text),
(4,'odpt.Station:JR-East.TohokuShinkansen.Koriyama','18:17'::text,'18:18'::text),
(5,'odpt.Station:JR-East.TohokuShinkansen.Fukushima','18:31'::text,'18:36'::text),
(6,'odpt.Station:JR-East.YamagataShinkansen.Yonezawa','19:08'::text,'19:09'::text),
(7,'odpt.Station:JR-East.YamagataShinkansen.Takahata','19:16'::text,'19:17'::text),
(8,'odpt.Station:JR-East.YamagataShinkansen.Akayu','19:22'::text,'19:22'::text),
(9,'odpt.Station:JR-East.YamagataShinkansen.Kaminoyama-Onsen','19:35'::text,'19:36'::text),
(10,'odpt.Station:JR-East.YamagataShinkansen.Yamagata','19:45'::text,NULL::text)) v(seq,urn,arr,dep)
 ON CONFLICT(template_id,stop_sequence) DO UPDATE SET arrival_station_urn=excluded.arrival_station_urn,departure_station_urn=excluded.departure_station_urn,arrival_clock=excluded.arrival_clock,departure_clock=excluded.departure_clock;
 UPDATE manual_timetable_templates SET destination_urns=ARRAY['odpt.Station:JR-East.YamagataShinkansen.Yamagata'] WHERE id=sid;
 UPDATE train_timetable_members SET last_stop_sequence=10 WHERE source_template_id=sid AND timetable_id=tid;
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>11 THEN RAISE EXCEPTION 'canonical length mismatch %',sid; END IF;
END $fix$;

-- 153M: https://timetables.jreast.co.jp/2612/train/030/033831.html
DO $fix$
DECLARE sid constant bigint:=1390; tid bigint;
BEGIN
 SELECT c.id INTO STRICT tid FROM manual_timetable_templates t JOIN train_timetable_members m ON m.source_template_id=t.id JOIN train_timetables c ON c.id=m.timetable_id
 WHERE t.id=sid AND t.line_key='TohokuShinkansen' AND t.train_number='Tsubasa153' AND t.destination_urns=ARRAY['odpt.Station:JR-East.TohokuShinkansen.Yamagata']
 AND coalesce(cardinality(t.operating_dates),0)=0 AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified' AND m.first_stop_sequence=0 AND m.last_stop_sequence=3 AND m.stop_offset=0;
 IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=sid)<>4
 OR NOT EXISTS(SELECT 1 FROM manual_timetable_template_stops WHERE template_id=sid AND stop_sequence=3 AND arrival_station_urn='odpt.Station:JR-East.TohokuShinkansen.Yamagata' AND arrival_clock='20:47')
 OR NOT EXISTS(SELECT 1 FROM published_train_number_evidence WHERE source_template_id=sid AND edition='2611' AND train_number='153M') THEN RAISE EXCEPTION 'legacy guard failed %',sid; END IF;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,seq,CASE WHEN arr IS NOT NULL THEN urn END,CASE WHEN dep IS NOT NULL THEN urn END,arr,dep FROM (VALUES (0,'odpt.Station:JR-East.TohokuShinkansen.Tokyo',NULL::text,'18:00'::text),
(1,'odpt.Station:JR-East.TohokuShinkansen.Ueno','18:05'::text,'18:06'::text),
(2,'odpt.Station:JR-East.TohokuShinkansen.Omiya','18:24'::text,'18:25'::text),
(3,'odpt.Station:JR-East.TohokuShinkansen.Utsunomiya','18:48'::text,'18:49'::text),
(4,'odpt.Station:JR-East.TohokuShinkansen.Koriyama','19:18'::text,'19:19'::text),
(5,'odpt.Station:JR-East.TohokuShinkansen.Fukushima','19:31'::text,'19:36'::text),
(6,'odpt.Station:JR-East.YamagataShinkansen.Yonezawa','20:09'::text,'20:11'::text),
(7,'odpt.Station:JR-East.YamagataShinkansen.Akayu','20:22'::text,'20:23'::text),
(8,'odpt.Station:JR-East.YamagataShinkansen.Kaminoyama-Onsen','20:37'::text,'20:38'::text),
(9,'odpt.Station:JR-East.YamagataShinkansen.Yamagata','20:47'::text,NULL::text)) v(seq,urn,arr,dep)
 ON CONFLICT(template_id,stop_sequence) DO UPDATE SET arrival_station_urn=excluded.arrival_station_urn,departure_station_urn=excluded.departure_station_urn,arrival_clock=excluded.arrival_clock,departure_clock=excluded.departure_clock;
 UPDATE manual_timetable_templates SET destination_urns=ARRAY['odpt.Station:JR-East.YamagataShinkansen.Yamagata'] WHERE id=sid;
 UPDATE train_timetable_members SET last_stop_sequence=9 WHERE source_template_id=sid AND timetable_id=tid;
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>10 THEN RAISE EXCEPTION 'canonical length mismatch %',sid; END IF;
END $fix$;

-- 159M: https://timetables.jreast.co.jp/2611/train/075/076091.html
DO $fix$
DECLARE sid constant bigint:=1392; tid bigint;
BEGIN
 SELECT c.id INTO STRICT tid FROM manual_timetable_templates t JOIN train_timetable_members m ON m.source_template_id=t.id JOIN train_timetables c ON c.id=m.timetable_id
 WHERE t.id=sid AND t.line_key='TohokuShinkansen' AND t.train_number='Tsubasa159' AND t.destination_urns=ARRAY['odpt.Station:JR-East.TohokuShinkansen.Yamagata']
 AND coalesce(cardinality(t.operating_dates),0)=0 AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified' AND m.first_stop_sequence=0 AND m.last_stop_sequence=3 AND m.stop_offset=0;
 IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=sid)<>4
 OR NOT EXISTS(SELECT 1 FROM manual_timetable_template_stops WHERE template_id=sid AND stop_sequence=3 AND arrival_station_urn='odpt.Station:JR-East.TohokuShinkansen.Yamagata' AND arrival_clock='23:26')
 OR NOT EXISTS(SELECT 1 FROM published_train_number_evidence WHERE source_template_id=sid AND edition='2611' AND train_number='159M') THEN RAISE EXCEPTION 'legacy guard failed %',sid; END IF;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,seq,CASE WHEN arr IS NOT NULL THEN urn END,CASE WHEN dep IS NOT NULL THEN urn END,arr,dep FROM (VALUES (0,'odpt.Station:JR-East.TohokuShinkansen.Tokyo',NULL::text,'20:44'::text),
(1,'odpt.Station:JR-East.TohokuShinkansen.Ueno','20:49'::text,'20:50'::text),
(2,'odpt.Station:JR-East.TohokuShinkansen.Omiya','21:08'::text,'21:09'::text),
(3,'odpt.Station:JR-East.TohokuShinkansen.Utsunomiya','21:32'::text,'21:33'::text),
(4,'odpt.Station:JR-East.TohokuShinkansen.Koriyama','22:01'::text,'22:02'::text),
(5,'odpt.Station:JR-East.TohokuShinkansen.Fukushima','22:15'::text,'22:18'::text),
(6,'odpt.Station:JR-East.YamagataShinkansen.Yonezawa','22:49'::text,'22:50'::text),
(7,'odpt.Station:JR-East.YamagataShinkansen.Takahata','22:57'::text,'22:58'::text),
(8,'odpt.Station:JR-East.YamagataShinkansen.Akayu','23:03'::text,'23:03'::text),
(9,'odpt.Station:JR-East.YamagataShinkansen.Kaminoyama-Onsen','23:17'::text,'23:17'::text),
(10,'odpt.Station:JR-East.YamagataShinkansen.Yamagata','23:26'::text,NULL::text)) v(seq,urn,arr,dep)
 ON CONFLICT(template_id,stop_sequence) DO UPDATE SET arrival_station_urn=excluded.arrival_station_urn,departure_station_urn=excluded.departure_station_urn,arrival_clock=excluded.arrival_clock,departure_clock=excluded.departure_clock;
 UPDATE manual_timetable_templates SET destination_urns=ARRAY['odpt.Station:JR-East.YamagataShinkansen.Yamagata'] WHERE id=sid;
 UPDATE train_timetable_members SET last_stop_sequence=10 WHERE source_template_id=sid AND timetable_id=tid;
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>11 THEN RAISE EXCEPTION 'canonical length mismatch %',sid; END IF;
END $fix$;
COMMIT;