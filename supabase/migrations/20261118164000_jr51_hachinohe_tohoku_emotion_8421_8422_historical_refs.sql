-- JR51 / Hachinohe: TOHOKU EMOTION historical 2026 train numbers ONLY.
-- Dated Jun 2026 ride with exact full numbers 8421D and 8422D:
-- https://hop-step-back.hatenablog.com/entry/2026/09/25/000000
-- Independent eyewitness on 2026-10-31 confirms 8421D:
-- https://g-tkyo.hatenablog.com/entry/2026/11/06/180000
-- JR East official service / Hachinohe-Kuji corridor:
-- https://www.jreast.co.jp/tohokuemotion/
-- Dedicated 3-car KiHa 110 derivative identity:
-- https://www.toretabi.jp/train/vol84/01.html
-- IMPORTANT: not official 2026-11 train timetable evidence, NOT a live carset.
-- Vehicle image asset_scope=review is intentionally unchanged.
-- These two singleton PNG references grant NO runtime display authorization;
-- honor existing day, service, train identity, and candidate-ambiguity guards.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.vehicle_image_assets
   WHERE image_path='images/列车/JR東日本/JR東日本_キハ110系_TOHOKU_EMOTION.png'
     AND operator='JR-East' AND vehicle_type='キハ110系'
     AND asset_status='available' AND file_format_status='native_png'
     AND asset_scope='review' AND appearance_class='dedicated_vehicle_identity'
     AND is_generic=FALSE AND formation_id IS NULL AND car_id IS NULL
 ) THEN RAISE EXCEPTION 'JR51: reviewed TOHOKU EMOTION gallery identity changed'; END IF;
 IF EXISTS (
  SELECT 1 FROM public.published_train_png_number_ranges
   WHERE edition='2611' AND line_key='Hachinohe' AND suffix='D'
     AND ((8421 BETWEEN min_number AND max_number)
       OR (8422 BETWEEN min_number AND max_number))
 ) THEN RAISE EXCEPTION 'JR51: Hachinohe 8421D or 8422D already assigned'; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,
  vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','Hachinohe','png_band/Hachinohe/8421-8421D',8421,8421,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系_TOHOKU_EMOTION.png',NULL,FALSE,FALSE),
 ('2611','Hachinohe','png_band/Hachinohe/8422-8422D',8422,8422,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系_TOHOKU_EMOTION.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges
   WHERE edition='2611' AND line_key='Hachinohe' AND suffix='D'
     AND png_reference='../images/列车/JR東日本/JR東日本_キハ110系_TOHOKU_EMOTION.png'
     AND segment_key IN ('png_band/Hachinohe/8421-8421D','png_band/Hachinohe/8422-8422D')
     AND min_number=max_number
     AND vehicle_model IS NULL AND source_url IS NULL
     AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>2
 THEN RAISE EXCEPTION 'JR51: historical reference verification failed'; END IF;
END;
$verify$;
COMMIT;
