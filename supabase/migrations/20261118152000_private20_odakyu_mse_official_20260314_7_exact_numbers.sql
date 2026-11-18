-- Private20: Odakyu 60000 MSE historical timetable references, 2026-03-14 revision.
-- DIRECT OFFICIAL source with 列車番号 and 車型 (M = MSE 60000):
-- https://www.odakyu.jp/romancecar/timetable/doc/260314/weekday_down2026.pdf
-- https://www.odakyu.jp/romancecar/timetable/doc/260314/weekday_up2026.pdf
-- Operator official explanation for M / E / G and service-day changes:
-- https://www.odakyu.jp/romancecar/timetable/weekday/up/
-- Verified up numbers: 0012, 0404M, 0420, 0732.
-- Verified down numbers: 0009, 0403M, 0421.
-- 0403M and 0404M explicitly include suffix M IN 列車番号.
-- The other five train numbers have no suffix, even though 車型 is M.
-- Both 403M/404M and 420/421 are two distinct listed trains; 
-- compressed into compact intervals ONLY because both endpoints documented.
-- These are historical TIMETABLE references, not today's actual formations.
-- PNG is native but asset_scope='review' (non-generic), so don't auto-show.
-- Respect calendar/line/operator/vehicle/unique-match/asset guardrails.
BEGIN;
DO $preflight$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.vehicle_image_assets
    WHERE image_path='images/列车/小田急電鉄/小田急電鉄_60000形_MSE.png'
      AND operator='Odakyu' AND vehicle_type='60000形'
      AND asset_status='available' AND file_format_status='native_png'
      AND asset_scope='review' AND is_generic=FALSE
      AND formation_id IS NULL AND car_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Private20 MSE source-only review gallery record absent/changed';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM (VALUES (9,''),(12,''),(403,'M'),(404,'M'),(420,''),(421,''),(732,'')) proposed(number,suffix)
    JOIN public.published_train_png_number_ranges r
      ON r.edition='2611' AND r.line_key='Odawara'
     AND r.suffix=proposed.suffix
     AND proposed.number BETWEEN r.min_number AND r.max_number
  ) THEN
    RAISE EXCEPTION 'Private20 exact official MSE numbers overlap pre-existing Odawara imagery';
  END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges (
  edition,line_key,segment_key,min_number,max_number,suffix,
  vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed
) VALUES
  ('2611','Odawara','png_band/Odawara/0009-0009',9,9,'',NULL,'../images/列车/小田急電鉄/小田急電鉄_60000形_MSE.png',NULL,FALSE,FALSE),
  ('2611','Odawara','png_band/Odawara/0012-0012',12,12,'',NULL,'../images/列车/小田急電鉄/小田急電鉄_60000形_MSE.png',NULL,FALSE,FALSE),
  ('2611','Odawara','png_band/Odawara/0403-0404M',403,404,'M',NULL,'../images/列车/小田急電鉄/小田急電鉄_60000形_MSE.png',NULL,FALSE,FALSE),
  ('2611','Odawara','png_band/Odawara/0420-0421',420,421,'',NULL,'../images/列车/小田急電鉄/小田急電鉄_60000形_MSE.png',NULL,FALSE,FALSE),
  ('2611','Odawara','png_band/Odawara/0732-0732',732,732,'',NULL,'../images/列车/小田急電鉄/小田急電鉄_60000形_MSE.png',NULL,FALSE,FALSE);
DO $verify$
DECLARE band_count integer; covered_count integer;
BEGIN
  SELECT count(*),coalesce(sum(max_number-min_number+1),0)
    INTO band_count,covered_count
    FROM public.published_train_png_number_ranges
   WHERE edition='2611' AND line_key='Odawara'
     AND png_reference='../images/列车/小田急電鉄/小田急電鉄_60000形_MSE.png'
     AND segment_key LIKE 'png_band/Odawara/%'
     AND vehicle_model IS NULL AND source_url IS NULL
     AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
  IF band_count<>5 OR covered_count<>7 THEN
    RAISE EXCEPTION 'Private20 expected five source-scoped rows/7 exact numbers, got %/%',band_count,covered_count;
  END IF;
END;
$verify$;
COMMIT;
