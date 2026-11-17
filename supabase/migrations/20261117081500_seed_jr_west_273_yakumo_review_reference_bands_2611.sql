-- JR West 273-series Yakumo; REFERENCE-ONLY numbered train family (edition 2611).
-- 2026 Nov published official Yakumo 1 (1001M) and Yakumo 30 (1030M)
-- delimit the regular 1..30 train number family. 273-series vehicle is
-- JR-West's documented Yakumo stock. Same train traverses existing SanyoMain
-- and SaninMain line keys (Hakubi does not exist in this project's catalog).
-- Official roster (dated 2026-11) and vehicle guide:
-- https://timetable.jr-odekake.net/train-timetable/76281?date=20261023
-- https://timetable.jr-odekake.net/train-timetable/1101?date=20261027
-- https://www.jr-odekake.net/railroad/yakumo/
--
-- Deliberately remain blocked: PNG has asset_status=review and is not
-- confirmed native_png. This number reference DOES NOT promote or activate
-- the artwork; existing source/date/train-name and asset review gates hold.
-- Do not treat an inclusive number band as proof of every daily train.

DO $yakumo_review_band_guard$
DECLARE x record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.vehicle_image_assets
    WHERE image_path='images/列车/JR西日本/JR西日本_273系.png'
      AND operator='JR-West'
      AND asset_status='review' AND asset_scope='review'
      AND appearance_class='requires_review'
  ) THEN
    RAISE EXCEPTION 'Yakumo 273 gallery reference must remain review-only';
  END IF;
  FOR x IN SELECT line_key FROM (VALUES ('SanyoMain'),('SaninMain')) AS v(line_key)
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.published_train_png_number_ranges r
      WHERE r.edition='2611' AND r.line_key=x.line_key AND r.suffix='M'
        AND r.min_number<=1030 AND r.max_number>=1001
        AND r.png_reference<>'../images/列车/JR西日本/JR西日本_273系.png'
    ) THEN
      RAISE EXCEPTION 'Yakumo 273 PNG references overlap a different artwork: %',x.line_key;
    END IF;
  END LOOP;
END
$yakumo_review_band_guard$;

INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','SanyoMain','png_band/SanyoMain/1001-1030M',1001,1030,'M',NULL,'../images/列车/JR西日本/JR西日本_273系.png',NULL,FALSE,FALSE),
  ('2611','SaninMain','png_band/SaninMain/1001-1030M',1001,1030,'M',NULL,'../images/列车/JR西日本/JR西日本_273系.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;

DO $yakumo_review_band_verify$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
  FROM public.published_train_png_number_ranges
  WHERE edition='2611' AND line_key IN ('SanyoMain','SaninMain')
    AND min_number=1001 AND max_number=1030 AND suffix='M'
    AND png_reference='../images/列车/JR西日本/JR西日本_273系.png'
    AND segment_key LIKE 'png_band/%'
    AND vehicle_model IS NULL AND source_url IS NULL
    AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
  IF n<>2 THEN RAISE EXCEPTION 'Yakumo reference band persistence mismatch: %',n; END IF;
END
$yakumo_review_band_verify$;
