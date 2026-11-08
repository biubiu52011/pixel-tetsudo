-- Source-only correction: JR-West November 2026 official Danbaro Rapid
-- NUMBER/TREE/OPERATING-CALENDAR proof, not a claim that the old imported
-- minute-by-minute timetable or actual rolling stock is date-certified.
-- Verified published numbers: 2751, 2753, 2765, 2772, 2777, 2778,
-- 2779, 2786. See docs/fukuchiyama-line-completion-20261108.md.
-- 2751M and 2778M do not operate Sat/Holiday; original .MH copies
-- remain for provenance but must be excluded from projected runs.
BEGIN;
SELECT pg_advisory_xact_lock(26110841);
DO $guard$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates
      WHERE line_key='Fukuchiyama')<>388
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet)<>357
 OR (SELECT count(*) FROM public.manual_timetable_templates WHERE id IN(68099,68100,68107,68108,68141,68143,68299,68300,68176,68177,68310,68311,68184,68185,68322,68323)
      AND line_key='Fukuchiyama' AND operating_dates IS NULL)<>16
 OR (SELECT count(*) FROM public.manual_timetable_templates WHERE id IN(68099,68100,68107,68108,68141,68143,68299,68300,68176,68177,68310,68311,68184,68185,68322,68323)
      AND train_type_urn='odpt.TrainType:JR-West.Local')<>15
 OR (SELECT count(*) FROM public.manual_timetable_templates WHERE id=68311
      AND train_number='2778MH' AND train_type_urn='odpt.TrainType:JR-West.Rapid')<>1
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet
      WHERE source_template_id IN(68099,68100,68107,68108,68141,68143,68299,68300,68176,68177,68310,68311,68184,68185,68322,68323)
        AND train_type_urn='odpt.TrainType:JR-West.Local'
        AND candidate_models=ARRAY['207系','321系','223系6000番台','225系6000番台']::text[])<>15
 THEN RAISE EXCEPTION 'Fukuchiyama eight official Danbaro Rapid sources drifted';
 END IF;
END $guard$;
-- Keep the existing 15/16-stop historical time samples intact.
UPDATE public.manual_timetable_templates
SET train_type_urn='odpt.TrainType:JR-West.Rapid'
WHERE id IN(68099,68100,68107,68108,68141,68143,68299,68300,68176,68177,68310,68311,68184,68185,68322,68323)
AND train_type_urn='odpt.TrainType:JR-West.Local';
UPDATE public.published_jrwest_fukuchiyama_2611_source_fleet
SET train_type_urn='odpt.TrainType:JR-West.Rapid'
WHERE source_template_id IN(68099,68100,68107,68108,68141,68143,68299,68300,68176,68177,68310,68311,68184,68185,68322,68323)
AND train_type_urn='odpt.TrainType:JR-West.Local';

-- 2751M is a WEEKDAY-only G Tambaji Rapid, and 2778M is also
-- Saturday/holiday SUSPENDED according to the official daily timetable.
-- These two historical SaturdayHoliday copies are not valid operating
-- sources. Empty date[] means no projected service; no row is deleted.
UPDATE public.manual_timetable_templates
SET operating_dates=ARRAY[]::date[]
WHERE id IN(68100,68311)
  AND calendar_urn='odpt.Calendar:SaturdayHoliday';

DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates
      WHERE line_key='Fukuchiyama')<>388
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet)<>357
 OR (SELECT count(*) FROM public.manual_timetable_templates WHERE id IN(68099,68100,68107,68108,68141,68143,68299,68300,68176,68177,68310,68311,68184,68185,68322,68323)
      AND train_type_urn='odpt.TrainType:JR-West.Rapid')<>16
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet
      WHERE source_template_id IN(68099,68100,68107,68108,68141,68143,68299,68300,68176,68177,68310,68311,68184,68185,68322,68323)
        AND train_type_urn='odpt.TrainType:JR-West.Rapid')<>16
 OR (SELECT count(*) FROM public.manual_timetable_templates
      WHERE id IN(68100,68311) AND cardinality(operating_dates)=0)<>2
 OR (SELECT count(*) FROM public.train_timetable_stops
      WHERE source_template_id IN(68099,68100,68107,68108,68141,68143,68299,68300,68176,68177,68310,68311,68184,68185,68322,68323))<>254
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet
      WHERE authorizes_png OR actual_vehicle_confirmed OR number_date_verified)>0
 THEN RAISE EXCEPTION 'Eight Danbaro Rapid normalization failed';
 END IF;
END $verify$;
COMMIT;
