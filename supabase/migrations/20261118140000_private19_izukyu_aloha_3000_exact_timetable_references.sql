-- Private19: Izukyu 3000 series "Aloha train" March-2026 historical timetable.
-- Primary source: Izukyu official March 14, 2026 daily train timetables:
-- Up: https://camel3.com/cms/files/izukyu/MASTER/1300/kGg2JheW.pdf
-- Down: https://camel3.com/cms/files/izukyu/MASTER/1300/lvfxkchq.pdf
-- Issuer timetable index: https://www.izukyu.co.jp/train/index.php
-- 3000 series = アロハ電車 per Izukyu operator:
-- https://www.izukyu.co.jp/train/train.php
-- Exact timetable number references, distinct services (NOT vehicle IDs):
-- Up 5644M,5652M,1658M; down 5645M,1653M,5659M.
-- Contemporary service cross-check (March 2026):
-- https://ss1.xrea.com/shirabetai.g1.xrea.com/unyou/20260314/ito_ikk.html
-- Adjacent 5644/5645 and 5652/5653 are two real, separate
-- published numbers each, compressed without skipping an unknown number.
-- Historical/reference ONLY; actual 2026-11 vehicle/formation NOT proven.
-- Izukyu 3000 PNG remains REVIEW-only; missing format verification.
-- Do NOT grant PNG automatic display, recolor other 8000 stock, invent
-- Ito-to-Izukyu operator entitlement, or bypass runtime line/date/type guards.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS (
    SELECT 1 FROM public.vehicle_image_assets
    WHERE image_path='images/列车/伊豆急行/伊豆急行_3000系.png'
      AND operator='Izukyu' AND vehicle_type='3000系'
      AND asset_status='review' AND asset_scope='review'
      AND is_generic=FALSE AND formation_id IS NULL AND car_id IS NULL
 ) THEN
   RAISE EXCEPTION 'Private19 Aloha 3000 REVIEW gallery record absent/changed';
 END IF;
 IF EXISTS (
   WITH proposed(num) AS (
     VALUES (1653),(1658),(5644),(5645),(5652),(5653),(5659)
   )
   SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges r
     ON r.edition='2611' AND r.line_key='Ito'
      AND r.suffix='M' AND p.num BETWEEN r.min_number AND r.max_number
 ) THEN RAISE EXCEPTION 'Private19 Aloha reference collides with existing PNG'; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','Ito','png_band/Ito/1653-1653M',1653,1653,'M',NULL,'../images/列车/伊豆急行/伊豆急行_3000系.png',NULL,FALSE,FALSE),
 ('2611','Ito','png_band/Ito/1658-1658M',1658,1658,'M',NULL,'../images/列车/伊豆急行/伊豆急行_3000系.png',NULL,FALSE,FALSE),
 ('2611','Ito','png_band/Ito/5644-5645M',5644,5645,'M',NULL,'../images/列车/伊豆急行/伊豆急行_3000系.png',NULL,FALSE,FALSE),
 ('2611','Ito','png_band/Ito/5652-5653M',5652,5653,'M',NULL,'../images/列车/伊豆急行/伊豆急行_3000系.png',NULL,FALSE,FALSE),
 ('2611','Ito','png_band/Ito/5659-5659M',5659,5659,'M',NULL,'../images/列车/伊豆急行/伊豆急行_3000系.png',NULL,FALSE,FALSE);
DO $verify$
DECLARE row_count integer; expanded_count integer;
BEGIN
 SELECT count(*),coalesce(sum(max_number-min_number+1),0)
   INTO row_count,expanded_count
 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Ito'
   AND png_reference='../images/列车/伊豆急行/伊豆急行_3000系.png' AND segment_key LIKE 'png_band/Ito/%'
   AND suffix='M' AND vehicle_model IS NULL AND source_url IS NULL
   AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
 IF row_count<>5 OR expanded_count<>7 THEN
   RAISE EXCEPTION 'Private19: expected five gap-free bands for seven published numbers, got %/%',row_count,expanded_count;
 END IF;
END;
$verify$;
COMMIT;
