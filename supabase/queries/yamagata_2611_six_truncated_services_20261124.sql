-- November 2026 official detail: all physical stops; match legacy clock evidence first.
-- Only 9086M/6094M have explicit dated schedules here. Four daily base schedules retain undated status pending date-variant audit.
-- 6094M terminates Ueno; separate 9094M must not be merged into this row.
BEGIN;
-- 9086M: https://timetables.jreast.co.jp/2611/train/025/025631.html
DO $fix$
DECLARE sid constant bigint:=727; tid bigint; n int;
DECLARE pref constant text:='odpt.Station:JR-East.YamagataShinkansen.';
BEGIN
 SELECT c.id INTO STRICT tid FROM manual_timetable_templates t JOIN train_timetable_members m ON m.source_template_id=t.id JOIN train_timetables c ON c.id=m.timetable_id
 WHERE t.id=sid AND t.line_key='YamagataShinkansen' AND t.train_number='つばさ86'
 AND t.destination_urns=ARRAY[pref||'Tokyo'] AND coalesce(cardinality(t.operating_dates),0)=0
 AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified'
 AND m.first_stop_sequence=0 AND m.last_stop_sequence=6 AND m.stop_offset=0;
 IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=sid)<>7
 OR NOT EXISTS(SELECT 1 FROM manual_timetable_template_stops WHERE template_id=sid AND stop_sequence=6 AND arrival_station_urn=pref||'Fukushima')
 OR NOT EXISTS(SELECT 1 FROM published_train_number_evidence WHERE source_template_id=sid AND edition='2611' AND train_number='9086M')
 THEN RAISE EXCEPTION 'Legacy guard failed for %',sid; END IF;
 IF EXISTS(SELECT 1 FROM manual_timetable_template_stops s WHERE s.template_id=sid AND NOT EXISTS(SELECT 1 FROM (VALUES (0,'Yamagata',NULL::text,'13:40'::text),
(1,'Kaminoyama-Onsen','13:49'::text,'13:49'::text),
(2,'Akayu','14:04'::text,'14:07'::text),
(3,'Takahata','14:13'::text,'14:16'::text),
(4,'Yonezawa','14:24'::text,'14:24'::text),
(5,'Fukushima','15:02'::text,'15:05'::text),
(6,'Utsunomiya','15:44'::text,'15:47'::text),
(7,'Omiya','16:11'::text,'16:12'::text),
(8,'Ueno','16:30'::text,'16:31'::text),
(9,'Tokyo','16:36'::text,NULL::text)) v(seq,station,arr,dep) WHERE pref||v.station=coalesce(s.arrival_station_urn,s.departure_station_urn) AND coalesce(s.arrival_clock,s.departure_clock) IN (v.arr,v.dep))) THEN RAISE EXCEPTION 'Old clock not in official detail for %',sid; END IF;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,seq,CASE WHEN arr IS NOT NULL THEN CASE WHEN station='Koriyama' THEN 'odpt.Station:JR-East.TohokuShinkansen.Koriyama' ELSE pref||station END END,CASE WHEN dep IS NOT NULL THEN CASE WHEN station='Koriyama' THEN 'odpt.Station:JR-East.TohokuShinkansen.Koriyama' ELSE pref||station END END,arr,dep FROM (VALUES (0,'Yamagata',NULL::text,'13:40'::text),
(1,'Kaminoyama-Onsen','13:49'::text,'13:49'::text),
(2,'Akayu','14:04'::text,'14:07'::text),
(3,'Takahata','14:13'::text,'14:16'::text),
(4,'Yonezawa','14:24'::text,'14:24'::text),
(5,'Fukushima','15:02'::text,'15:05'::text),
(6,'Utsunomiya','15:44'::text,'15:47'::text),
(7,'Omiya','16:11'::text,'16:12'::text),
(8,'Ueno','16:30'::text,'16:31'::text),
(9,'Tokyo','16:36'::text,NULL::text)) v(seq,station,arr,dep)
 ON CONFLICT(template_id,stop_sequence) DO UPDATE SET arrival_station_urn=excluded.arrival_station_urn, departure_station_urn=excluded.departure_station_urn,arrival_clock=excluded.arrival_clock,departure_clock=excluded.departure_clock;
 UPDATE train_timetable_members SET last_stop_sequence=9 WHERE source_template_id=sid AND timetable_id=tid;
 UPDATE manual_timetable_templates SET operating_dates=ARRAY['2026-11-01'::date,'2026-11-03'::date,'2026-11-06'::date,'2026-11-13'::date,'2026-11-20'::date,'2026-11-23'::date,'2026-11-27'::date],destination_urns=ARRAY[pref||'Tokyo'] WHERE id=sid;
