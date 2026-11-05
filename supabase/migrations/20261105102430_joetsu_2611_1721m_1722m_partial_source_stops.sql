-- JR East 2611 official 296d1/296u1: partial, sourced stop clocks only.
-- 1721M Ishiuchi 06:25 -> Nagaoka 07:33; 1722M Nagaoka 05:39 ->
-- Echigo-Nakazato 07:10 (Tsuchitaru is not a stopping time).
-- Stops not printed in the evidence are not synthesized. Holiday stop clocks
-- remain unverified; only weekday templates are created.
BEGIN;
SELECT pg_advisory_xact_lock(74132611);
CREATE TEMP TABLE joetsu_stop_seed(
 train_number text,dir text,stop_sequence int,station text,
 arrival_clock text,departure_clock text,
 PRIMARY KEY(train_number,stop_sequence)) ON COMMIT DROP;
INSERT INTO joetsu_stop_seed VALUES
('1721M','Outbound',0,'Ishiuchi',NULL,'06:25'),
('1721M','Outbound',1,'Osawa',NULL,'06:29'),
('1721M','Outbound',2,'Shiozawa',NULL,'06:33'),
('1721M','Outbound',3,'Muikamachi','06:37','06:38'),
('1721M','Outbound',4,'Itsukamachi',NULL,'06:44'),
('1721M','Outbound',5,'Urasa',NULL,'06:49'),
('1721M','Outbound',6,'Nagaoka','07:33',NULL),
('1722M','Inbound',0,'Nagaoka',NULL,'05:39'),
('1722M','Inbound',1,'Miyauchi',NULL,'05:44'),
('1722M','Inbound',2,'Echigo-Takaya',NULL,'05:49'),
('1722M','Inbound',3,'Ojiya',NULL,'05:56'),
('1722M','Inbound',4,'Yairo',NULL,'06:19'),
('1722M','Inbound',5,'Urasa',NULL,'06:23'),
('1722M','Inbound',6,'Itsukamachi',NULL,'06:28'),
('1722M','Inbound',7,'Muikamachi','06:33','06:34'),
('1722M','Inbound',8,'Shiozawa',NULL,'06:38'),
('1722M','Inbound',9,'Osawa',NULL,'06:42'),
('1722M','Inbound',10,'Ishiuchi',NULL,'06:46'),
('1722M','Inbound',11,'Echigo-Yuzawa','06:53','07:01'),
('1722M','Inbound',12,'Iwahara-Ski-Jo-Mae',NULL,'07:05'),
('1722M','Inbound',13,'Echigo-Nakazato','07:10',NULL);
CREATE TEMP TABLE joetsu_runs AS
SELECT train_number,dir,count(*) AS stop_count,
 'official-jreast-2611:joetsu:'||train_number||':weekday' AS source_key
FROM joetsu_stop_seed GROUP BY train_number,dir;
INSERT INTO public.manual_timetable_templates
 (line_key,calendar_urn,train_number,railway_urn,direction_urn,
  train_type_urn,destination_urns,vehicle_type_label,source_path,
  source_occurrence)
SELECT 'Joetsu','odpt.Calendar:Weekday',s.train_number,
 'odpt.Railway:JR-East.Joetsu','odpt.RailDirection:'||s.dir,
 'odpt.TrainType:JR-East.Local',
 ARRAY['odpt.Station:JR-East.Joetsu.'||
   (SELECT t.station FROM joetsu_stop_seed t
    WHERE t.train_number=s.train_number ORDER BY t.stop_sequence DESC LIMIT 1)],
 'E129系',s.source_key,0
FROM joetsu_runs s WHERE NOT EXISTS
(SELECT 1 FROM manual_timetable_templates m
 WHERE m.line_key='Joetsu' AND m.calendar_urn='odpt.Calendar:Weekday'
 AND m.train_number=s.train_number AND m.source_path=s.source_key);
INSERT INTO public.manual_timetable_template_stops
(template_id,stop_sequence,arrival_station_urn,departure_station_urn,
 arrival_clock,departure_clock)
SELECT t.id,s.stop_sequence,
 CASE WHEN s.arrival_clock IS NOT NULL
 THEN 'odpt.Station:JR-East.Joetsu.'||s.station ELSE NULL END,
 CASE WHEN s.departure_clock IS NOT NULL
 THEN 'odpt.Station:JR-East.Joetsu.'||s.station ELSE NULL END,
 s.arrival_clock,s.departure_clock
FROM joetsu_stop_seed s
JOIN joetsu_runs r ON r.train_number=s.train_number
JOIN manual_timetable_templates t ON t.source_path=r.source_key
WHERE NOT EXISTS (SELECT 1 FROM manual_timetable_template_stops ss
 WHERE ss.template_id=t.id AND ss.stop_sequence=s.stop_sequence);
INSERT INTO public.train_timetables
(canonical_key,calendar_urn,primary_train_number,lead_source_template_id,group_evidence,timetable_validity)
SELECT 'source:'||t.id,t.calendar_urn,t.train_number,t.id,
'source_only','undated_not_current_verified'
FROM joetsu_runs r JOIN manual_timetable_templates t ON t.source_path=r.source_key
WHERE NOT EXISTS (SELECT 1 FROM train_timetables c WHERE c.canonical_key='source:'||t.id);
INSERT INTO public.train_timetable_members
(source_template_id,timetable_id,segment_order,member_role,first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop)
SELECT t.id,c.id,0,'primary',0,r.stop_count-1,0,false
FROM joetsu_runs r JOIN manual_timetable_templates t ON t.source_path=r.source_key
JOIN train_timetables c ON c.canonical_key='source:'||t.id
ON CONFLICT (source_template_id) DO NOTHING;
INSERT INTO public.train_timetable_vehicle_mappings
(timetable_id,source_template_id,vehicle_type,mapping_level,source_path,actual_vehicle_confirmed)
SELECT c.id,t.id,'E129系','source_single_type_candidate',r.source_key,false
FROM joetsu_runs r JOIN manual_timetable_templates t ON t.source_path=r.source_key
JOIN train_timetables c ON c.canonical_key='source:'||t.id
WHERE NOT EXISTS (SELECT 1 FROM train_timetable_vehicle_mappings v
WHERE v.timetable_id=c.id);
INSERT INTO public.published_train_number_evidence
(edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,official_source_url,verification_scope)
SELECT '2611','Joetsu',t.calendar_urn,t.direction_urn,t.train_number,t.id,
 'https://timetables.jreast.co.jp/2611/timetable-v/296'||
 CASE WHEN r.dir='Inbound' THEN 'u' ELSE 'd' END||'1.html',
 'train_number_only'
FROM joetsu_runs r JOIN manual_timetable_templates t ON t.source_path=r.source_key
ON CONFLICT DO NOTHING;
UPDATE public.published_joetsu_2611_number_roster r
SET stop_clock_status='partial_official_stops'
WHERE r.calendar_urn='odpt.Calendar:Weekday'
AND r.train_number IN ('1721M','1722M')
AND r.line_key='Joetsu' AND r.edition='2611';
COMMIT;