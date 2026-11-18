-- Third06 A: 2024-10-04 Isumi Railway derailment at Kuniyoshi-Kazusa-Nakagawa.
-- Isumi Railway OFFICIAL operator report explicitly identifies 5D, 2 cars
-- no.351 and no.352, both Isumi 350 stock: https://isumirail.co.jp/blog/archives/9701
-- National official 2025 JTSB accident report confirms 5D and both cars:
-- https://jtsb.mlit.go.jp/railway/rep-acci/RA2025-5-1.pdf
-- Operator official current suspension: https://isumirail.co.jp/unkoualert
-- As at 2026-11 Isumi railway line is fully suspended; this is a dated
-- historical reference only. 5D must NOT create an active train in 2026.
-- Data-only route key Isumi: not currently a runnable line in railway-data.
-- The other Isumi 300-series PNG remains UNMAPPED; do not assign it 5D.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.vehicle_image_assets
  WHERE image_path='images/列车/いすみ鉄道/いすみ鉄道_いすみ350型.png' AND operator='Isumi'
   AND vehicle_type='いすみ350型' AND asset_status='available'
   AND file_format_status='native_png' AND asset_scope='generic'
   AND is_generic=TRUE AND formation_id IS NULL AND car_id IS NULL
 ) THEN RAISE EXCEPTION 'Third06 Isumi 350 artwork changed'; END IF;
 IF EXISTS (
  SELECT 1 FROM public.published_train_png_number_ranges r
  WHERE r.edition='2611' AND r.line_key='Isumi' AND r.suffix='D'
   AND 5 BETWEEN r.min_number AND r.max_number
 ) THEN RAISE EXCEPTION 'Third06 Isumi 5D already claimed'; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,
  vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','Isumi','png_band/Isumi/0005-0005D',5,5,'D',NULL,'../images/列车/いすみ鉄道/いすみ鉄道_いすみ350型.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
  WHERE edition='2611' AND line_key='Isumi'
   AND segment_key='png_band/Isumi/0005-0005D'
   AND min_number=5 AND max_number=5 AND suffix='D'
   AND png_reference='../images/列车/いすみ鉄道/いすみ鉄道_いすみ350型.png'
   AND vehicle_model IS NULL AND source_url IS NULL
   AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'Third06 Isumi 5D reference missing'; END IF;
END;
$verify$;
COMMIT;