UPDATE train_timetables SET timetable_validity='date_verified' WHERE id=tid;
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>10 THEN RAISE EXCEPTION 'Canonical length mismatch %',sid; END IF;
END $fix$;

-- 6094M: https://timetables.jreast.co.jp/2611/train/125/128301.html
DO $fix$
DECLARE sid constant bigint:=730; tid bigint; n int;
DECLARE pref constant text:='odpt.Station:JR-East.YamagataShinkansen.';
BEGIN
 SELECT c.id INTO STRICT tid FROM manual_timetable_templates t JOIN train_timetable_members m ON m.source_template_id=t.id JOIN train_timetables c ON c.id=m.timetable_id
 WHERE t.id=sid AND t.line_key='YamagataShinkansen' AND t.train_number='つばさ94'
 AND t.destination_urns=ARRAY[pref||'Tokyo'] AND coalesce(cardinality(t.operating_dates),0)=0
 AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified'
 AND m.first_stop_sequence=0 AND m.last_stop_sequence=6 AND m.stop_offset=0;
 IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=sid)<>7
 OR NOT EXISTS(SELECT 1 FROM manual_timetable_template_stops WHERE template_id=sid AND stop_sequence=6 AND arrival_station_urn=pref||'Fukushima')
 OR NOT EXISTS(SELECT 1 FROM published_train_number_evidence WHERE source_template_id=sid AND edition='2611' AND train_number='6094M')
 THEN RAISE EXCEPTION 'Legacy guard failed for %',sid; END IF;
 IF EXISTS(SELECT 1 FROM manual_timetable_template_stops s WHERE s.template_id=sid AND NOT EXISTS(SELECT 1 FROM (VALUES (0,'Yamagata',NULL::text,'19:03'::text),
(1,'Kaminoyama-Onsen','19:12'::text,'19:12'::text),
(2,'Akayu','19:26'::text,'19:26'::text),
(3,'Takahata','19:31'::text,'19:31'::text),
(4,'Yonezawa','19:38'::text,'19:39'::text),
(5,'Fukushima','20:13'::text,'20:16'::text),
(6,'Omiya','21:14'::text,'21:15'::text),
(7,'Ueno','21:34'::text,NULL::text)) v(seq,station,arr,dep) WHERE pref||v.station=coalesce(s.arrival_station_urn,s.departure_station_urn) AND coalesce(s.arrival_clock,s.departure_clock) IN (v.arr,v.dep))) THEN RAISE EXCEPTION 'Old clock not in official detail for %',sid; END IF;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,seq,CASE WHEN arr IS NOT NULL THEN CASE WHEN station='Koriyama' THEN 'odpt.Station:JR-East.TohokuShinkansen.Koriyama' ELSE pref||station END END,CASE WHEN dep IS NOT NULL THEN CASE WHEN station='Koriyama' THEN 'odpt.Station:JR-East.TohokuShinkansen.Koriyama' ELSE pref||station END END,arr,dep FROM (VALUES (0,'Yamagata',NULL::text,'19:03'::text),
(1,'Kaminoyama-Onsen','19:12'::text,'19:12'::text),
(2,'Akayu','19:26'::text,'19:26'::text),
(3,'Takahata','19:31'::text,'19:31'::text),
(4,'Yonezawa','19:38'::text,'19:39'::text),
(5,'Fukushima','20:13'::text,'20:16'::text),
(6,'Omiya','21:14'::text,'21:15'::text),
(7,'Ueno','21:34'::text,NULL::text)) v(seq,station,arr,dep)
 ON CONFLICT(template_id,stop_sequence) DO UPDATE SET arrival_station_urn=excluded.arrival_station_urn, departure_station_urn=excluded.departure_station_urn,arrival_clock=excluded.arrival_clock,departure_clock=excluded.departure_clock;
 UPDATE train_timetable_members SET last_stop_sequence=7 WHERE source_template_id=sid AND timetable_id=tid;
 UPDATE manual_timetable_templates SET operating_dates=ARRAY['2026-11-20'::date,'2026-11-23'::date],destination_urns=ARRAY[pref||'Ueno'] WHERE id=sid;
