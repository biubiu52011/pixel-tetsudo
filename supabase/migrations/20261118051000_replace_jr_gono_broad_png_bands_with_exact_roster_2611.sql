-- JR32: Gono D-number gallery references from the existing 2026-11 exact JS lists.
-- 47 source train numbers -> 26 gap-free numeric bands, no fictitious intermediate numbers.
-- Keep existing per-line, operator, date, train-type and model constraints in the original JS.
-- This is only a planned PNG illustration; NOT actual vehicle formation proof.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.vehicle_image_assets WHERE image_path='images/列车/JR東日本/JR東日本_GV-E400系.png' AND asset_status='available' AND file_format_status='native_png') THEN RAISE EXCEPTION 'Gono: PNG not available'; END IF;
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='Gono' AND png_reference='../images/列车/JR東日本/JR東日本_GV-E400系.png' AND suffix='D' AND ( (segment_key='png_band/Gono/0122-2839D' AND min_number=122 AND max_number=2839) OR (segment_key='png_band/Gono/3524-3526D' AND min_number=3524 AND max_number=3526) ) AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE) <> 2 THEN RAISE EXCEPTION 'Gono: old seed rows changed'; END IF;
 IF EXISTS (WITH proposed(min_number,max_number) AS (VALUES
    (122,128),
    (130,135),
    (137,137),
    (223,225),
    (320,323),
    (325,326),
    (328,328),
    (620,620),
    (623,623),
    (821,822),
    (825,825),
    (827,827),
    (832,832),
    (836,838),
    (2525,2525),
    (2529,2529),
    (2531,2531),
    (2533,2533),
    (2823,2823),
    (2826,2826),
    (2828,2828),
    (2830,2830),
    (2834,2835),
    (2839,2839),
    (3524,3524),
    (3526,3526)
   ) SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges existing
    ON existing.edition='2611' AND existing.line_key='Gono' AND existing.suffix='D' AND existing.segment_key LIKE 'png_band/%' AND existing.png_reference<>'../images/列车/JR東日本/JR東日本_GV-E400系.png'
    AND p.min_number<=existing.max_number AND existing.min_number<=p.max_number)
 THEN RAISE EXCEPTION 'Gono: cross PNG conflict'; END IF;
END;
$preflight$;
DELETE FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='Gono' AND png_reference='../images/列车/JR東日本/JR東日本_GV-E400系.png' AND suffix='D' AND ( (segment_key='png_band/Gono/0122-2839D' AND min_number=122 AND max_number=2839) OR (segment_key='png_band/Gono/3524-3526D' AND min_number=3524 AND max_number=3526) ) AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed) VALUES
  ('2611','Gono','png_band/Gono/0122-0128D',122,128,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/0130-0135D',130,135,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/0137-0137D',137,137,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/0223-0225D',223,225,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/0320-0323D',320,323,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/0325-0326D',325,326,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/0328-0328D',328,328,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/0620-0620D',620,620,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/0623-0623D',623,623,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/0821-0822D',821,822,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/0825-0825D',825,825,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/0827-0827D',827,827,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/0832-0832D',832,832,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/0836-0838D',836,838,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/2525-2525D',2525,2525,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/2529-2529D',2529,2529,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/2531-2531D',2531,2531,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/2533-2533D',2533,2533,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/2823-2823D',2823,2823,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/2826-2826D',2826,2826,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/2828-2828D',2828,2828,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/2830-2830D',2830,2830,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/2834-2835D',2834,2835,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/2839-2839D',2839,2839,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/3524-3524D',3524,3524,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE),
  ('2611','Gono','png_band/Gono/3526-3526D',3526,3526,'D',NULL,'../images/列车/JR東日本/JR東日本_GV-E400系.png',NULL,FALSE,FALSE);
DO $verify$
DECLARE expected_rows integer; total_numbers integer;
BEGIN
 SELECT count(*),COALESCE(sum(max_number-min_number+1),0) INTO expected_rows,total_numbers FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='Gono' AND segment_key LIKE 'png_band/Gono/%' AND png_reference='../images/列车/JR東日本/JR東日本_GV-E400系.png' AND suffix='D' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
 IF expected_rows <> 26 OR total_numbers <> 47 THEN RAISE EXCEPTION 'Gono: expected 26 bands/47 numbers, got %/%',expected_rows,total_numbers; END IF;
 IF EXISTS(SELECT 1 FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='Gono' AND ( segment_key='png_band/Gono/0122-2839D' OR segment_key='png_band/Gono/3524-3526D' )) THEN RAISE EXCEPTION 'Gono: retired broad row still present'; END IF;
END;
$verify$;
COMMIT;
