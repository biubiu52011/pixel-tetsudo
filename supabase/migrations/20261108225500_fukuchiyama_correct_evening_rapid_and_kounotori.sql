-- Correct the live Fukuchiyama view's Nov-2026 277x/3028/7025
-- misclassifications in their ORIGINAL canonical SQL source records.
-- Sources: JR-West official 2771M (240421), 2775M (147091/147101),
-- 2780M (240441), 2773M (200171/200181), Kounotori 28 (145171/145181)
-- and Kounotori 25 (200071). No actual carset/PNG/position claim.
BEGIN;
SELECT pg_advisory_xact_lock(26110837);
DO $guard$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='Fukuchiyama')<>387
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet)<>357
 OR (SELECT count(*) FROM public.manual_timetable_templates
    WHERE id IN(68158,68159,68164,68170,68172,68312,68313,68314,68315,68168) AND line_key='Fukuchiyama'
      AND train_type_urn='odpt.TrainType:JR-West.Local'
      AND source_path='data/timetables/Fukuchiyama-manual.js'
      AND operating_dates IS NULL)<>10
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet
    WHERE source_template_id IN(68158,68159,68164,68170,68172,68312,68313,68314,68315,68168)
      AND train_type_urn='odpt.TrainType:JR-West.Local'
      AND candidate_models=ARRAY['207系','321系','223系6000番台','225系6000番台']::text[])<>10
 OR (SELECT count(*) FROM public.manual_timetable_template_stops
     WHERE template_id IN(68314,68315))<>8
 OR (SELECT count(*) FROM public.manual_timetable_template_stops
     WHERE template_id=68168)<>6
 OR (SELECT count(*) FROM public.train_timetable_members
     WHERE source_template_id IN(68314,68315) AND last_stop_sequence=3)<>2
 OR (SELECT count(*) FROM public.train_timetable_members
     WHERE source_template_id=68168 AND last_stop_sequence=5)<>1
 THEN RAISE EXCEPTION 'Fukuchiyama historical 277x / 3028 / 7025 source has drifted';
 END IF;
END $guard$;

-- Existing fleet reference table allows only four previously corrected
-- Kounotori services; extend the precise source-id exception to these three.
ALTER TABLE public.published_jrwest_fukuchiyama_2611_source_fleet
 DROP CONSTRAINT published_jrwest_fukuchiyama_2611_source_candidate_models_check;

UPDATE public.manual_timetable_templates
SET train_type_urn='odpt.TrainType:JR-West.Rapid'
WHERE id IN(68158,68159,68164,68170,68172,68312,68313);
UPDATE public.published_jrwest_fukuchiyama_2611_source_fleet
SET train_type_urn='odpt.TrainType:JR-West.Rapid'
WHERE source_template_id IN(68158,68159,68164,68170,68172,68312,68313);

-- Keep the existing 3028M Sanda--Osaka clocks (including the weekday vs
-- holiday departure time from Osaka), and insert a verified north prefix.
UPDATE public.manual_timetable_template_stops
SET stop_sequence=stop_sequence+10 WHERE template_id IN(68314,68315);
UPDATE public.manual_timetable_template_stops
SET stop_sequence=stop_sequence-7 WHERE template_id IN(68314,68315)
  AND stop_sequence BETWEEN 10 AND 13;

-- 7025MH originally omits Osaka and all stops north of Shinoyamaguchi:
-- shift the six existing calls by one, without changing their clocks.
UPDATE public.manual_timetable_template_stops
SET stop_sequence=stop_sequence+20 WHERE template_id=68168;
UPDATE public.manual_timetable_template_stops
SET stop_sequence=stop_sequence-19 WHERE template_id=68168
 AND stop_sequence BETWEEN 20 AND 25;

WITH proof(num,seq,station,arr,dep) AS (VALUES
 ('3028M',0,'Fukuchiyama',NULL,'20:02'),
 ('3028M',1,'Kaibara-Hyogo','20:21','20:22'),
 ('3028M',2,'Shinoyamaguchi','20:42','20:42'),
 ('7025MH',0,'Osaka','21:05','21:10'),
 ('7025MH',7,'Tanigawa','22:29','22:33'),
 ('7025MH',8,'Kaibara-Hyogo','22:40','22:41'),
 ('7025MH',9,'Kuroi-Tamba','22:47','22:48'),
 ('7025MH',10,'Fukuchiyama','23:03',NULL)
)
INSERT INTO public.manual_timetable_template_stops(
 template_id,stop_sequence,arrival_station_urn,departure_station_urn,
 arrival_clock,departure_clock)
