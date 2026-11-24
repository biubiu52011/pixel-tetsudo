-- 2611 reference itinerary completion, matching the old terminal clocks.
-- No operating dates or exact formation assertions; retain source-only canonical identities.
BEGIN;
-- 135M: https://timetables.jreast.co.jp/2611/train/030/030131.html
DO $fix$
DECLARE sid constant bigint:=1384; tid bigint;
BEGIN
 SELECT c.id INTO STRICT tid FROM manual_timetable_templates t JOIN train_timetable_members m ON m.source_template_id=t.id JOIN train_timetables c ON c.id=m.timetable_id
 WHERE t.id=sid AND t.line_key='TohokuShinkansen' AND t.train_number='Tsubasa135' AND t.destination_urns=ARRAY['odpt.Station:JR-East.TohokuShinkansen.Yamagata']
 AND coalesce(cardinality(t.operating_dates),0)=0 AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified' AND m.first_stop_sequence=0 AND m.last_stop_sequence=3 AND m.stop_offset=0;
 IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=sid)<>4 OR NOT EXISTS(SELECT 1 FROM published_train_number_evidence WHERE source_template_id=sid AND edition='2611' AND train_number='135M') THEN RAISE EXCEPTION 'legacy guard failed %',sid; END IF;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,seq,CASE WHEN arr IS NOT NULL THEN urn END,CASE WHEN dep IS NOT NULL THEN urn END,arr,dep FROM (VALUES (0,'odpt.Station:JR-East.TohokuShinkansen.Tokyo',NULL::text,'11:00'::text),
(1,'odpt.Station:JR-East.TohokuShinkansen.Ueno','11:05'::text,'11:06'::text),
(2,'odpt.Station:JR-East.TohokuShinkansen.Omiya','11:24'::text,'11:25'::text),
(3,'odpt.Station:JR-East.TohokuShinkansen.Utsunomiya','11:48'::text,'11:49'::text),
(4,'odpt.Station:JR-East.TohokuShinkansen.Koriyama','12:17'::text,'12:18'::text),
(5,'odpt.Station:JR-East.TohokuShinkansen.Fukushima','12:31'::text,'12:35'::text),
(6,'odpt.Station:JR-East.YamagataShinkansen.Yonezawa','13:06'::text,'13:07'::text),
(7,'odpt.Station:JR-East.YamagataShinkansen.Takahata','13:14'::text,'13:15'::text),
(8,'odpt.Station:JR-East.YamagataShinkansen.Akayu','13:20'::text,'13:20'::text),
(9,'odpt.Station:JR-East.YamagataShinkansen.Kaminoyama-Onsen','13:34'::text,'13:34'::text),
(10,'odpt.Station:JR-East.YamagataShinkansen.Yamagata','13:44'::text,NULL::text)) v(seq,urn,arr,dep)
 ON CONFLICT(template_id,stop_sequence) DO UPDATE SET arrival_station_urn=excluded.arrival_station_urn,departure_station_urn=excluded.departure_station_urn,arrival_clock=excluded.arrival_clock,departure_clock=excluded.departure_clock;
 UPDATE manual_timetable_templates SET destination_urns=ARRAY['odpt.Station:JR-East.YamagataShinkansen.Yamagata'] WHERE id=sid;
 UPDATE train_timetable_members SET last_stop_sequence=10 WHERE source_template_id=sid AND timetable_id=tid;
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>11 THEN RAISE EXCEPTION 'canonical length mismatch %',sid; END IF;
END $fix$;

