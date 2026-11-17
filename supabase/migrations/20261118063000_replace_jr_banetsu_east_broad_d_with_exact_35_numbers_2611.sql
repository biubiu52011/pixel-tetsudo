-- JR40: original JS BanetsuEast Nov 2026, 35 published numbers into 4 islands.
-- Retain existing runtime date/model/service guards; do NOT override other train artwork.
-- Retain 0 other previously verified special reference row(s) unchanged.
BEGIN;
DO $check$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.vehicle_image_assets WHERE image_path='images/列车/JR東日本/JR東日本_キハ110系.png' AND asset_status='available' AND file_format_status='native_png') THEN RAISE EXCEPTION 'JR40: missing available PNG'; END IF;
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='BanetsuEast' AND segment_key='png_band/BanetsuEast/0720-1756D' AND min_number=720 AND max_number=1756 AND suffix='D' AND png_reference='../images/列车/JR東日本/JR東日本_キハ110系.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1 THEN RAISE EXCEPTION 'JR40: original wide row changed'; END IF;
 IF EXISTS(WITH proposed(min_number,max_number) AS(VALUES
    (720,725),
    (727,738),
    (740,750),
    (1751,1756)
   ) SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges x ON x.edition='2611' AND x.line_key='BanetsuEast' AND x.suffix='D' AND x.segment_key LIKE 'png_band/%' AND x.png_reference<>'../images/列车/JR東日本/JR東日本_キハ110系.png' AND p.min_number<=x.max_number AND x.min_number<=p.max_number) THEN RAISE EXCEPTION 'JR40: other PNG overlaps'; END IF;
END;
$check$;
DELETE FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='BanetsuEast' AND segment_key='png_band/BanetsuEast/0720-1756D' AND min_number=720 AND max_number=1756 AND suffix='D' AND png_reference='../images/列车/JR東日本/JR東日本_キハ110系.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
INSERT INTO public.published_train_png_number_ranges (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed) VALUES
  ('2611','BanetsuEast','png_band/BanetsuEast/0720-0725D',720,725,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuEast','png_band/BanetsuEast/0727-0738D',727,738,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuEast','png_band/BanetsuEast/0740-0750D',740,750,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','BanetsuEast','png_band/BanetsuEast/1751-1756D',1751,1756,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='BanetsuEast' AND segment_key LIKE 'png_band/BanetsuEast/%' AND png_reference='../images/列车/JR東日本/JR東日本_キハ110系.png' AND suffix='D' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>4 THEN RAISE EXCEPTION 'JR40: expected 4 total pure bands'; END IF;
 IF (SELECT COALESCE(sum(max_number-min_number+1),0) FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='BanetsuEast' AND segment_key LIKE 'png_band/BanetsuEast/%' AND png_reference='../images/列车/JR東日本/JR東日本_キハ110系.png' AND suffix='D')<>35 THEN RAISE EXCEPTION 'JR40: expected 35 total published numbers'; END IF;
 IF EXISTS(SELECT 1 FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='BanetsuEast' AND segment_key='png_band/BanetsuEast/0720-1756D') THEN RAISE EXCEPTION 'JR40: old wide segment remains'; END IF;
END;
$verify$;
COMMIT;