UPDATE train_timetables SET timetable_validity='date_verified' WHERE id=tid;
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>8 THEN RAISE EXCEPTION 'Canonical length mismatch %',sid; END IF;
END $fix$;

-- 136M: https://timetables.jreast.co.jp/2611/train/030/030251.html
DO $fix$
DECLARE sid constant bigint:=735; tid bigint; n int;
DECLARE pref constant text:='odpt.Station:JR-East.YamagataShinkansen.';
BEGIN
 SELECT c.id INTO STRICT tid FROM manual_timetable_templates t JOIN train_timetable_members m ON m.source_template_id=t.id JOIN train_timetables c ON c.id=m.timetable_id
 WHERE t.id=sid AND t.line_key='YamagataShinkansen' AND t.train_number='つばさ136'
 AND t.destination_urns=ARRAY[pref||'Tokyo'] AND coalesce(cardinality(t.operating_dates),0)=0
 AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified'
 AND m.first_stop_sequence=0 AND m.last_stop_sequence=11 AND m.stop_offset=0;
 IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=sid)<>12
 OR NOT EXISTS(SELECT 1 FROM manual_timetable_template_stops WHERE template_id=sid AND stop_sequence=11 AND arrival_station_urn=pref||'Fukushima')
 OR NOT EXISTS(SELECT 1 FROM published_train_number_evidence WHERE source_template_id=sid AND edition='2611' AND train_number='136M')
 THEN RAISE EXCEPTION 'Legacy guard failed for %',sid; END IF;
 IF EXISTS(SELECT 1 FROM manual_timetable_template_stops s WHERE s.template_id=sid AND NOT EXISTS(SELECT 1 FROM (VALUES (0,'Shinjo',NULL::text,'09:15'::text),
(1,'Oishida','09:30'::text,'09:31'::text),
(2,'Murayama','09:39'::text,'09:40'::text),
(3,'Sakuranbo-Higashine','09:44'::text,'09:44'::text),
(4,'Tendo','09:49'::text,'09:50'::text),
(5,'Yamagata','10:02'::text,'10:04'::text),
(6,'Kaminoyama-Onsen','10:12'::text,'10:13'::text),
(7,'Akayu','10:26'::text,'10:27'::text),
(8,'Yonezawa','10:36'::text,'10:37'::text),
(9,'Fukushima','11:12'::text,'11:15'::text),
(10,'Koriyama','11:29'::text,'11:30'::text),
(11,'Utsunomiya','11:57'::text,'11:58'::text),
(12,'Omiya','12:23'::text,'12:24'::text),
(13,'Ueno','12:42'::text,'12:43'::text),
(14,'Tokyo','12:48'::text,NULL::text)) v(seq,station,arr,dep) WHERE pref||v.station=coalesce(s.arrival_station_urn,s.departure_station_urn) AND coalesce(s.arrival_clock,s.departure_clock) IN (v.arr,v.dep))) THEN RAISE EXCEPTION 'Old clock not in official detail for %',sid; END IF;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,seq,CASE WHEN arr IS NOT NULL THEN CASE WHEN station='Koriyama' THEN 'odpt.Station:JR-East.TohokuShinkansen.Koriyama' ELSE pref||station END END,CASE WHEN dep IS NOT NULL THEN CASE WHEN station='Koriyama' THEN 'odpt.Station:JR-East.TohokuShinkansen.Koriyama' ELSE pref||station END END,arr,dep FROM (VALUES (0,'Shinjo',NULL::text,'09:15'::text),
(1,'Oishida','09:30'::text,'09:31'::text),
(2,'Murayama','09:39'::text,'09:40'::text),
(3,'Sakuranbo-Higashine','09:44'::text,'09:44'::text),
(4,'Tendo','09:49'::text,'09:50'::text),
(5,'Yamagata','10:02'::text,'10:04'::text),
(6,'Kaminoyama-Onsen','10:12'::text,'10:13'::text),
(7,'Akayu','10:26'::text,'10:27'::text),
(8,'Yonezawa','10:36'::text,'10:37'::text),
(9,'Fukushima','11:12'::text,'11:15'::text),
(10,'Koriyama','11:29'::text,'11:30'::text),
(11,'Utsunomiya','11:57'::text,'11:58'::text),
(12,'Omiya','12:23'::text,'12:24'::text),
(13,'Ueno','12:42'::text,'12:43'::text),
(14,'Tokyo','12:48'::text,NULL::text)) v(seq,station,arr,dep)
 ON CONFLICT(template_id,stop_sequence) DO UPDATE SET arrival_station_urn=excluded.arrival_station_urn, departure_station_urn=excluded.departure_station_urn,arrival_clock=excluded.arrival_clock,departure_clock=excluded.departure_clock;
 UPDATE train_timetable_members SET last_stop_sequence=14 WHERE source_template_id=sid AND timetable_id=tid;
 
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>15 THEN RAISE EXCEPTION 'Canonical length mismatch %',sid; END IF;
END $fix$;