SELECT m.id,p.seq,
 CASE WHEN p.arr IS NULL THEN NULL
   ELSE 'odpt.Station:JR-West.Fukuchiyama.'||p.station END,
 CASE WHEN p.dep IS NULL THEN NULL
   ELSE 'odpt.Station:JR-West.Fukuchiyama.'||p.station END,
 p.arr,p.dep
FROM proof p JOIN public.manual_timetable_templates m ON
  (m.id IN(68314,68315) AND regexp_replace(m.train_number,'H$','')=p.num)
  OR (m.id=68168 AND m.train_number=p.num);

UPDATE public.manual_timetable_templates
SET train_type_urn='odpt.TrainType:JR-West.LimitedExpress',
 destination_urns=ARRAY['odpt.Station:JR-West.TokaidoKansai.ShinOsaka']::text[],
 operating_dates=ARRAY(SELECT d::date FROM generate_series(
    '2026-11-01'::date,'2026-11-30'::date,'1 day'::interval) d)
WHERE id IN(68314,68315);
UPDATE public.manual_timetable_templates
SET train_type_urn='odpt.TrainType:JR-West.LimitedExpress',
 destination_urns=ARRAY['odpt.Station:JR-West.Fukuchiyama.Fukuchiyama']::text[],
 operating_dates=ARRAY(SELECT d::date FROM generate_series(
    '2026-11-01'::date,'2026-11-29'::date,'1 day'::interval) d
    WHERE extract(isodow FROM d)::integer IN (6,7)
       OR d::date IN ('2026-11-03'::date,'2026-11-23'::date))
WHERE id=68168;

UPDATE public.train_timetable_members
SET last_stop_sequence=6
WHERE source_template_id IN(68314,68315) AND last_stop_sequence=3;
UPDATE public.train_timetable_members
SET last_stop_sequence=10
WHERE source_template_id=68168 AND last_stop_sequence=5;

WITH stop_summary AS (
 SELECT m.id,
 array_agg(split_part(coalesce(s.departure_station_urn,s.arrival_station_urn),'.',4)
   ORDER BY s.stop_sequence) AS station_keys,
 count(*)::integer AS n,
 count(*) FILTER(WHERE s.arrival_clock IS NOT NULL OR s.departure_clock IS NOT NULL)::integer AS nt
 FROM public.manual_timetable_templates m
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.id IN(68314,68315,68168) GROUP BY m.id
)
UPDATE public.published_jrwest_fukuchiyama_2611_source_fleet p
SET train_type_urn='odpt.TrainType:JR-West.LimitedExpress',
 candidate_models=ARRAY['287系','289系']::text[],
 source_stop_keys=s.station_keys,source_stop_count=s.n,
 source_timed_stop_count=s.nt,
 fleet_reference_url='https://www.jr-odekake.net/railroad/train/kounotori/'
FROM stop_summary s WHERE p.source_template_id=s.id;

ALTER TABLE public.published_jrwest_fukuchiyama_2611_source_fleet
 ADD CONSTRAINT published_jrwest_fukuchiyama_2611_source_candidate_models_check
 CHECK (
 (source_template_id IN(68244,68245,68251,68252,68314,68315,68168)
    AND train_type_urn='odpt.TrainType:JR-West.LimitedExpress'
    AND candidate_models=ARRAY['287系','289系']::text[])
 OR
 (source_template_id NOT IN(68244,68245,68251,68252,68314,68315,68168)
    AND train_type_urn<>'odpt.TrainType:JR-West.LimitedExpress'
    AND candidate_models=ARRAY['207系','321系','223系6000番台','225系6000番台']::text[])
 );

DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='Fukuchiyama')<>387
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet)<>357
 OR (SELECT count(*) FROM public.manual_timetable_templates
    WHERE id IN(68158,68159,68164,68170,68172,68312,68313)
    AND train_type_urn='odpt.TrainType:JR-West.Rapid')<>7
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet
    WHERE source_template_id IN(68158,68159,68164,68170,68172,68312,68313)
    AND train_type_urn='odpt.TrainType:JR-West.Rapid')<>7
 OR (SELECT count(*) FROM public.train_timetable_stops
    WHERE source_template_id IN(68314,68315))<>14
 OR (SELECT count(*) FROM public.train_timetable_stops
    WHERE source_template_id=68168)<>11
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet
    WHERE source_template_id IN(68314,68315,68168)
    AND candidate_models=ARRAY['287系','289系']::text[]
    AND train_type_urn='odpt.TrainType:JR-West.LimitedExpress')<>3
 OR (SELECT cardinality(operating_dates) FROM public.manual_timetable_templates
    WHERE id=68168)<>11
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet
    WHERE actual_vehicle_confirmed OR authorizes_png OR number_date_verified)>0
 THEN RAISE EXCEPTION 'Fukuchiyama November classification correction did not reconcile';
 END IF;
END $verify$;
COMMIT;
