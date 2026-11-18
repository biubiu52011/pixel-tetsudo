-- JR55: JR-West SaninMain, KiHa 187 'Super Oki' exact number reference.
-- JR-West official 2026 train timetable 3001D / Super Oki 1:
-- https://timetable.jr-odekake.net/train-timetable/76221?date=20261004
-- JR-West official 2026-11-07 timetable 3002D / Super Oki 2:
-- https://timetable.jr-odekake.net/train-timetable/76392?date=20261107
-- JR-West official association of KiHa 187 trainsets with Super Oki:
-- https://www.westjr.co.jp/press/article/2014/08/page_6041.html
-- Note: fleet document is historical; it does not prove today's physical train.
-- These TWO ADJACENT numbers are explicitly verified. Compress only 3001-3002.
-- Never infer 3000D, 3003D or daily formation from the service name.
-- Scope solely SaninMain, not Yamaguchi or other through-route keys.
-- Reference only: PNG remains review/requires_review/not validated native PNG.
-- No addition to runtime auto-image matcher, no current rolling-stock claim.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.vehicle_image_assets
   WHERE image_path='images/列车/JR西日本/JR西日本_187系.png'
     AND operator='JR-West' AND vehicle_type='187系'
     AND asset_status='review' AND asset_scope='review'
     AND appearance_class='requires_review'
     AND file_format_status IS NULL AND is_generic=FALSE
     AND formation_id IS NULL AND car_id IS NULL
 ) THEN RAISE EXCEPTION 'JR55: 187-series gallery review asset changed'; END IF;
 IF EXISTS (
  SELECT 1 FROM public.published_train_png_number_ranges
   WHERE edition='2611' AND line_key='SaninMain' AND suffix='D'
     AND (3001 BETWEEN min_number AND max_number
       OR 3002 BETWEEN min_number AND max_number)
 ) THEN RAISE EXCEPTION 'JR55: SaninMain 3001D/3002D overlap'; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,
 vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
('2611','SaninMain','png_band/SaninMain/3001-3002D',3001,3002,'D',
 NULL,'../images/列车/JR西日本/JR西日本_187系.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
    WHERE edition='2611' AND line_key='SaninMain' AND suffix='D'
      AND segment_key='png_band/SaninMain/3001-3002D'
      AND min_number=3001 AND max_number=3002
      AND png_reference='../images/列车/JR西日本/JR西日本_187系.png'
      AND vehicle_model IS NULL AND source_url IS NULL
      AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'JR55: official-number PNG reference did not verify'; END IF;
END;
$verify$;
COMMIT;
