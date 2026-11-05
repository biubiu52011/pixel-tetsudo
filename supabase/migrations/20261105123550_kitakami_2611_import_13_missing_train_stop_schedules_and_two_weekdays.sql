-- 13 additional 2026-11 Kitakami train numbers; source clocks are
-- transcribed from JR East train pages, exact 2026-11 for 7 outbound,
-- prior 2026-10 timetable + current Nov endpoint for 6 inbound.
-- All remain UNDATED_NOT_CURRENT_VERIFIED until every intermediate
-- November clock has been compared independently.
-- 2026-08-02 Hotto-Yuda-Yokote disaster means the TRAIN stops at Hotto.
-- No missing Yokote rail stop is synthesized; replacement bus separate.
-- The previous SQL had 10 sources, including 9729D/9730D OCTOBER ONLY.
BEGIN;
SELECT pg_advisory_xact_lock(26112510);
CREATE TEMP TABLE kitakami_2611_seed(
 train_number text PRIMARY KEY,dir text,kind text,source_edition text,
 source_url text,stops jsonb
) ON COMMIT DROP;
INSERT INTO kitakami_2611_seed VALUES
('723D','Outbound','Local','2611','https://timetables.jreast.co.jp/2611/train/050/051721.html','[{"station":"Kitakami","arrival":null,"departure":"06:01"},{"station":"Yanagihara","arrival":null,"departure":"06:04"},{"station":"Ezuriko","arrival":"06:07","departure":"06:08"},{"station":"Fujine","arrival":"06:11","departure":"06:15"},{"station":"Tatekawame","arrival":null,"departure":"06:19"},{"station":"Yokokawame","arrival":"06:22","departure":"06:23"},{"station":"Iwasawa","arrival":null,"departure":"06:27"},{"station":"Waka-Sennin","arrival":null,"departure":"06:31"},{"station":"Yuda-Kinshuko","arrival":"06:40","departure":"06:41"},{"station":"Hotto-Yuda","arrival":"06:48","departure":null}]'::jsonb),
('727D','Outbound','Local','2611','https://timetables.jreast.co.jp/2611/train/050/051731.html','[{"station":"Kitakami","arrival":null,"departure":"07:35"},{"station":"Yanagihara","arrival":null,"departure":"07:38"},{"station":"Ezuriko","arrival":null,"departure":"07:42"},{"station":"Fujine","arrival":"07:46","departure":"07:47"},{"station":"Tatekawame","arrival":null,"departure":"07:51"},{"station":"Yokokawame","arrival":null,"departure":"07:54"},{"station":"Iwasawa","arrival":null,"departure":"07:59"},{"station":"Waka-Sennin","arrival":null,"departure":"08:03"},{"station":"Yuda-Kinshuko","arrival":null,"departure":"08:12"},{"station":"Hotto-Yuda","arrival":"08:20","departure":null}]'::jsonb),
('3729D','Outbound','Rapid','2611','https://timetables.jreast.co.jp/2611/train/050/051741.html','[{"station":"Kitakami","arrival":null,"departure":"09:53"},{"station":"Yanagihara","arrival":null,"departure":"09:56"},{"station":"Ezuriko","arrival":"09:59","departure":"10:00"},{"station":"Fujine","arrival":"10:03","departure":"10:04"},{"station":"Tatekawame","arrival":null,"departure":"10:08"},{"station":"Yokokawame","arrival":"10:11","departure":"10:12"},{"station":"Iwasawa","arrival":null,"departure":"10:16"},{"station":"Waka-Sennin","arrival":null,"departure":"10:20"},{"station":"Yuda-Kinshuko","arrival":"10:29","departure":"10:30"},{"station":"Hotto-Yuda","arrival":"10:37","departure":null}]'::jsonb),
('3731D','Outbound','Rapid','2611','https://timetables.jreast.co.jp/2611/train/045/048791.html','[{"station":"Kitakami","arrival":null,"departure":"13:42"},{"station":"Yanagihara","arrival":null,"departure":"13:45"},{"station":"Ezuriko","arrival":"13:48","departure":"13:49"},{"station":"Fujine","arrival":"13:52","departure":"13:53"},{"station":"Tatekawame","arrival":null,"departure":"13:57"},{"station":"Yokokawame","arrival":"14:00","departure":"14:01"},{"station":"Iwasawa","arrival":null,"departure":"14:05"},{"station":"Waka-Sennin","arrival":null,"departure":"14:09"},{"station":"Yuda-Kinshuko","arrival":"14:18","departure":"14:19"},{"station":"Hotto-Yuda","arrival":"14:26","departure":null}]'::jsonb),
('733D','Outbound','Local','2611','https://timetables.jreast.co.jp/2611/train/050/051751.html','[{"station":"Kitakami","arrival":null,"departure":"16:48"},{"station":"Yanagihara","arrival":null,"departure":"16:51"},{"station":"Ezuriko","arrival":"16:54","departure":"16:55"},{"station":"Fujine","arrival":"16:58","departure":"16:59"},{"station":"Tatekawame","arrival":null,"departure":"17:03"},{"station":"Yokokawame","arrival":"17:06","departure":"17:07"},{"station":"Iwasawa","arrival":null,"departure":"17:11"},{"station":"Waka-Sennin","arrival":null,"departure":"17:15"},{"station":"Yuda-Kinshuko","arrival":"17:24","departure":"17:25"},{"station":"Hotto-Yuda","arrival":"17:32","departure":null}]'::jsonb),
('737D','Outbound','Local','2611','https://timetables.jreast.co.jp/2611/train/050/051761.html','[{"station":"Kitakami","arrival":null,"departure":"19:29"},{"station":"Yanagihara","arrival":null,"departure":"19:32"},{"station":"Ezuriko","arrival":"19:35","departure":"19:36"},{"station":"Fujine","arrival":"19:40","departure":"19:43"},{"station":"Tatekawame","arrival":"19:47","departure":"19:48"},{"station":"Yokokawame","arrival":"19:50","departure":"19:51"},{"station":"Iwasawa","arrival":"19:55","departure":"19:56"},{"station":"Waka-Sennin","arrival":"19:59","departure":"20:00"},{"station":"Yuda-Kinshuko","arrival":"20:08","departure":"20:09"},{"station":"Hotto-Yuda","arrival":"20:16","departure":null}]'::jsonb),
('3739D','Outbound','Rapid','2611','https://timetables.jreast.co.jp/2611/train/050/051771.html','[{"station":"Kitakami","arrival":null,"departure":"21:00"},{"station":"Yanagihara","arrival":null,"departure":"21:03"},{"station":"Ezuriko","arrival":null,"departure":"21:07"},{"station":"Fujine","arrival":"21:11","departure":"21:15"},{"station":"Tatekawame","arrival":null,"departure":"21:19"},{"station":"Yokokawame","arrival":null,"departure":"21:22"},{"station":"Iwasawa","arrival":null,"departure":"21:27"},{"station":"Waka-Sennin","arrival":null,"departure":"21:31"},{"station":"Yuda-Kinshuko","arrival":null,"departure":"21:40"},{"station":"Hotto-Yuda","arrival":"21:48","departure":null}]'::jsonb),
('726D','Inbound','Local','2610','https://timetables.jreast.co.jp/2610/train/015/016241.html','[{"station":"Hotto-Yuda","arrival":null,"departure":"07:11"},{"station":"Yuda-Kinshuko","arrival":null,"departure":"07:18"},{"station":"Waka-Sennin","arrival":null,"departure":"07:27"},{"station":"Iwasawa","arrival":null,"departure":"07:31"},{"station":"Yokokawame","arrival":null,"departure":"07:36"},{"station":"Tatekawame","arrival":null,"departure":"07:39"},{"station":"Fujine","arrival":"07:43","departure":"07:47"},{"station":"Ezuriko","arrival":"07:50","departure":"07:51"},{"station":"Yanagihara","arrival":"07:54","departure":"07:55"},{"station":"Kitakami","arrival":"07:59","departure":null}]'::jsonb),
('728D','Inbound','Local','2610','https://timetables.jreast.co.jp/2610/train/015/016301.html','[{"station":"Hotto-Yuda","arrival":null,"departure":"08:30"},{"station":"Yuda-Kinshuko","arrival":null,"departure":"08:38"},{"station":"Waka-Sennin","arrival":null,"departure":"08:47"},{"station":"Iwasawa","arrival":null,"departure":"08:51"},{"station":"Yokokawame","arrival":"08:55","departure":"08:56"},{"station":"Tatekawame","arrival":null,"departure":"08:59"},{"station":"Fujine","arrival":null,"departure":"09:03"},{"station":"Ezuriko","arrival":null,"departure":"09:07"},{"station":"Yanagihara","arrival":"09:10","departure":"09:11"},{"station":"Kitakami","arrival":"09:15","departure":null}]'::jsonb),
('3730D','Inbound','Rapid','2610','https://timetables.jreast.co.jp/2610/train/045/048781.html','[{"station":"Hotto-Yuda","arrival":null,"departure":"11:20"},{"station":"Yuda-Kinshuko","arrival":null,"departure":"11:27"},{"station":"Waka-Sennin","arrival":null,"departure":"11:36"},{"station":"Iwasawa","arrival":null,"departure":"11:40"},{"station":"Yokokawame","arrival":null,"departure":"11:45"},{"station":"Tatekawame","arrival":null,"departure":"11:48"},{"station":"Fujine","arrival":"11:52","departure":"11:53"},{"station":"Ezuriko","arrival":null,"departure":"11:56"},{"station":"Yanagihara","arrival":null,"departure":"12:00"},{"station":"Kitakami","arrival":"12:04","departure":null}]'::jsonb),
('732D','Inbound','Local','2610','https://timetables.jreast.co.jp/2610/train/060/064411.html','[{"station":"Hotto-Yuda","arrival":null,"departure":"14:52"},{"station":"Yuda-Kinshuko","arrival":null,"departure":"14:59"},{"station":"Waka-Sennin","arrival":null,"departure":"15:08"},{"station":"Iwasawa","arrival":null,"departure":"15:12"},{"station":"Yokokawame","arrival":null,"departure":"15:17"},{"station":"Tatekawame","arrival":null,"departure":"15:20"},{"station":"Fujine","arrival":"15:24","departure":"15:25"},{"station":"Ezuriko","arrival":null,"departure":"15:28"},{"station":"Yanagihara","arrival":null,"departure":"15:32"},{"station":"Kitakami","arrival":"15:36","departure":null}]'::jsonb),
('734D','Inbound','Local','2610','https://timetables.jreast.co.jp/2610/train/015/016401.html','[{"station":"Hotto-Yuda","arrival":null,"departure":"17:55"},{"station":"Yuda-Kinshuko","arrival":null,"departure":"18:02"},{"station":"Waka-Sennin","arrival":null,"departure":"18:11"},{"station":"Iwasawa","arrival":null,"departure":"18:15"},{"station":"Yokokawame","arrival":null,"departure":"18:20"},{"station":"Tatekawame","arrival":null,"departure":"18:23"},{"station":"Fujine","arrival":"18:27","departure":"18:28"},{"station":"Ezuriko","arrival":null,"departure":"18:31"},{"station":"Yanagihara","arrival":null,"departure":"18:35"},{"station":"Kitakami","arrival":"18:39","departure":null}]'::jsonb),
('738D','Inbound','Local','2610','https://timetables.jreast.co.jp/2610/train/015/016441.html','[{"station":"Hotto-Yuda","arrival":null,"departure":"20:42"},{"station":"Yuda-Kinshuko","arrival":null,"departure":"20:49"},{"station":"Waka-Sennin","arrival":null,"departure":"20:58"},{"station":"Iwasawa","arrival":null,"departure":"21:02"},{"station":"Yokokawame","arrival":null,"departure":"21:07"},{"station":"Tatekawame","arrival":null,"departure":"21:10"},{"station":"Fujine","arrival":"21:14","departure":"21:15"},{"station":"Ezuriko","arrival":null,"departure":"21:18"},{"station":"Yanagihara","arrival":null,"departure":"21:22"},{"station":"Kitakami","arrival":"21:25","departure":null}]'::jsonb);
DO $check$
BEGIN
 IF (SELECT count(*) FROM kitakami_2611_seed)<>13
 OR EXISTS(SELECT 1 FROM kitakami_2611_seed s
    WHERE jsonb_array_length(s.stops)<>10
    OR (s.stops->0->>'station')<>(CASE WHEN s.dir='Outbound' THEN 'Kitakami' ELSE 'Hotto-Yuda' END)
    OR (s.stops->9->>'station')<>(CASE WHEN s.dir='Outbound' THEN 'Hotto-Yuda' ELSE 'Kitakami' END)
    OR (s.stops->0->>'departure') IS NULL
    OR (s.stops->9->>'arrival') IS NULL)
 THEN RAISE EXCEPTION 'Kitakami imported 13 schedules are incomplete or not rail-scoped'; END IF;