-- 143M: https://timetables.jreast.co.jp/2611/train/030/030101.html
DO $fix$
DECLARE sid constant bigint:=1388; tid bigint;
BEGIN
 SELECT c.id INTO STRICT tid FROM manual_timetable_templates t JOIN train_timetable_members m ON m.source_template_id=t.id JOIN train_timetables c ON c.id=m.timetable_id
 WHERE t.id=sid AND t.line_key='TohokuShinkansen' AND t.train_number='Tsubasa143' AND t.destination_urns=ARRAY['odpt.Station:JR-East.TohokuShinkansen.Yamagata']
 AND coalesce(cardinality(t.operating_dates),0)=0 AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified' AND m.first_stop_sequence=0 AND m.last_stop_sequence=3 AND m.stop_offset=0;
 IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=sid)<>4 OR NOT EXISTS(SELECT 1 FROM published_train_number_evidence WHERE source_template_id=sid AND edition='2611' AND train_number='143M') THEN RAISE EXCEPTION 'legacy guard failed %',sid; END IF;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,seq,CASE WHEN arr IS NOT NULL THEN urn END,CASE WHEN dep IS NOT NULL THEN urn END,arr,dep FROM (VALUES (0,'odpt.Station:JR-East.TohokuShinkansen.Tokyo',NULL::text,'15:00'::text),
(1,'odpt.Station:JR-East.TohokuShinkansen.Ueno','15:05'::text,'15:06'::text),
(2,'odpt.Station:JR-East.TohokuShinkansen.Omiya','15:24'::text,'15:25'::text),
(3,'odpt.Station:JR-East.TohokuShinkansen.Utsunomiya','15:48'::text,'15:49'::text),
(4,'odpt.Station:JR-East.TohokuShinkansen.Koriyama','16:17'::text,'16:18'::text),
(5,'odpt.Station:JR-East.TohokuShinkansen.Fukushima','16:31'::text,'16:35'::text),
(6,'odpt.Station:JR-East.YamagataShinkansen.Yonezawa','17:06'::text,'17:06'::text),
(7,'odpt.Station:JR-East.YamagataShinkansen.Takahata','17:16'::text,'17:17'::text),
(8,'odpt.Station:JR-East.YamagataShinkansen.Akayu','17:21'::text,'17:22'::text),
(9,'odpt.Station:JR-East.YamagataShinkansen.Kaminoyama-Onsen','17:35'::text,'17:36'::text),
(10,'odpt.Station:JR-East.YamagataShinkansen.Yamagata','17:45'::text,NULL::text)) v(seq,urn,arr,dep)
 ON CONFLICT(template_id,stop_sequence) DO UPDATE SET arrival_station_urn=excluded.arrival_station_urn,departure_station_urn=excluded.departure_station_urn,arrival_clock=excluded.arrival_clock,departure_clock=excluded.departure_clock;
 UPDATE manual_timetable_templates SET destination_urns=ARRAY['odpt.Station:JR-East.YamagataShinkansen.Yamagata'] WHERE id=sid;
 UPDATE train_timetable_members SET last_stop_sequence=10 WHERE source_template_id=sid AND timetable_id=tid;
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>11 THEN RAISE EXCEPTION 'canonical length mismatch %',sid; END IF;
END $fix$;

