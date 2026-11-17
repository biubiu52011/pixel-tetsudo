-- JR42: Hachiko HB-E220; 54 exact JS train numbers -> 9 contiguous PNG reference bands.
-- Keep existing already-exact pure rows, migrate only incomplete/wide pure rows.
-- Preserve all runtime source/operator/model/calendar/service-type guards; not a verified physical trainset.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.vehicle_image_assets WHERE image_path='images/列车/JR東日本/JR東日本_HB-E220系.png' AND asset_status='available' AND file_format_status='native_png') THEN RAISE EXCEPTION 'JR42: PNG not available'; END IF;
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND suffix='D' AND png_reference='../images/列车/JR東日本/JR東日本_HB-E220系.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE AND ((line_key='Hachiko' AND segment_key='png_band/Hachiko/0220-0249D' AND min_number=220 AND max_number=249) OR (line_key='Hachiko' AND segment_key='png_band/Hachiko/2223-2294D' AND min_number=2223 AND max_number=2294)))<>2 THEN RAISE EXCEPTION 'JR42: original pure rows changed'; END IF;
 IF EXISTS(WITH proposed(min_number,max_number) AS(VALUES
    (220,222),
     (224,247),
     (249,249),
     (2223,2223),
     (2248,2248),
     (2260,2271),
     (2281,2284),
     (2286,2286),
     (2288,2294)
   ) SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges q ON q.edition='2611' AND q.line_key='Hachiko' AND q.suffix='D' AND q.segment_key LIKE 'png_band/%' AND q.png_reference<>'../images/列车/JR東日本/JR東日本_HB-E220系.png' AND p.min_number<=q.max_number AND q.min_number<=p.max_number) THEN RAISE EXCEPTION 'JR42: other PNG number intersection'; END IF;
END;
$preflight$;
DELETE FROM public.published_train_png_number_ranges WHERE edition='2611' AND suffix='D' AND png_reference='../images/列车/JR東日本/JR東日本_HB-E220系.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE AND ((line_key='Hachiko' AND segment_key='png_band/Hachiko/0220-0249D' AND min_number=220 AND max_number=249) OR (line_key='Hachiko' AND segment_key='png_band/Hachiko/2223-2294D' AND min_number=2223 AND max_number=2294));
INSERT INTO public.published_train_png_number_ranges (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed) VALUES
  ('2611','Hachiko','png_band/Hachiko/0220-0222D',220,222,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E220系.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0224-0247D',224,247,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E220系.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/0249-0249D',249,249,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E220系.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/2223-2223D',2223,2223,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E220系.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/2248-2248D',2248,2248,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E220系.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/2260-2271D',2260,2271,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E220系.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/2281-2284D',2281,2284,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E220系.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/2286-2286D',2286,2286,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E220系.png',NULL,FALSE,FALSE),
  ('2611','Hachiko','png_band/Hachiko/2288-2294D',2288,2294,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E220系.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='Hachiko' AND segment_key LIKE 'png_band/Hachiko/%' AND suffix='D' AND png_reference='../images/列车/JR東日本/JR東日本_HB-E220系.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>9 THEN RAISE EXCEPTION 'JR42: band count differs'; END IF;
 IF (SELECT coalesce(sum(max_number-min_number+1),0) FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='Hachiko' AND segment_key LIKE 'png_band/Hachiko/%' AND suffix='D' AND png_reference='../images/列车/JR東日本/JR東日本_HB-E220系.png')<>54 THEN RAISE EXCEPTION 'JR42: unexpected original-number coverage'; END IF;
 IF EXISTS(SELECT 1 FROM public.published_train_png_number_ranges WHERE edition='2611' AND (segment_key='png_band/Hachiko/0220-0249D' OR segment_key='png_band/Hachiko/2223-2294D')) THEN RAISE EXCEPTION 'JR42: retired wide row remains'; END IF;
END;
$verify$;
COMMIT;
