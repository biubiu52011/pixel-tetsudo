-- Third08: Operator-published 2026 numbered Watarase tourist services.
-- https://www.watetsu.com/sightseeing/train.php
-- https://watetsu.com/train/torowasshi.php
-- 2026 April-November operation days only; July-September suspended, and not daily. The WKT-510 accompanying car stays unnumbered.
-- DATA-ONLY line WataraseKeikoku, not a runnable current railway-data line.
-- No automatic 2026-11 actual vehicle/formation assertion; no other PNG chosen.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.vehicle_image_assets
  WHERE image_path='images/列车/わたらせ渓谷鉄道/わたらせ渓谷鉄道_WKT-550形_わっしー.png' AND operator='Watarase'
   AND vehicle_type='WKT-550形' AND asset_status='available'
   AND file_format_status='native_png'
   AND asset_scope='review' AND is_generic=FALSE
   AND appearance_class='dedicated_vehicle_identity'
   AND formation_id IS NULL AND car_id IS NULL)
 THEN RAISE EXCEPTION 'Third08: Watarase PNG contract changed'; END IF;
 IF EXISTS (WITH proposed(num) AS (VALUES (8715),(8718),(8721),(8724))
  SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges r
   ON r.edition='2611' AND r.line_key='WataraseKeikoku' AND r.suffix='D'
    AND p.num BETWEEN r.min_number AND r.max_number)
 THEN RAISE EXCEPTION 'Third08: numbered tourist service already mapped'; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,
  vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','WataraseKeikoku','png_band/WataraseKeikoku/8715-8715D',8715,8715,'D',NULL,'../images/列车/わたらせ渓谷鉄道/わたらせ渓谷鉄道_WKT-550形_わっしー.png',NULL,FALSE,FALSE),
 ('2611','WataraseKeikoku','png_band/WataraseKeikoku/8718-8718D',8718,8718,'D',NULL,'../images/列车/わたらせ渓谷鉄道/わたらせ渓谷鉄道_WKT-550形_わっしー.png',NULL,FALSE,FALSE),
 ('2611','WataraseKeikoku','png_band/WataraseKeikoku/8721-8721D',8721,8721,'D',NULL,'../images/列车/わたらせ渓谷鉄道/わたらせ渓谷鉄道_WKT-550形_わっしー.png',NULL,FALSE,FALSE),
 ('2611','WataraseKeikoku','png_band/WataraseKeikoku/8724-8724D',8724,8724,'D',NULL,'../images/列车/わたらせ渓谷鉄道/わたらせ渓谷鉄道_WKT-550形_わっしー.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
  WHERE edition='2611' AND line_key='WataraseKeikoku' AND suffix='D'
   AND png_reference='../images/列车/わたらせ渓谷鉄道/わたらせ渓谷鉄道_WKT-550形_わっしー.png'
   AND min_number=max_number AND min_number IN (8715,8718,8721,8724)
   AND segment_key LIKE 'png_band/WataraseKeikoku/%'
   AND vehicle_model IS NULL AND source_url IS NULL
   AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>4
 THEN RAISE EXCEPTION 'Third08: exact official number references missing'; END IF;
END;
$verify$;
COMMIT;
