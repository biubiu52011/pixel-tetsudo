-- 2026-11 JR-West Fukuchiyama sample: complete one pre-existing one-stop
-- source train 2531M/2531MH, never pretend all northern trains are covered.
-- 2531M is daily per JR-West November 2026 timetable:
-- https://timetable.jr-odekake.net/train-timetable/240391?date=20261024
-- 2774M is Tanbaji Rapid on weekdays (Rapid on holidays):
-- https://timetable.jr-odekake.net/train-timetable/101631?date=20261023
-- Do not infer actual vehicle, PNG, current operational status or GPS position.
BEGIN;
SELECT pg_advisory_xact_lock(26110831);

DO $guard$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='Fukuchiyama')<>383
    OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet)<>357
    OR (SELECT count(*) FROM public.manual_timetable_templates
        WHERE id IN (68234,68235) AND line_key='Fukuchiyama'
          AND train_number IN('2531M','2531MH')
          AND direction_urn='odpt.RailDirection:Inbound'
          AND train_type_urn='odpt.TrainType:JR-West.Local'
          AND source_path='data/timetables/Fukuchiyama-manual.js'
          AND operating_dates IS NULL)<>2
    OR (SELECT count(*) FROM public.manual_timetable_template_stops
        WHERE template_id IN (68234,68235))<>2
    OR (SELECT count(*) FROM public.train_timetable_stops
        WHERE source_template_id IN (68234,68235))<>2
    OR (SELECT count(*) FROM public.train_timetable_members
        WHERE source_template_id IN (68234,68235)
          AND last_stop_sequence=0)<>2
    OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet
        WHERE source_template_id IN(68234,68235))<>0
    OR (SELECT count(*) FROM public.manual_timetable_templates
        WHERE id=68301 AND train_number='2774M' AND
          train_type_urn='odpt.TrainType:JR-West.Local')<>1
    OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet
        WHERE source_template_id=68301 AND train_type_urn='odpt.TrainType:JR-West.Local')<>1
 THEN RAISE EXCEPTION 'Fukuchiyama pre-change state changed; re-audit before migration';
 END IF;
END $guard$;

UPDATE public.manual_timetable_templates
SET direction_urn='odpt.RailDirection:Outbound',
    destination_urns=ARRAY['odpt.Station:JR-West.Fukuchiyama.Fukuchiyama']::text[],
    source_path='official-sampled:fukuchiyama:2611:2531M',
    operating_dates=ARRAY(SELECT g::date FROM generate_series(
      '2026-11-01'::date,'2026-11-30'::date,'1 day'::interval) AS g)
WHERE id IN(68234,68235);

WITH clock(station_index,station_key,arrival_clock,departure_clock) AS (
 VALUES
 (1,'Tamba-Oyama','08:40','08:41'),
 (2,'Shimotaki','08:49','08:49'),
 (3,'Tanigawa','08:54','08:55'),
 (4,'Kaibara-Hyogo','09:02','09:03'),
 (5,'Iso-Tamba','09:06','09:06'),
 (6,'Kuroi-Tamba','09:10','09:11'),
 (7,'Ichijima','09:16','09:17'),
 (8,'Tamba-Takeda','09:21','09:21'),
 (9,'Fukuchiyama','09:29',NULL)
)
INSERT INTO public.manual_timetable_template_stops(
 template_id,stop_sequence,arrival_station_urn,departure_station_urn,
 arrival_clock,departure_clock)
SELECT t.id,c.station_index,
  'odpt.Station:JR-West.Fukuchiyama.'||c.station_key,
  CASE WHEN c.departure_clock IS NULL THEN NULL
   ELSE 'odpt.Station:JR-West.Fukuchiyama.'||c.station_key END,
  c.arrival_clock,c.departure_clock
FROM public.manual_timetable_templates t CROSS JOIN clock c
WHERE t.id IN(68234,68235);

UPDATE public.train_timetable_members
SET last_stop_sequence=9
WHERE source_template_id IN(68234,68235) AND last_stop_sequence=0;

-- train_timetable_stops is a VIEW over manual stops and members;
-- it updates automatically and must not receive direct INSERT or UPDATE.

-- Keep historical source and its published candidate proof consistent.
-- The public train category is 丹波路快速 for 2774M weekdays.
UPDATE public.manual_timetable_templates
SET train_type_urn='odpt.TrainType:JR-West.Rapid'
WHERE id=68301;
UPDATE public.published_jrwest_fukuchiyama_2611_source_fleet
SET train_type_urn='odpt.TrainType:JR-West.Rapid'
WHERE source_template_id=68301;

DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='Fukuchiyama')<>383
  OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet)<>357
  OR (SELECT count(*) FROM public.manual_timetable_template_stops WHERE template_id IN(68234,68235))<>20
  OR (SELECT count(*) FROM public.train_timetable_stops WHERE source_template_id IN(68234,68235))<>20
  OR (SELECT count(*) FROM public.train_timetable_members WHERE source_template_id IN(68234,68235)
       AND last_stop_sequence=9)<>2
  OR (SELECT count(*) FROM public.manual_timetable_templates WHERE id IN(68234,68235)
       AND direction_urn='odpt.RailDirection:Outbound'
       AND cardinality(operating_dates)=30
       AND source_path='official-sampled:fukuchiyama:2611:2531M')<>2
  OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet
       WHERE source_template_id=68301 AND train_type_urn='odpt.TrainType:JR-West.Rapid')<>1
 THEN RAISE EXCEPTION 'Fukuchiyama official sample/canonical reconciliation failed'; END IF;
END $verify$;
COMMIT;