-- 148M: https://timetables.jreast.co.jp/2611/train/030/030191.html
DO $fix$
DECLARE sid constant bigint:=741; tid bigint; n int;
DECLARE pref constant text:='odpt.Station:JR-East.YamagataShinkansen.';
BEGIN
 SELECT c.id INTO STRICT tid FROM manual_timetable_templates t JOIN train_timetable_members m ON m.source_template_id=t.id JOIN train_timetables c ON c.id=m.timetable_id
 WHERE t.id=sid AND t.line_key='YamagataShinkansen' AND t.train_number='つばさ148'
 AND t.destination_urns=ARRAY[pref||'Tokyo'] AND coalesce(cardinality(t.operating_dates),0)=0
 AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified'
 AND m.first_stop_sequence=0 AND m.last_stop_sequence=5 AND m.stop_offset=0;
 IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=sid)<>6
 OR NOT EXISTS(SELECT 1 FROM manual_timetable_template_stops WHERE template_id=sid AND stop_sequence=5 AND arrival_station_urn=pref||'Fukushima')
 OR NOT EXISTS(SELECT 1 FROM published_train_number_evidence WHERE source_template_id=sid AND edition='2611' AND train_number='148M')
 THEN RAISE EXCEPTION 'Legacy guard failed for %',sid; END IF;
 IF EXISTS(SELECT 1 FROM manual_timetable_template_stops s WHERE s.template_id=sid AND NOT EXISTS(SELECT 1 FROM (VALUES (0,'Yamagata',NULL::text,'15:46'::text),
(1,'Kaminoyama-Onsen','15:55'::text,'15:56'::text),
(2,'Akayu','16:11'::text,'16:12'::text),
(3,'Yonezawa','16:22'::text,'16:23'::text),
(4,'Fukushima','17:00'::text,'17:02'::text),
(5,'Koriyama','17:15'::text,'17:16'::text),
(6,'Utsunomiya','17:44'::text,'17:47'::text),
(7,'Omiya','18:11'::text,'18:12'::text),
(8,'Ueno','18:30'::text,'18:31'::text),
(9,'Tokyo','18:36'::text,NULL::text)) v(seq,station,arr,dep) WHERE pref||v.station=coalesce(s.arrival_station_urn,s.departure_station_urn) AND coalesce(s.arrival_clock,s.departure_clock) IN (v.arr,v.dep))) THEN RAISE EXCEPTION 'Old clock not in official detail for %',sid; END IF;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,seq,CASE WHEN arr IS NOT NULL THEN CASE WHEN station='Koriyama' THEN 'odpt.Station:JR-East.TohokuShinkansen.Koriyama' ELSE pref||station END END,CASE WHEN dep IS NOT NULL THEN CASE WHEN station='Koriyama' THEN 'odpt.Station:JR-East.TohokuShinkansen.Koriyama' ELSE pref||station END END,arr,dep FROM (VALUES (0,'Yamagata',NULL::text,'15:46'::text),
(1,'Kaminoyama-Onsen','15:55'::text,'15:56'::text),
(2,'Akayu','16:11'::text,'16:12'::text),
(3,'Yonezawa','16:22'::text,'16:23'::text),
(4,'Fukushima','17:00'::text,'17:02'::text),
(5,'Koriyama','17:15'::text,'17:16'::text),
(6,'Utsunomiya','17:44'::text,'17:47'::text),
(7,'Omiya','18:11'::text,'18:12'::text),
(8,'Ueno','18:30'::text,'18:31'::text),
(9,'Tokyo','18:36'::text,NULL::text)) v(seq,station,arr,dep)
 ON CONFLICT(template_id,stop_sequence) DO UPDATE SET arrival_station_urn=excluded.arrival_station_urn, departure_station_urn=excluded.departure_station_urn,arrival_clock=excluded.arrival_clock,departure_clock=excluded.departure_clock;
 UPDATE train_timetable_members SET last_stop_sequence=9 WHERE source_template_id=sid AND timetable_id=tid;
 
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>10 THEN RAISE EXCEPTION 'Canonical length mismatch %',sid; END IF;
END $fix$;