END $check$;
-- Create both calendar variants, but never promote a source timetable
-- to a current verified date based solely on the service number.
INSERT INTO public.manual_timetable_templates
(line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,
 destination_urns,vehicle_type_label,source_path,source_occurrence)
SELECT 'Kitakami','odpt.Calendar:'||c.calendar,s.train_number,
 'odpt.Railway:JR-East.Kitakami','odpt.RailDirection:'||s.dir,
 'odpt.TrainType:JR-East.'||s.kind,
 ARRAY['odpt.Station:JR-East.'||(s.stops->9->>'station')],
 'キハ110系','official-jreast-kitakami-'||s.source_edition||':'||
 s.train_number||':'||c.calendar,0
FROM kitakami_2611_seed s CROSS JOIN
 (VALUES('Weekday'),('SaturdayHoliday')) AS c(calendar)
WHERE NOT EXISTS(SELECT 1 FROM public.manual_timetable_templates m
 WHERE m.line_key='Kitakami' AND m.train_number=s.train_number
 AND m.calendar_urn='odpt.Calendar:'||c.calendar);

-- Two existing short-service source templates were imported only with
-- SaturdayHoliday, despite the official 2026-11 station board also having
-- the same Weekday service. Copy their source stops without guessing.
INSERT INTO public.manual_timetable_templates
(line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,
 destination_urns,vehicle_type_label,source_path,source_occurrence)
