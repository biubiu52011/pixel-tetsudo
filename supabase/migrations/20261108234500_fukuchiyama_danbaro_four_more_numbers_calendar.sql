-- Additional verified JR-West November 2026 Danbaro Rapid numbers:
-- 2759M operates daily; 2763M/2764M/2766M are weekday-only.
-- Official evidence: 2759M JR train timetable/279111, 2763M
-- train-timetable/147051, 2764M /27131, 2766M /27151.
-- Source-only train type and calendar repairs. Do NOT certify historical
-- stop clocks, assign 223/225-6000 physical formations or borrow Hanwa PNG.
BEGIN;
SELECT pg_advisory_xact_lock(26110842);
DO $guard$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='Fukuchiyama')<>388
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet)<>357
 OR (SELECT count(*) FROM public.manual_timetable_templates
    WHERE id IN(68123,68125,68133,68134,68285,68286,68287,68288) AND operating_dates IS NULL)<>8
 OR (SELECT count(*) FROM public.manual_timetable_templates
    WHERE id IN(68123,68125,68133,68134,68285,68286,68287,68288) AND train_type_urn='odpt.TrainType:JR-West.Local')<>5
 OR (SELECT count(*) FROM public.manual_timetable_templates
    WHERE id IN(68123,68125,68133,68134,68285,68286,68287,68288) AND train_type_urn='odpt.TrainType:JR-West.Rapid')<>3
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet
    WHERE source_template_id IN(68123,68125,68133,68134,68285,68286,68287,68288)
       AND train_type_urn='odpt.TrainType:JR-West.Local')<>5
 OR (SELECT count(*) FROM public.train_timetable_stops
    WHERE source_template_id IN(68123,68125,68133,68134,68285,68286,68287,68288))<>128
 THEN RAISE EXCEPTION 'Fukuchiyama second Danbaro Rapid sources drifted';
 END IF;
END $guard$;

UPDATE public.manual_timetable_templates
SET train_type_urn='odpt.TrainType:JR-West.Rapid'
WHERE id IN(68123,68125,68133,68134,68285,68286,68287,68288) AND train_type_urn='odpt.TrainType:JR-West.Local';
UPDATE public.published_jrwest_fukuchiyama_2611_source_fleet
SET train_type_urn='odpt.TrainType:JR-West.Rapid'
WHERE source_template_id IN(68123,68125,68133,68134,68285,68286,68287,68288)
  AND train_type_urn='odpt.TrainType:JR-West.Local';

-- Keep the three holiday copies as historical data, not operating trips.
-- All three official public services are Saturday/holiday suspended.
UPDATE public.manual_timetable_templates
SET operating_dates=ARRAY[]::date[]
WHERE id IN(68134,68286,68288)
  AND calendar_urn='odpt.Calendar:SaturdayHoliday';

DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='Fukuchiyama')<>388
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet)<>357
 OR (SELECT count(*) FROM public.manual_timetable_templates
    WHERE id IN(68123,68125,68133,68134,68285,68286,68287,68288) AND train_type_urn='odpt.TrainType:JR-West.Rapid')<>8
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet
    WHERE source_template_id IN(68123,68125,68133,68134,68285,68286,68287,68288) AND train_type_urn='odpt.TrainType:JR-West.Rapid')<>8
 OR (SELECT count(*) FROM public.manual_timetable_templates
    WHERE id IN(68134,68286,68288)
     AND cardinality(operating_dates)=0)<>3
 OR (SELECT count(*) FROM public.train_timetable_stops WHERE source_template_id IN(68123,68125,68133,68134,68285,68286,68287,68288))<>128
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet
      WHERE authorizes_png OR actual_vehicle_confirmed OR number_date_verified)>0
 THEN RAISE EXCEPTION 'Second Danbaro Rapid category/calendar repair failed';
 END IF;
END $verify$;
COMMIT;