-- 3037M: https://timetables.jreast.co.jp/2611/train/110/111182.html
DO $fix$
DECLARE sid constant bigint:=1371; tid bigint;
BEGIN
 SELECT c.id INTO STRICT tid FROM manual_timetable_templates t JOIN train_timetable_members m ON m.source_template_id=t.id JOIN train_timetables c ON c.id=m.timetable_id
 WHERE t.id=sid AND t.line_key='TohokuShinkansen' AND t.train_number='Komachi37' AND t.destination_urns=ARRAY['odpt.Station:JR-East.TohokuShinkansen.Akita']
 AND coalesce(cardinality(t.operating_dates),0)=0 AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified' AND m.first_stop_sequence=0 AND m.last_stop_sequence=4 AND m.stop_offset=0;
 IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=sid)<>5 OR NOT EXISTS(SELECT 1 FROM published_train_number_evidence WHERE source_template_id=sid AND edition='2611' AND train_number='3037M') THEN RAISE EXCEPTION 'legacy guard failed %',sid; END IF;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,seq,CASE WHEN arr IS NOT NULL THEN urn END,CASE WHEN dep IS NOT NULL THEN urn END,arr,dep FROM (VALUES (0,'odpt.Station:JR-East.TohokuShinkansen.Tokyo',NULL::text,'18:20'::text),
(1,'odpt.Station:JR-East.TohokuShinkansen.Ueno','18:25'::text,'18:26'::text),
(2,'odpt.Station:JR-East.TohokuShinkansen.Omiya','18:44'::text,'18:45'::text),
(3,'odpt.Station:JR-East.TohokuShinkansen.Sendai','19:51'::text,'19:53'::text),
(4,'odpt.Station:JR-East.TohokuShinkansen.Morioka','20:33'::text,'20:35'::text),
(5,'odpt.Station:JR-East.AkitaShinkansen.Shizukuishi','20:48'::text,'20:48'::text),
(6,'odpt.Station:JR-East.AkitaShinkansen.Tazawako','21:08'::text,'21:11'::text),
(7,'odpt.Station:JR-East.AkitaShinkansen.Kakunodate','21:24'::text,'21:24'::text),
(8,'odpt.Station:JR-East.AkitaShinkansen.Omagari','21:34'::text,'21:36'::text),
(9,'odpt.Station:JR-East.AkitaShinkansen.Akita','22:07'::text,NULL::text)) v(seq,urn,arr,dep)
 ON CONFLICT(template_id,stop_sequence) DO UPDATE SET arrival_station_urn=excluded.arrival_station_urn,departure_station_urn=excluded.departure_station_urn,arrival_clock=excluded.arrival_clock,departure_clock=excluded.departure_clock;
 UPDATE manual_timetable_templates SET destination_urns=ARRAY['odpt.Station:JR-East.AkitaShinkansen.Akita'] WHERE id=sid;
 UPDATE train_timetable_members SET last_stop_sequence=9 WHERE source_template_id=sid AND timetable_id=tid;
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>10 THEN RAISE EXCEPTION 'canonical length mismatch %',sid; END IF;
END $fix$;

-- 3039M: https://timetables.jreast.co.jp/2611/train/050/051792.html
DO $fix$
DECLARE sid constant bigint:=1372; tid bigint;
BEGIN
 SELECT c.id INTO STRICT tid FROM manual_timetable_templates t JOIN train_timetable_members m ON m.source_template_id=t.id JOIN train_timetables c ON c.id=m.timetable_id
 WHERE t.id=sid AND t.line_key='TohokuShinkansen' AND t.train_number='Komachi39' AND t.destination_urns=ARRAY['odpt.Station:JR-East.TohokuShinkansen.Akita']
 AND coalesce(cardinality(t.operating_dates),0)=0 AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified' AND m.first_stop_sequence=0 AND m.last_stop_sequence=4 AND m.stop_offset=0;
 IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=sid)<>5 OR NOT EXISTS(SELECT 1 FROM published_train_number_evidence WHERE source_template_id=sid AND edition='2611' AND train_number='3039M') THEN RAISE EXCEPTION 'legacy guard failed %',sid; END IF;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,seq,CASE WHEN arr IS NOT NULL THEN urn END,CASE WHEN dep IS NOT NULL THEN urn END,arr,dep FROM (VALUES (0,'odpt.Station:JR-East.TohokuShinkansen.Tokyo',NULL::text,'19:20'::text),
(1,'odpt.Station:JR-East.TohokuShinkansen.Ueno','19:25'::text,'19:26'::text),
(2,'odpt.Station:JR-East.TohokuShinkansen.Omiya','19:44'::text,'19:45'::text),
(3,'odpt.Station:JR-East.TohokuShinkansen.Sendai','20:52'::text,'20:54'::text),
(4,'odpt.Station:JR-East.TohokuShinkansen.Morioka','21:33'::text,'21:36'::text),
(5,'odpt.Station:JR-East.AkitaShinkansen.Tazawako','22:05'::text,'22:06'::text),
(6,'odpt.Station:JR-East.AkitaShinkansen.Kakunodate','22:19'::text,'22:19'::text),
(7,'odpt.Station:JR-East.AkitaShinkansen.Omagari','22:30'::text,'22:32'::text),
(8,'odpt.Station:JR-East.AkitaShinkansen.Akita','23:02'::text,NULL::text)) v(seq,urn,arr,dep)
 ON CONFLICT(template_id,stop_sequence) DO UPDATE SET arrival_station_urn=excluded.arrival_station_urn,departure_station_urn=excluded.departure_station_urn,arrival_clock=excluded.arrival_clock,departure_clock=excluded.departure_clock;
 UPDATE manual_timetable_templates SET destination_urns=ARRAY['odpt.Station:JR-East.AkitaShinkansen.Akita'] WHERE id=sid;
 UPDATE train_timetable_members SET last_stop_sequence=8 WHERE source_template_id=sid AND timetable_id=tid;
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>9 THEN RAISE EXCEPTION 'canonical length mismatch %',sid; END IF;
END $fix$;

