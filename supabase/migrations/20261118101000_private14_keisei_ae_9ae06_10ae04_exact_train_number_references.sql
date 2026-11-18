-- Private14: Keisei AE exact OPERATING train-number references, NOT
-- commercial "Skyliner 10/12" service labels or fleet formation AE5/AE4.
-- 2026-10-04 dated filmed service: "9AE06" / Skyliner 10 / Keisei AE5.
-- https://www.tetsudo.com/movie/category/10551/
-- 2026-10-10 dated filmed service: "10AE04" / Skyliner 12 / Keisei AE4.
-- https://www.tetsudo.com/movie/category/10011/67.html
-- Exact full codes independently exist in the original
-- public.manual_timetable_templates NaritaSkyAccess manual owner, with
-- train_type_urn=odpt.TrainType:Keisei.Skyliner and vehicle_type_label=AE形.
-- https://github.com/biubiu52011/pixel-tetsudo/blob/main/data/timetables/NaritaSkyAccess-manual.js
-- Keisei official model: https://www.keisei.co.jp/keisei/keisei_museum/pictbook/
-- Keisei official Nov 2026 Skyliner service table:
-- https://www.keisei.co.jp/keisei/tetudou/skyliner/jp/traffic/skyliner_timetable.php
-- Keisei 2026-11-10 AE6 published fleet PLAN (NOT actual carset proof):
-- https://www.keisei.co.jp/cms/files/keisei/MASTER/0610/KnqP72dl.pdf
-- IMPORTANT: Nov 21/24 2026 timetable revision means October historical
-- numbers cannot certify actual service on every date in edition 2611.
-- Full train code is numeric hour PLUS operation suffix AE06/AE04,
-- not public service number 10/12, and not vehicle id AE6.
-- These are ONLY source-scoped PNG lookup references; runtime matching
-- must retain original source, train type, operator, date, line and
-- one-image conflict checks. Never unconditionally display from these.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS(
   SELECT 1 FROM public.vehicle_image_assets
   WHERE image_path='images/列车/京成電鉄/京成電鉄_AE形.png' AND operator='Keisei'
     AND vehicle_type='AE形' AND asset_status='available'
     AND file_format_status='native_png' AND asset_scope='generic'
     AND is_generic=TRUE AND formation_id IS NULL AND car_id IS NULL
 ) THEN RAISE EXCEPTION 'Private14: generic Keisei AE artwork unavailable or scope changed'; END IF;
 IF (SELECT count(DISTINCT train_number) FROM public.manual_timetable_templates
     WHERE line_key='NaritaSkyAccess' AND train_number IN ('9AE06','10AE04')
       AND train_type_urn='odpt.TrainType:Keisei.Skyliner'
       AND vehicle_type_label='AE形'
       AND source_path='data/timetables/NaritaSkyAccess-manual.js')<>2
 THEN RAISE EXCEPTION 'Private14: original full operation numbers / AE family crosswalk absent'; END IF;
 IF EXISTS(
    WITH proposed(min_number,suffix) AS (VALUES (9,'AE06'),(10,'AE04'))
    SELECT 1 FROM proposed p
    JOIN public.published_train_png_number_ranges r
    ON r.edition='2611' AND r.line_key='NaritaSkyAccess'
      AND r.suffix=p.suffix AND p.min_number BETWEEN r.min_number AND r.max_number
 ) THEN RAISE EXCEPTION 'Private14: existing exact full-number overlap'; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','NaritaSkyAccess','png_band/NaritaSkyAccess/0009-0009AE06',
  9,9,'AE06',NULL,'../images/列车/京成電鉄/京成電鉄_AE形.png',NULL,FALSE,FALSE),
 ('2611','NaritaSkyAccess','png_band/NaritaSkyAccess/0010-0010AE04',
  10,10,'AE04',NULL,'../images/列车/京成電鉄/京成電鉄_AE形.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges
    WHERE edition='2611' AND line_key='NaritaSkyAccess'
     AND png_reference='../images/列车/京成電鉄/京成電鉄_AE形.png'
     AND (
       (segment_key='png_band/NaritaSkyAccess/0009-0009AE06'
        AND min_number=9 AND max_number=9 AND suffix='AE06')
       OR
       (segment_key='png_band/NaritaSkyAccess/0010-0010AE04'
        AND min_number=10 AND max_number=10 AND suffix='AE04')
     )
     AND vehicle_model IS NULL AND source_url IS NULL
     AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>2
 THEN RAISE EXCEPTION 'Private14: two exact operation-number references not persisted'; END IF;
END;
$verify$;
COMMIT;
