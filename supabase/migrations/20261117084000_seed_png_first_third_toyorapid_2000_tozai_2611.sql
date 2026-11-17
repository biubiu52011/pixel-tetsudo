-- Third-sector first PNG-first formal reference band (2611).
-- Exact same inclusive bounds, suffix, source context as pre-existing JS
-- Tozai ToyoRapid 2000-series rule: from=400, to=2599, suffix=T,
-- numberFormat=metro-prefixed; this is not a new operational train rule.
-- Existing operator, published train numbers, calendar, source railway,
-- train type (exclude LimitedExpress), and model guards remain mandatory.
-- Does not infer an actual carset or permit automatic 2000-series display.
DO $toyo_2000_guard$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.vehicle_image_assets
  WHERE image_path='images/列车/東葉高速鉄道/東葉高速鉄道_2000系.png'
   AND operator='ToyoRapid' AND asset_status='available'
   AND file_format_status='native_png'
   AND appearance_class IS DISTINCT FROM 'requires_review'
 ) THEN
   RAISE EXCEPTION 'ToyoRapid 2000 PNG asset is not eligible';
 END IF;
 IF EXISTS (
  SELECT 1 FROM public.published_train_png_number_ranges
  WHERE edition='2611' AND line_key='Tozai' AND suffix='T'
   AND min_number<=2599 AND max_number>=400
   AND png_reference<>'../images/列车/東葉高速鉄道/東葉高速鉄道_2000系.png'
 ) THEN
   RAISE EXCEPTION 'ToyoRapid 2000 number band overlaps a different artwork';
 END IF;
END
$toyo_2000_guard$;

INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','Tozai','png_band/Tozai/0400-2599T',400,2599,'T',NULL,'../images/列车/東葉高速鉄道/東葉高速鉄道_2000系.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;

DO $toyo_2000_verify$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Tozai' AND segment_key='png_band/Tozai/0400-2599T'
  AND min_number=400 AND max_number=2599 AND suffix='T'
  AND png_reference='../images/列车/東葉高速鉄道/東葉高速鉄道_2000系.png'
  AND vehicle_model IS NULL AND source_url IS NULL
  AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
 IF n<>1 THEN RAISE EXCEPTION 'ToyoRapid 2000 number band not persisted'; END IF;
END
$toyo_2000_verify$;