-- 158M: https://timetables.jreast.co.jp/2611/train/030/030152.html
DO $fix$
DECLARE sid constant bigint:=745; tid bigint; n int;
DECLARE pref constant text:='odpt.Station:JR-East.YamagataShinkansen.';
BEGIN
 SELECT c.id INTO STRICT tid FROM manual_timetable_templates t JOIN train_timetable_members m ON m.source_template_id=t.id JOIN train_timetables c ON c.id=m.timetable_id
 WHERE t.id=sid AND t.line_key='YamagataShinkansen' AND t.train_number='つばさ158'
 AND t.destination_urns=ARRAY[pref||'Tokyo'] AND coalesce(cardinality(t.operating_dates),0)=0
 AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified'
 AND m.first_stop_sequence=0 AND m.last_stop_sequence=12 AND m.stop_offset=0;
 IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=sid)<>13
 OR NOT EXISTS(SELECT 1 FROM manual_timetable_template_stops WHERE template_id=sid AND stop_sequence=12 AND arrival_station_urn=pref||'Fukushima')
 OR NOT EXISTS(SELECT 1 FROM published_train_number_evidence WHERE source_template_id=sid AND edition='2611' AND train_number='158M')
 THEN RAISE EXCEPTION 'Legacy guard failed for %',sid; END IF;
 IF EXISTS(SELECT 1 FROM manual_timetable_template_stops s WHERE s.template_id=sid AND NOT EXISTS(SELECT 1 FROM (VALUES (0,'Shinjo',NULL::text,'18:43'::text),
(1,'Oishida','18:58'::text,'18:58'::text),
(2,'Murayama','19:06'::text,'19:07'::text),
(3,'Sakuranbo-Higashine','19:11'::text,'19:11'::text),
(4,'Tendo','19:17'::text,'19:19'::text),
(5,'Yamagata','19:29'::text,'19:31'::text),
(6,'Kaminoyama-Onsen','19:40'::text,'19:41'::text),
(7,'Akayu','19:56'::text,'19:56'::text),
(8,'Takahata','20:01'::text,'20:04'::text),
(9,'Yonezawa','20:11'::text,'20:12'::text),
(10,'Fukushima','20:47'::text,'20:49'::text),
(11,'Koriyama','21:04'::text,'21:05'::text),
(12,'Utsunomiya','21:34'::text,'21:35'::text),
(13,'Omiya','21:59'::text,'22:00'::text),
(14,'Ueno','22:18'::text,'22:19'::text),
(15,'Tokyo','22:24'::text,NULL::text)) v(seq,station,arr,dep) WHERE pref||v.station=coalesce(s.arrival_station_urn,s.departure_station_urn) AND coalesce(s.arrival_clock,s.departure_clock) IN (v.arr,v.dep))) THEN RAISE EXCEPTION 'Old clock not in official detail for %',sid; END IF;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,seq,CASE WHEN arr IS NOT NULL THEN CASE WHEN station='Koriyama' THEN 'odpt.Station:JR-East.TohokuShinkansen.Koriyama' ELSE pref||station END END,CASE WHEN dep IS NOT NULL THEN CASE WHEN station='Koriyama' THEN 'odpt.Station:JR-East.TohokuShinkansen.Koriyama' ELSE pref||station END END,arr,dep FROM (VALUES (0,'Shinjo',NULL::text,'18:43'::text),
(1,'Oishida','18:58'::text,'18:58'::text),
(2,'Murayama','19:06'::text,'19:07'::text),
(3,'Sakuranbo-Higashine','19:11'::text,'19:11'::text),
(4,'Tendo','19:17'::text,'19:19'::text),
(5,'Yamagata','19:29'::text,'19:31'::text),
(6,'Kaminoyama-Onsen','19:40'::text,'19:41'::text),
(7,'Akayu','19:56'::text,'19:56'::text),
(8,'Takahata','20:01'::text,'20:04'::text),
(9,'Yonezawa','20:11'::text,'20:12'::text),
(10,'Fukushima','20:47'::text,'20:49'::text),
(11,'Koriyama','21:04'::text,'21:05'::text),
(12,'Utsunomiya','21:34'::text,'21:35'::text),
(13,'Omiya','21:59'::text,'22:00'::text),
(14,'Ueno','22:18'::text,'22:19'::text),
(15,'Tokyo','22:24'::text,NULL::text)) v(seq,station,arr,dep)
 ON CONFLICT(template_id,stop_sequence) DO UPDATE SET arrival_station_urn=excluded.arrival_station_urn, departure_station_urn=excluded.departure_station_urn,arrival_clock=excluded.arrival_clock,departure_clock=excluded.departure_clock;
 UPDATE train_timetable_members SET last_stop_sequence=15 WHERE source_template_id=sid AND timetable_id=tid;
 
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>16 THEN RAISE EXCEPTION 'Canonical length mismatch %',sid; END IF;
END $fix$;

