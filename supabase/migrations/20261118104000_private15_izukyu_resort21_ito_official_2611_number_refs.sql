-- Private15: Izukyu Resort21 original company-published November 2026
-- monthly train-number AND planned vehicle scheduling evidence.
-- Official Izukyu November timetable revised 2026-11-11:
-- https://camel3.com/cms/files/izukyu/MASTER/1310/YtTDpBwA.pdf
-- Official operator site confirms 2100 series Resort21 Kurofune/Kinme:
-- https://www.izukyu.co.jp/resort21/index.php?id=resort
-- https://www.izukyu.co.jp/train/train.php
-- A: 5631M,5643M,5657M (out); 5630M,5642M,5656M (in).
-- B: 5637M,5649M (out); 5636M,5648M (in).
-- The PDF enumerates each full train number and passes Ito (Atami-Ito).
-- Exactly ten 2611 official scheduled numbers, five no-gap pairs:
-- 5630-5631M, 5636-5637M, 5642-5643M, 5648-5649M, 5656-5657M.
-- The PDF ALSO identifies substitute 8000-series days; it schedules
-- BLACK SHIP / KINME separately by A/B service and date.
-- These are illustrated 2100-family PNG REFERENCES only; no assignment
-- to 2100 on dates showing 8000, no claim of specific livery/formation.
-- The single original gallery line scope is Ito, not Izukyu; these
-- ten trains traverse Ito, so DO NOT create an unrelated Izukyu line mapping.
-- The PDF also lists bare 661 and 704 within the Izukyu-only section;
-- those are EXCLUDED because they do not run on the original Ito gallery line.
-- Preserve original service-date, direction, class, operator, source and
-- vehicle assignment guards. Do not alter front-end selection priority.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS(
   SELECT 1 FROM public.vehicle_image_assets
   WHERE image_path='images/列车/伊豆急行/伊豆急行_2100系.png' AND operator='Izukyu'
     AND vehicle_type='2100系' AND asset_status='available'
     AND asset_scope='generic' AND is_generic=TRUE
     AND file_format_status='native_png'
     AND formation_id IS NULL AND car_id IS NULL
 ) THEN RAISE EXCEPTION 'Private15: generic Izukyu 2100 image not eligible'; END IF;
 IF (SELECT count(DISTINCT train_number)
     FROM public.manual_timetable_templates
     WHERE line_key='Ito'
       AND train_number IN ('5630M','5631M','5636M','5637M','5642M','5643M','5648M','5649M','5656M','5657M')
       AND train_type_urn='odpt.TrainType:JR-East.Local'
       AND source_path='data/timetables/Ito-manual.js'
       AND vehicle_type_label LIKE '%伊豆急行2100系%')<>10
 THEN RAISE EXCEPTION 'Private15: 10 existing original train numbers or candidate family missing'; END IF;
 IF EXISTS(
   WITH proposed(min_number,max_number) AS (VALUES (5630,5631), (5636,5637), (5642,5643), (5648,5649), (5656,5657))
   SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges r
   ON r.edition='2611' AND r.line_key='Ito' AND r.suffix='M'
      AND p.min_number<=r.max_number AND r.min_number<=p.max_number
 ) THEN RAISE EXCEPTION 'Private15: conflict with an existing Ito M band'; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','Ito','png_band/Ito/5630-5631M',5630,5631,'M',NULL,
  '../images/列车/伊豆急行/伊豆急行_2100系.png',NULL,FALSE,FALSE),
 ('2611','Ito','png_band/Ito/5636-5637M',5636,5637,'M',NULL,
  '../images/列车/伊豆急行/伊豆急行_2100系.png',NULL,FALSE,FALSE),
 ('2611','Ito','png_band/Ito/5642-5643M',5642,5643,'M',NULL,
  '../images/列车/伊豆急行/伊豆急行_2100系.png',NULL,FALSE,FALSE),
 ('2611','Ito','png_band/Ito/5648-5649M',5648,5649,'M',NULL,
  '../images/列车/伊豆急行/伊豆急行_2100系.png',NULL,FALSE,FALSE),
 ('2611','Ito','png_band/Ito/5656-5657M',5656,5657,'M',NULL,
  '../images/列车/伊豆急行/伊豆急行_2100系.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges
     WHERE edition='2611' AND line_key='Ito'
       AND png_reference='../images/列车/伊豆急行/伊豆急行_2100系.png' AND suffix='M'
       AND segment_key LIKE 'png_band/Ito/%'
       AND vehicle_model IS NULL AND source_url IS NULL
       AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>5
 THEN RAISE EXCEPTION 'Private15: five no-gap Resort21 reference bands not persisted'; END IF;
 IF (SELECT sum(max_number-min_number+1)
     FROM public.published_train_png_number_ranges
     WHERE edition='2611' AND line_key='Ito'
       AND png_reference='../images/列车/伊豆急行/伊豆急行_2100系.png' AND suffix='M')<>10
 THEN RAISE EXCEPTION 'Private15: reference numbers not exactly ten'; END IF;
END;
$verify$;
COMMIT;
