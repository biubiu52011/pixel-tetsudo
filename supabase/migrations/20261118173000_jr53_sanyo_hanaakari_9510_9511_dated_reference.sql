-- JR53: JR-West Hanaakari special train, 2026 fall Sanyo Main.
-- Official JR-West exact train 9510D to Iwakuni, published dated service:
-- https://timetable.jr-odekake.net/train-timetable/385421?date=20261031
-- Official JR-West exact train 9511D to Shin-Yamaguchi:
-- https://timetable.jr-odekake.net/train-timetable/385431?date=20261025
-- Official 2026 autumn operation corridor Shin-Yamaguchi - Iwakuni (Sanyo Main):
-- https://www.jr-odekake.net/railroad/hanaakari/operation_2610/
-- Rolling stock: the named dedicated service derives from rebuilt KiHa 189
-- 3-car set (KiRo 189/188; vehicle designation is NOT a train number):
-- https://railf.jp/news/2024/06/28/052000.html
--
-- These are EXACT dated timetable references only, not daily or live runs.
-- Official operating dates include 2026-11-07/08/22/23/28/29; not 11-18.
-- The physical PNG stays in review; never auto-promote a renamed KiRo body
-- from a KiHa filename or assign by number alone. NO runtime override.
-- Scope SanyoMain ONLY: do not infer SaninMain or other previous routes.
-- Only 9510D and 9511D are proven here. No neighboring number inference.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.vehicle_image_assets
  WHERE image_path='images/列车/JR西日本/JR西日本_キハ189系_はなあかり.png'
    AND operator='JR-West' AND vehicle_type='キハ189系'
    AND asset_status='review' AND asset_scope='review'
    AND appearance_class='requires_review' AND file_format_status IS NULL
    AND is_generic=FALSE AND formation_id IS NULL AND car_id IS NULL
 ) THEN
  RAISE EXCEPTION 'JR53: Hanaakari gallery review-only image record changed';
 END IF;
 IF EXISTS (
  SELECT 1 FROM public.published_train_png_number_ranges r
  WHERE r.edition='2611' AND r.line_key='SanyoMain' AND r.suffix='D'
    AND r.min_number<=9511 AND r.max_number>=9510
 ) THEN
  RAISE EXCEPTION 'JR53: official Hanaakari Sanyo train-number collision';
 END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','SanyoMain','png_band/SanyoMain/9510-9511D',9510,9511,'D',NULL,'../images/列车/JR西日本/JR西日本_キハ189系_はなあかり.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
  WHERE edition='2611' AND line_key='SanyoMain'
    AND segment_key='png_band/SanyoMain/9510-9511D'
    AND min_number=9510 AND max_number=9511 AND suffix='D'
    AND png_reference='../images/列车/JR西日本/JR西日本_キハ189系_はなあかり.png'
    AND vehicle_model IS NULL AND source_url IS NULL
    AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'JR53: exact historical reference verification failed'; END IF;
END;
$verify$;
COMMIT;
