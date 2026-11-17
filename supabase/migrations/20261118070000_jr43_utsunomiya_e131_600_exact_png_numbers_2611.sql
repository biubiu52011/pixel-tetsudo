-- JR43: Utsunomiya E131-600; 79 exact JS train numbers -> 4 contiguous PNG reference bands.
-- Keep existing already-exact pure rows, migrate only incomplete/wide pure rows.
-- Preserve all runtime source/operator/model/calendar/service-type guards; not a verified physical trainset.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.vehicle_image_assets WHERE image_path='images/列车/JR東日本/JR東日本_E131系_600番台.png' AND asset_status='available' AND file_format_status='native_png') THEN RAISE EXCEPTION 'JR43: PNG not available'; END IF;
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND suffix='M' AND png_reference='../images/列车/JR東日本/JR東日本_E131系_600番台.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE AND ((line_key='UtsunomiyaJR' AND segment_key='png_band/UtsunomiyaJR/0620-0699M' AND min_number=620 AND max_number=699) OR (line_key='UtsunomiyaJR' AND segment_key='png_band/UtsunomiyaJR/2823-2823M' AND min_number=2823 AND max_number=2823)))<>2 THEN RAISE EXCEPTION 'JR43: original pure rows changed'; END IF;
 IF EXISTS(WITH proposed(min_number,max_number) AS(VALUES
    (620,620),
     (622,630),
     (632,699)
   ) SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges q ON q.edition='2611' AND q.line_key='UtsunomiyaJR' AND q.suffix='M' AND q.segment_key LIKE 'png_band/%' AND q.png_reference<>'../images/列车/JR東日本/JR東日本_E131系_600番台.png' AND p.min_number<=q.max_number AND q.min_number<=p.max_number) THEN RAISE EXCEPTION 'JR43: other PNG number intersection'; END IF;
END;
$preflight$;
DELETE FROM public.published_train_png_number_ranges WHERE edition='2611' AND suffix='M' AND png_reference='../images/列车/JR東日本/JR東日本_E131系_600番台.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE AND ((line_key='UtsunomiyaJR' AND segment_key='png_band/UtsunomiyaJR/0620-0699M' AND min_number=620 AND max_number=699));
INSERT INTO public.published_train_png_number_ranges (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed) VALUES
  ('2611','UtsunomiyaJR','png_band/UtsunomiyaJR/0620-0620M',620,620,'M',NULL,'../images/列车/JR東日本/JR東日本_E131系_600番台.png',NULL,FALSE,FALSE),
  ('2611','UtsunomiyaJR','png_band/UtsunomiyaJR/0622-0630M',622,630,'M',NULL,'../images/列车/JR東日本/JR東日本_E131系_600番台.png',NULL,FALSE,FALSE),
  ('2611','UtsunomiyaJR','png_band/UtsunomiyaJR/0632-0699M',632,699,'M',NULL,'../images/列车/JR東日本/JR東日本_E131系_600番台.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='UtsunomiyaJR' AND segment_key LIKE 'png_band/UtsunomiyaJR/%' AND suffix='M' AND png_reference='../images/列车/JR東日本/JR東日本_E131系_600番台.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>4 THEN RAISE EXCEPTION 'JR43: band count differs'; END IF;
 IF (SELECT coalesce(sum(max_number-min_number+1),0) FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='UtsunomiyaJR' AND segment_key LIKE 'png_band/UtsunomiyaJR/%' AND suffix='M' AND png_reference='../images/列车/JR東日本/JR東日本_E131系_600番台.png')<>79 THEN RAISE EXCEPTION 'JR43: unexpected original-number coverage'; END IF;
 IF EXISTS(SELECT 1 FROM public.published_train_png_number_ranges WHERE edition='2611' AND (segment_key='png_band/UtsunomiyaJR/0620-0699M')) THEN RAISE EXCEPTION 'JR43: retired wide row remains'; END IF;
END;
$verify$;
COMMIT;
