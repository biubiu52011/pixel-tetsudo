-- Two official November 2026 JR-West Fukuchiyama northbound service samples.
-- They are independent 10-stop scheduled examples, NOT the full line diagram.
-- The 2528M sample and 2532M sample use 2026-11 JR-West timetable facts.
-- Source 2528M: https://timetable.jr-odekake.net/train-timetable/24391?date=20261103
-- Source 2532M: https://timetable.jr-odekake.net/train-timetable/24581?date=20261103
-- Date-specific, no real-time evidence, no actual vehicle or PNG permission.
-- Add to existing canonical timetable owner; don't create an alternative subsystem.
BEGIN;
SELECT pg_advisory_xact_lock(26110833);

DO $guard$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='Fukuchiyama')<>383
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet)<>357
 OR (SELECT count(*) FROM public.manual_timetable_templates WHERE id IN(2611082528001,2611082528002,2611082532001,2611082532002))<>0
 OR (SELECT count(*) FROM public.train_timetables WHERE id IN(2611082528001,2611082528002,2611082532001,2611082532002))<>0
 OR (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='Fukuchiyama'
      AND train_number IN ('2528M','2528MH','2532M','2532MH'))<>0
 OR (SELECT count(*) FROM public.manual_timetable_templates WHERE id IN(68234,68235)
      AND source_path='official-sampled:fukuchiyama:2611:2531M'
      AND direction_urn='odpt.RailDirection:Outbound')<>2
 THEN RAISE EXCEPTION 'Fukuchiyama sample import preconditions failed';
 END IF;
END $guard$;

WITH roster(id,number,calendar) AS (
 VALUES
 (2611082528001,'2528M','odpt.Calendar:Weekday'),
 (2611082528002,'2528MH','odpt.Calendar:SaturdayHoliday'),
 (2611082532001,'2532M','odpt.Calendar:Weekday'),
 (2611082532002,'2532MH','odpt.Calendar:SaturdayHoliday')
)
INSERT INTO public.manual_timetable_templates(
 id,line_key,calendar_urn,train_number,railway_urn,
 direction_urn,train_type_urn,destination_urns,vehicle_type_label,
 source_path,source_occurrence,source_revision_date,revision_id,operating_dates)
SELECT id,'Fukuchiyama',calendar,number,'odpt.Railway:JR-West.Fukuchiyama',
 'odpt.RailDirection:Inbound','odpt.TrainType:JR-West.Local',
 ARRAY['odpt.Station:JR-West.Fukuchiyama.Shinoyamaguchi']::text[],
 NULL,'official-sampled:fukuchiyama:2611:'||
   CASE WHEN number LIKE '2528%' THEN '2528M' ELSE '2532M' END,
 0,NULL,NULL,
 ARRAY(SELECT day::date FROM generate_series('2026-11-01'::date,
    '2026-11-30'::date,'1 day'::interval) day)
FROM roster;

WITH stop(number,seq,station,arr,dep) AS (
 VALUES
 ('2528M',0,'Fukuchiyama',NULL,'09:01'),
 ('2528M',1,'Tamba-Takeda','09:08','09:09'),
 ('2528M',2,'Ichijima','09:13','09:17'),
 ('2528M',3,'Kuroi-Tamba','09:23','09:24'),
 ('2528M',4,'Iso-Tamba','09:28','09:33'),
 ('2528M',5,'Kaibara-Hyogo','09:36','09:36'),
 ('2528M',6,'Tanigawa','09:43','09:46'),
 ('2528M',7,'Shimotaki','09:50','09:51'),
 ('2528M',8,'Tamba-Oyama','09:59','10:07'),
 ('2528M',9,'Shinoyamaguchi','10:10',NULL),
 ('2532M',0,'Fukuchiyama',NULL,'11:07'),
 ('2532M',1,'Tamba-Takeda','11:15','11:16'),
 ('2532M',2,'Ichijima','11:19','11:20'),
 ('2532M',3,'Kuroi-Tamba','11:26','11:29'),
 ('2532M',4,'Iso-Tamba','11:34','11:35'),
 ('2532M',5,'Kaibara-Hyogo','11:38','11:38'),
 ('2532M',6,'Tanigawa','11:45','11:46'),
 ('2532M',7,'Shimotaki','11:51','11:52'),
 ('2532M',8,'Tamba-Oyama','12:00','12:01'),
 ('2532M',9,'Shinoyamaguchi','12:04',NULL)
)
INSERT INTO public.manual_timetable_template_stops(
 template_id,stop_sequence,arrival_station_urn,departure_station_urn,
 arrival_clock,departure_clock)
SELECT m.id,stop.seq,
 CASE WHEN stop.arr IS NULL THEN NULL ELSE
   'odpt.Station:JR-West.Fukuchiyama.'||stop.station END,
 CASE WHEN stop.dep IS NULL THEN NULL ELSE
   'odpt.Station:JR-West.Fukuchiyama.'||stop.station END,
 stop.arr,stop.dep
FROM public.manual_timetable_templates m
JOIN stop ON regexp_replace(m.train_number,'H$','')=stop.number
WHERE m.id IN(2611082528001,2611082528002,2611082532001,2611082532002);

-- Existing source/canonical projection requires member membership before a
-- run becomes visible. These are two independent services x two calendars.
INSERT INTO public.train_timetables(
 id,canonical_key,calendar_urn,primary_train_number,
 lead_source_template_id,group_evidence,timetable_validity)
SELECT id,'source:'||id,calendar_urn,train_number,id,
 'source_only','undated_not_current_verified'
FROM public.manual_timetable_templates WHERE id IN(2611082528001,2611082528002,2611082532001,2611082532002);

INSERT INTO public.train_timetable_members(
 source_template_id,timetable_id,segment_order,member_role,
 first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop)
SELECT id,id,0,'primary',0,9,0,false
FROM public.manual_timetable_templates WHERE id IN(2611082528001,2611082528002,2611082532001,2611082532002);

-- train_timetable_lines / train_timetable_stops / source_resolution are
-- existing SQL views. They MUST be read, not inserted or updated.
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates
      WHERE line_key='Fukuchiyama')<>387
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet)<>357
 OR (SELECT count(*) FROM public.manual_timetable_templates WHERE id IN(2611082528001,2611082528002,2611082532001,2611082532002)
      AND cardinality(operating_dates)=30
      AND direction_urn='odpt.RailDirection:Inbound'
      AND source_path LIKE 'official-sampled:fukuchiyama:2611:%')<>4
 OR (SELECT count(*) FROM public.manual_timetable_template_stops
      WHERE template_id IN(2611082528001,2611082528002,2611082532001,2611082532002))<>40
 OR (SELECT count(*) FROM public.train_timetable_stops
      WHERE source_template_id IN(2611082528001,2611082528002,2611082532001,2611082532002))<>40
 OR (SELECT count(*) FROM public.train_timetable_source_resolution
      WHERE source_template_id IN(2611082528001,2611082528002,2611082532001,2611082532002) AND group_evidence='source_only')<>4
 OR (SELECT count(*) FROM public.train_timetable_lines
      WHERE timetable_id IN(2611082528001,2611082528002,2611082532001,2611082532002) AND line_key='Fukuchiyama')<>4
 THEN RAISE EXCEPTION 'Fukuchiyama sample canonical reconciliation failed'; END IF;
END $verify$;
COMMIT;
