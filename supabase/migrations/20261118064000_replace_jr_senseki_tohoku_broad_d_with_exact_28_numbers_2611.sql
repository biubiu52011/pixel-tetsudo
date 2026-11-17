-- JR41: original JS SensekiTohoku Nov 2026, 28 published numbers into 6 islands.
-- Retain existing runtime date/model/service guards; do NOT override other train artwork.
-- Retain 0 other previously verified special reference row(s) unchanged.
BEGIN;
DO $check$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.vehicle_image_assets WHERE image_path='images/列车/JR東日本/JR東日本_HB-E210系.png' AND asset_status='available' AND file_format_status='native_png') THEN RAISE EXCEPTION 'JR41: missing available PNG'; END IF;
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='SensekiTohoku' AND segment_key='png_band/SensekiTohoku/5500-5599D' AND min_number=5500 AND max_number=5599 AND suffix='D' AND png_reference='../images/列车/JR東日本/JR東日本_HB-E210系.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1 THEN RAISE EXCEPTION 'JR41: original wide row changed'; END IF;
 IF EXISTS(WITH proposed(min_number,max_number) AS(VALUES
    (5520,5521),
    (5530,5539),
    (5541,5541),
    (5543,5543),
    (5560,5572),
    (5574,5574)
   ) SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges x ON x.edition='2611' AND x.line_key='SensekiTohoku' AND x.suffix='D' AND x.segment_key LIKE 'png_band/%' AND x.png_reference<>'../images/列车/JR東日本/JR東日本_HB-E210系.png' AND p.min_number<=x.max_number AND x.min_number<=p.max_number) THEN RAISE EXCEPTION 'JR41: other PNG overlaps'; END IF;
END;
$check$;
DELETE FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='SensekiTohoku' AND segment_key='png_band/SensekiTohoku/5500-5599D' AND min_number=5500 AND max_number=5599 AND suffix='D' AND png_reference='../images/列车/JR東日本/JR東日本_HB-E210系.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
INSERT INTO public.published_train_png_number_ranges (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed) VALUES
  ('2611','SensekiTohoku','png_band/SensekiTohoku/5520-5521D',5520,5521,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E210系.png',NULL,FALSE,FALSE),
  ('2611','SensekiTohoku','png_band/SensekiTohoku/5530-5539D',5530,5539,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E210系.png',NULL,FALSE,FALSE),
  ('2611','SensekiTohoku','png_band/SensekiTohoku/5541-5541D',5541,5541,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E210系.png',NULL,FALSE,FALSE),
  ('2611','SensekiTohoku','png_band/SensekiTohoku/5543-5543D',5543,5543,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E210系.png',NULL,FALSE,FALSE),
  ('2611','SensekiTohoku','png_band/SensekiTohoku/5560-5572D',5560,5572,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E210系.png',NULL,FALSE,FALSE),
  ('2611','SensekiTohoku','png_band/SensekiTohoku/5574-5574D',5574,5574,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E210系.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='SensekiTohoku' AND segment_key LIKE 'png_band/SensekiTohoku/%' AND png_reference='../images/列车/JR東日本/JR東日本_HB-E210系.png' AND suffix='D' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>6 THEN RAISE EXCEPTION 'JR41: expected 6 total pure bands'; END IF;
 IF (SELECT COALESCE(sum(max_number-min_number+1),0) FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='SensekiTohoku' AND segment_key LIKE 'png_band/SensekiTohoku/%' AND png_reference='../images/列车/JR東日本/JR東日本_HB-E210系.png' AND suffix='D')<>28 THEN RAISE EXCEPTION 'JR41: expected 28 total published numbers'; END IF;
 IF EXISTS(SELECT 1 FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='SensekiTohoku' AND segment_key='png_band/SensekiTohoku/5500-5599D') THEN RAISE EXCEPTION 'JR41: old wide segment remains'; END IF;
END;
$verify$;
COMMIT;
