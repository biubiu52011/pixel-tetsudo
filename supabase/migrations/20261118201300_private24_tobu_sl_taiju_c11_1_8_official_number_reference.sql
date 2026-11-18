-- Private24: 2026-03-14 official Tobu service timetable: SL Taiju 1,3,5,7 down, 2,4,6,8 up (no suffix).
-- https://www.tobu.co.jp/pdf/timetable/time-table_01_kudari.pdf
-- https://www.tobu.co.jp/pdf/timetable/time-table_01_nobori.pdf
-- Official November 2026 SL/DL operating notice: numbers 1,2,5,6 may be DL (DE10).
-- https://www.tobu.co.jp/cms-pdf/news/20261111160137z8kRudN-y-N9lHID0QGO5g.pdf
-- NUMBER SOURCE ONLY: NEVER infer C11 locomotive from a train number or authorize runtime PNG.
-- Keep C11, 12-series and 14-series SL Taiju artwork review-only, no competing car illustrations.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.vehicle_image_assets
  WHERE image_path='images/列车/東武鉄道/東武鉄道_C11形_SL大樹.png' AND operator='Tobu' AND vehicle_type='C11形'
    AND asset_status='available' AND file_format_status='native_png'
    AND asset_scope='review' AND appearance_class='dedicated_vehicle_identity'
    AND is_generic=FALSE AND formation_id IS NULL AND car_id IS NULL
 ) THEN RAISE EXCEPTION 'Private24: C11 review asset guard changed'; END IF;
 IF EXISTS (
  SELECT 1 FROM public.published_train_png_number_ranges r
  WHERE r.edition='2611' AND r.line_key='Nikkoku' AND r.suffix=''
    AND r.min_number<=8 AND r.max_number>=1
 ) THEN RAISE EXCEPTION 'Private24: preexisting service number conflict'; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,
 vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','Nikkoku','png_band/Nikkoku/0001-0008',1,8,'',
  NULL,'../images/列车/東武鉄道/東武鉄道_C11形_SL大樹.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
   WHERE edition='2611' AND line_key='Nikkoku'
   AND segment_key='png_band/Nikkoku/0001-0008'
   AND min_number=1 AND max_number=8 AND suffix=''
   AND png_reference='../images/列车/東武鉄道/東武鉄道_C11形_SL大樹.png'
   AND vehicle_model IS NULL AND source_url IS NULL
   AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE) <> 1
 THEN RAISE EXCEPTION 'Private24: inserted reference count invalid'; END IF;
END;
$verify$;
COMMIT;