-- 160M: https://timetables.jreast.co.jp/2611/train/030/030141.html
DO $fix$
DECLARE sid constant bigint:=746; tid bigint; n int;
DECLARE pref constant text:='odpt.Station:JR-East.YamagataShinkansen.';
BEGIN
 SELECT c.id INTO STRICT tid FROM manual_timetable_templates t JOIN train_timetable_members m ON m.source_template_id=t.id JOIN train_timetables c ON c.id=m.timetable_id
 WHERE t.id=sid AND t.line_key='YamagataShinkansen' AND t.train_number='つばさ160'
 AND t.destination_urns=ARRAY[pref||'Tokyo'] AND coalesce(cardinality(t.operating_dates),0)=0
 AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified'
 AND m.first_stop_sequence=0 AND m.last_stop_sequence=11 AND m.stop_offset=0;
 IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=sid)<>12
 OR NOT EXISTS(SELECT 1 FROM manual_timetable_template_stops WHERE template_id=sid AND stop_sequence=11 AND arrival_station_urn=pref||'Fukushima')
 OR NOT EXISTS(SELECT 1 FROM published_train_number_evidence WHERE source_template_id=sid AND edition='2611' AND train_number='160M')
 THEN RAISE EXCEPTION 'Legacy guard failed for %',sid; END IF;
 IF EXISTS(SELECT 1 FROM manual_timetable_template_stops s WHERE s.template_id=sid AND NOT EXISTS(SELECT 1 FROM (VALUES (0,'Shinjo',NULL::text,'19:57'::text),
(1,'Oishida','20:11'::text,'20:12'::text),
(2,'Murayama','20:20'::text,'20:20'::text),
(3,'Sakuranbo-Higashine','20:24'::text,'20:25'::text),
(4,'Tendo','20:30'::text,'20:30'::text),
(5,'Yamagata','20:41'::text,'20:43'::text),
(6,'Kaminoyama-Onsen','20:52'::text,'20:53'::text),
(7,'Akayu','21:07'::text,'21:07'::text),
(8,'Yonezawa','21:17'::text,'21:17'::text),
(9,'Fukushima','21:52'::text,'21:56'::text),
(10,'Koriyama','22:09'::text,'22:10'::text),
(11,'Utsunomiya','22:37'::text,'22:38'::text),
(12,'Omiya','23:03'::text,'23:04'::text),
(13,'Ueno','23:22'::text,'23:23'::text),
(14,'Tokyo','23:28'::text,NULL::text)) v(seq,station,arr,dep) WHERE pref||v.station=coalesce(s.arrival_station_urn,s.departure_station_urn) AND coalesce(s.arrival_clock,s.departure_clock) IN (v.arr,v.dep))) THEN RAISE EXCEPTION 'Old clock not in official detail for %',sid; END IF;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,seq,CASE WHEN arr IS NOT NULL THEN CASE WHEN station='Koriyama' THEN 'odpt.Station:JR-East.TohokuShinkansen.Koriyama' ELSE pref||station END END,CASE WHEN dep IS NOT NULL THEN CASE WHEN station='Koriyama' THEN 'odpt.Station:JR-East.TohokuShinkansen.Koriyama' ELSE pref||station END END,arr,dep FROM (VALUES (0,'Shinjo',NULL::text,'19:57'::text),
(1,'Oishida','20:11'::text,'20:12'::text),
(2,'Murayama','20:20'::text,'20:20'::text),
(3,'Sakuranbo-Higashine','20:24'::text,'20:25'::text),
(4,'Tendo','20:30'::text,'20:30'::text),
(5,'Yamagata','20:41'::text,'20:43'::text),
(6,'Kaminoyama-Onsen','20:52'::text,'20:53'::text),
(7,'Akayu','21:07'::text,'21:07'::text),
(8,'Yonezawa','21:17'::text,'21:17'::text),
(9,'Fukushima','21:52'::text,'21:56'::text),
(10,'Koriyama','22:09'::text,'22:10'::text),
(11,'Utsunomiya','22:37'::text,'22:38'::text),
(12,'Omiya','23:03'::text,'23:04'::text),
(13,'Ueno','23:22'::text,'23:23'::text),
(14,'Tokyo','23:28'::text,NULL::text)) v(seq,station,arr,dep)
 ON CONFLICT(template_id,stop_sequence) DO UPDATE SET arrival_station_urn=excluded.arrival_station_urn, departure_station_urn=excluded.departure_station_urn,arrival_clock=excluded.arrival_clock,departure_clock=excluded.departure_clock;
 UPDATE train_timetable_members SET last_stop_sequence=14 WHERE source_template_id=sid AND timetable_id=tid;
 
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>15 THEN RAISE EXCEPTION 'Canonical length mismatch %',sid; END IF;
END $fix$;
COMMIT;