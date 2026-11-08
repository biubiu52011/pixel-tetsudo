-- 2026-11 Fukuchiyama: systematically correct the historical 30xx/70xx
-- Kounotori source FAMILY; this is not a verification of the imported
-- stop clocks, an actual 287/289 formation, or a PNG/car position.
-- Official example numbers (JR-West): 3001M,3002M,7006M,7007M,7013M,
-- 7016M,7025M are all Kounotori LIMITED EXPRESS.
-- Existing historical source time records remain undated/unconfirmed.
BEGIN;
SELECT pg_advisory_xact_lock(26110839);
DO $guard$
DECLARE old_models text[] := ARRAY['207系','321系','223系6000番台','225系6000番台']::text[];
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates
     WHERE line_key='Fukuchiyama') <> 387
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet) <> 357
 OR (SELECT count(*) FROM public.manual_timetable_templates
     WHERE line_key='Fukuchiyama' AND train_number ~ '^(30|70)[0-9]{2}MH?$') <> 50
 OR (SELECT count(*) FROM public.manual_timetable_templates
     WHERE line_key='Fukuchiyama' AND train_number ~ '^(30|70)[0-9]{2}MH?$'
       AND train_type_urn='odpt.TrainType:JR-West.Local'
       AND operating_dates IS NULL) <> 43
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet
     WHERE source_train_number ~ '^(30|70)[0-9]{2}MH?$'
       AND train_type_urn='odpt.TrainType:JR-West.Local'
       AND candidate_models=old_models) <> 43
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet
     WHERE source_train_number ~ '^(30|70)[0-9]{2}MH?$'
       AND train_type_urn='odpt.TrainType:JR-West.LimitedExpress'
       AND candidate_models=ARRAY['287系','289系']::text[]) <> 7
 THEN RAISE EXCEPTION 'Fukuchiyama 30xx/70xx source version or evidence drifted';
 END IF;
END $guard$;

ALTER TABLE public.published_jrwest_fukuchiyama_2611_source_fleet
 DROP CONSTRAINT published_jrwest_fukuchiyama_2611_source_candidate_models_check;

-- Keep the actual historical timetable clocks exactly as imported.
-- Internal H = SaturdayHoliday, never the official public M suffix.
-- Holiday 700x extras were valid until 29 Nov; Fridays need separate
-- WEEKDAY source records and are not silently inferred here.
UPDATE public.manual_timetable_templates
SET train_type_urn='odpt.TrainType:JR-West.LimitedExpress',
    operating_dates=CASE WHEN train_number ~ '^70[0-9]{2}MH$' THEN
      ARRAY(SELECT d::date FROM generate_series(
       '2026-11-01'::date,'2026-11-29'::date,'1 day'::interval) d
       WHERE extract(isodow FROM d)::int IN (6,7)
          OR d::date IN ('2026-11-03'::date,'2026-11-23'::date))
      ELSE operating_dates END
WHERE line_key='Fukuchiyama'
  AND train_number ~ '^(30|70)[0-9]{2}MH?$'
  AND train_type_urn='odpt.TrainType:JR-West.Local';

UPDATE public.published_jrwest_fukuchiyama_2611_source_fleet
SET train_type_urn='odpt.TrainType:JR-West.LimitedExpress',
    candidate_models=ARRAY['287系','289系']::text[],
    fleet_reference_url='https://www.jr-odekake.net/railroad/train/kounotori/'
WHERE source_train_number ~ '^(30|70)[0-9]{2}MH?$'
  AND train_type_urn='odpt.TrainType:JR-West.Local';

ALTER TABLE public.published_jrwest_fukuchiyama_2611_source_fleet
 ADD CONSTRAINT published_jrwest_fukuchiyama_2611_source_candidate_models_check
 CHECK (
   (source_train_number ~ '^(30|70)[0-9]{2}MH?$'
     AND train_type_urn='odpt.TrainType:JR-West.LimitedExpress'
     AND candidate_models=ARRAY['287系','289系']::text[])
   OR
   (source_train_number !~ '^(30|70)[0-9]{2}MH?$'
     AND train_type_urn<>'odpt.TrainType:JR-West.LimitedExpress'
     AND candidate_models=ARRAY['207系','321系','223系6000番台','225系6000番台']::text[])
 );

DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='Fukuchiyama')<>387
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet)<>357
 OR (SELECT count(*) FROM public.manual_timetable_templates
      WHERE line_key='Fukuchiyama' AND train_number ~ '^(30|70)[0-9]{2}MH?$'
        AND train_type_urn='odpt.TrainType:JR-West.LimitedExpress')<>50
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet
      WHERE source_train_number ~ '^(30|70)[0-9]{2}MH?$'
        AND train_type_urn='odpt.TrainType:JR-West.LimitedExpress'
        AND candidate_models=ARRAY['287系','289系']::text[])<>50
 OR (SELECT count(*) FROM public.manual_timetable_templates
      WHERE line_key='Fukuchiyama' AND train_number ~ '^70[0-9]{2}MH$'
        AND cardinality(operating_dates)=11)<>6
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet
      WHERE actual_vehicle_confirmed OR authorizes_png OR number_date_verified)>0
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet
      WHERE candidate_png_paths<>ARRAY[]::text[])>0
 THEN RAISE EXCEPTION 'Fukuchiyama 30xx/70xx source-family correction failed';
 END IF;
END $verify$;
COMMIT;
