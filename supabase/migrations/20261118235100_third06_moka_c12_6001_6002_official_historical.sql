-- Third06 B: Moka Railway C12 No.66 "SL Moka" 6001 / 6002.
-- Moka OFFICIAL operator service numbers (historical 2024):
-- https://www.moka-railway.co.jp/36255/
-- 6001 (down Shimodate 10:35 -> Motegi 12:06),
-- 6002 (up Motegi 14:28 -> Shimodate 15:58).
-- Moka OFFICIAL locomotive C12 66:
-- https://www.moka-railway.co.jp/slmoka-intro/
-- 2026 FULL SUSPENSION through 2027-03-31:
-- https://www.moka-railway.co.jp/suspension/
-- Numbers are documented historical services; the 2024-09 cancellation
-- notice itself does NOT mean a trip actually ran on the cancelled dates.
-- No active 2026 service, no live PNG authorization, no inferred consist.
-- Data-only line key Moka: not a current railway-data runnable route.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.vehicle_image_assets
  WHERE image_path='images/列车/真岡鐵道/真岡鐵道_C12形_C1266_SLもおか.png' AND operator='MokaRailway'
   AND vehicle_type='C12形' AND asset_status='available'
   AND file_format_status='native_png' AND asset_scope='review'
   AND appearance_class='dedicated_vehicle_identity' AND is_generic=FALSE
   AND formation_id IS NULL AND car_id IS NULL
 ) THEN RAISE EXCEPTION 'Third06 Moka C12 historic artwork changed'; END IF;
 IF EXISTS (
  SELECT 1 FROM public.published_train_png_number_ranges r
  WHERE r.edition='2611' AND r.line_key='Moka' AND r.suffix=''
   AND r.min_number<=6002 AND r.max_number>=6001
 ) THEN RAISE EXCEPTION 'Third06 Moka 6001-6002 already claimed'; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,
  vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','Moka','png_band/Moka/6001-6002',6001,6002,'',NULL,'../images/列车/真岡鐵道/真岡鐵道_C12形_C1266_SLもおか.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
  WHERE edition='2611' AND line_key='Moka'
   AND segment_key='png_band/Moka/6001-6002'
   AND min_number=6001 AND max_number=6002 AND suffix=''
   AND png_reference='../images/列车/真岡鐵道/真岡鐵道_C12形_C1266_SLもおか.png'
   AND vehicle_model IS NULL AND source_url IS NULL
   AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'Third06 Moka 6001-6002 source reference missing'; END IF;
END;
$verify$;
COMMIT;