-- 3041M: https://timetables.jreast.co.jp/2611/train/060/062371.html
DO $fix$
DECLARE sid constant bigint:=1373; tid bigint;
BEGIN
 SELECT c.id INTO STRICT tid FROM manual_timetable_templates t JOIN train_timetable_members m ON m.source_template_id=t.id JOIN train_timetables c ON c.id=m.timetable_id
 WHERE t.id=sid AND t.line_key='TohokuShinkansen' AND t.train_number='Komachi41' AND t.destination_urns=ARRAY['odpt.Station:JR-East.TohokuShinkansen.Akita']
 AND coalesce(cardinality(t.operating_dates),0)=0 AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified' AND m.first_stop_sequence=0 AND m.last_stop_sequence=4 AND m.stop_offset=0;
 IF (SELECT count(*) FROM manual_timetable_template_stops WHERE template_id=sid)<>5 OR NOT EXISTS(SELECT 1 FROM published_train_number_evidence WHERE source_template_id=sid AND edition='2611' AND train_number='3041M') THEN RAISE EXCEPTION 'legacy guard failed %',sid; END IF;
 INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT sid,seq,CASE WHEN arr IS NOT NULL THEN urn END,CASE WHEN dep IS NOT NULL THEN urn END,arr,dep FROM (VALUES (0,'odpt.Station:JR-East.TohokuShinkansen.Tokyo',NULL::text,'20:16'::text),
(1,'odpt.Station:JR-East.TohokuShinkansen.Ueno','20:21'::text,'20:22'::text),
(2,'odpt.Station:JR-East.TohokuShinkansen.Omiya','20:40'::text,'20:41'::text),
(3,'odpt.Station:JR-East.TohokuShinkansen.Sendai','21:47'::text,'21:48'::text),
(4,'odpt.Station:JR-East.TohokuShinkansen.Morioka','22:27'::text,'22:30'::text),
(5,'odpt.Station:JR-East.AkitaShinkansen.Omagari','23:21'::text,'23:23'::text),
(6,'odpt.Station:JR-East.AkitaShinkansen.Akita','23:53'::text,NULL::text)) v(seq,urn,arr,dep)
 ON CONFLICT(template_id,stop_sequence) DO UPDATE SET arrival_station_urn=excluded.arrival_station_urn,departure_station_urn=excluded.departure_station_urn,arrival_clock=excluded.arrival_clock,departure_clock=excluded.departure_clock;
 UPDATE manual_timetable_templates SET destination_urns=ARRAY['odpt.Station:JR-East.AkitaShinkansen.Akita'] WHERE id=sid;
 UPDATE train_timetable_members SET last_stop_sequence=6 WHERE source_template_id=sid AND timetable_id=tid;
 IF (SELECT count(*) FROM train_timetable_stops WHERE source_template_id=sid AND timetable_id=tid)<>7 THEN RAISE EXCEPTION 'canonical length mismatch %',sid; END IF;
END $fix$;
COMMIT;