SELECT o.line_key,'odpt.Calendar:Weekday',o.train_number,o.railway_urn,
 o.direction_urn,o.train_type_urn,o.destination_urns,o.vehicle_type_label,
 'official-jreast-kitakami-2611:short-weekday:'||o.train_number,0
FROM public.manual_timetable_templates o
WHERE o.line_key='Kitakami' AND o.train_number IN('724D','725D')
 AND o.calendar_urn='odpt.Calendar:SaturdayHoliday'
 AND NOT EXISTS(SELECT 1 FROM public.manual_timetable_templates m
  WHERE m.line_key='Kitakami' AND m.train_number=o.train_number
  AND m.calendar_urn='odpt.Calendar:Weekday');

INSERT INTO public.manual_timetable_template_stops
(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
SELECT m.id,(z.ordinality-1)::integer,
 CASE WHEN z.value->>'arrival' IS NOT NULL THEN
 'odpt.Station:JR-East.'||(z.value->>'station') ELSE NULL END,
 CASE WHEN z.value->>'departure' IS NOT NULL THEN
 'odpt.Station:JR-East.'||(z.value->>'station') ELSE NULL END,
 z.value->>'arrival',z.value->>'departure'
FROM kitakami_2611_seed s CROSS JOIN
 (VALUES('Weekday'),('SaturdayHoliday')) c(calendar)
JOIN public.manual_timetable_templates m
 ON m.source_path='official-jreast-kitakami-'||s.source_edition||
 ':'||s.train_number||':'||c.calendar
CROSS JOIN LATERAL jsonb_array_elements(s.stops)
 WITH ORDINALITY AS z(value,ordinality)
ON CONFLICT (template_id,stop_sequence) DO NOTHING;
INSERT INTO public.manual_timetable_template_stops
(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
SELECT d.id,src.stop_sequence,src.arrival_station_urn,src.departure_station_urn,
src.arrival_clock,src.departure_clock
FROM public.manual_timetable_templates d
JOIN public.manual_timetable_templates orig
 ON orig.line_key='Kitakami' AND orig.train_number=d.train_number
 AND orig.calendar_urn='odpt.Calendar:SaturdayHoliday'
JOIN public.manual_timetable_template_stops src ON src.template_id=orig.id
WHERE d.source_path='official-jreast-kitakami-2611:short-weekday:'||d.train_number
ON CONFLICT(template_id,stop_sequence) DO NOTHING;

-- Reuse the existing canonical schema rather than inventing a second
-- place to store moving train schedules. The source table holds provenance.
INSERT INTO public.train_timetables
(canonical_key,calendar_urn,primary_train_number,lead_source_template_id,
 group_evidence,timetable_validity)
SELECT 'source:'||m.id,m.calendar_urn,m.train_number,m.id,
 'source_only','undated_not_current_verified'
FROM public.manual_timetable_templates m
WHERE m.line_key='Kitakami'
AND m.source_path LIKE 'official-jreast-kitakami-%'
AND NOT EXISTS(SELECT 1 FROM public.train_timetables t
 WHERE t.canonical_key='source:'||m.id);

INSERT INTO public.train_timetable_members
(source_template_id,timetable_id,segment_order,member_role,first_stop_sequence,
 last_stop_sequence,stop_offset,merge_first_stop)
SELECT m.id,t.id,0,'primary',0,
 (SELECT max(st.stop_sequence) FROM manual_timetable_template_stops st
 WHERE st.template_id=m.id),0,false
FROM public.manual_timetable_templates m
JOIN public.train_timetables t ON t.canonical_key='source:'||m.id
WHERE m.line_key='Kitakami' AND m.source_path LIKE 'official-jreast-kitakami-%'
ON CONFLICT(source_template_id) DO NOTHING;
INSERT INTO public.train_timetable_vehicle_mappings
(timetable_id,source_template_id,vehicle_type,mapping_level,source_path,actual_vehicle_confirmed)
SELECT t.id,m.id,'キハ110系','source_single_type_candidate',
 m.source_path,false
FROM public.manual_timetable_templates m
JOIN public.train_timetables t ON t.canonical_key='source:'||m.id
WHERE m.line_key='Kitakami' AND m.source_path LIKE 'official-jreast-kitakami-%'
AND NOT EXISTS(SELECT 1 FROM public.train_timetable_vehicle_mappings v
 WHERE v.timetable_id=t.id);

INSERT INTO public.published_train_number_evidence
(edition,line_key,calendar_urn,direction_urn,train_number,
 source_template_id,official_source_url,verification_scope)
SELECT '2611','Kitakami',r.calendar_urn,r.direction_urn,r.train_number,
m.id,r.official_source_url,'train_number_only'
FROM public.published_kitakami_2611_number_roster r
JOIN public.manual_timetable_templates m
ON m.line_key='Kitakami' AND m.train_number=r.train_number
 AND m.calendar_urn=r.calendar_urn AND m.direction_urn=r.direction_urn
ON CONFLICT DO NOTHING;

DO $post$
DECLARE distinct_trains integer; total_sources integer; rails integer;
BEGIN
 SELECT count(DISTINCT m.train_number),count(*) INTO distinct_trains,total_sources
 FROM public.manual_timetable_templates m
 JOIN public.published_kitakami_2611_number_roster r
 ON r.train_number=m.train_number AND r.calendar_urn=m.calendar_urn
 AND r.direction_urn=m.direction_urn
 WHERE m.line_key='Kitakami' AND r.edition='2611';
 IF distinct_trains<>18 OR total_sources<>36 THEN
 RAISE EXCEPTION 'Expected 18 November train numbers in 36 calendar rows, got % and %',distinct_trains,total_sources; END IF;
 SELECT count(*) INTO rails
 FROM public.manual_timetable_templates m
 JOIN public.manual_timetable_template_stops st ON st.template_id=m.id
 JOIN public.published_kitakami_2611_number_roster r
 ON r.train_number=m.train_number AND r.calendar_urn=m.calendar_urn
 WHERE m.line_key='Kitakami'
 AND coalesce(st.arrival_station_urn,st.departure_station_urn)
 NOT IN(
 'odpt.Station:JR-East.Kitakami','odpt.Station:JR-East.Yanagihara',
 'odpt.Station:JR-East.Ezuriko','odpt.Station:JR-East.Fujine',
 'odpt.Station:JR-East.Tatekawame','odpt.Station:JR-East.Yokokawame',
 'odpt.Station:JR-East.Iwasawa','odpt.Station:JR-East.Waka-Sennin',
 'odpt.Station:JR-East.Yuda-Kinshuko','odpt.Station:JR-East.Hotto-Yuda');
 IF rails>0 THEN RAISE EXCEPTION 'November railway source improperly contains closed bus section'; END IF;
END $post$;
COMMIT;