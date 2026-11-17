-- JR38: retire unvalidated broad Iiyama reference numbers; only exact published original JS numbers.
-- 54 published 2026-11 train numbers => 14 contiguous islands, no gap fill.
-- Original runtime operator, date, service, model, plan guards continue to apply; NOT real fleet evidence.
BEGIN;
DO $check$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.vehicle_image_assets WHERE image_path='images/列车/JR東日本/JR東日本_キハ110系.png' AND asset_status='available' AND file_format_status='native_png') THEN RAISE EXCEPTION 'JR38 PNG unavailable'; END IF;
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND suffix='D' AND png_reference='../images/列车/JR東日本/JR東日本_キハ110系.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE AND ((line_key='Iiyama' AND segment_key='png_band/Iiyama/0120-1123D' AND min_number=120 AND max_number=1123))) <> 1 THEN RAISE EXCEPTION 'JR38 old SQL source rows changed'; END IF;
 IF EXISTS(WITH proposed(line_key,min_number,max_number) AS(VALUES
   ('Iiyama',120,120),
   ('Iiyama',122,147),
   ('Iiyama',149,151),
   ('Iiyama',162,164),
   ('Iiyama',166,166),
   ('Iiyama',170,170),
   ('Iiyama',172,172),
   ('Iiyama',175,175),
   ('Iiyama',181,182),
   ('Iiyama',185,190),
   ('Iiyama',192,194),
   ('Iiyama',196,196),
   ('Iiyama',198,198),
   ('Iiyama',1120,1123)
  ) SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges q ON q.edition='2611' AND q.line_key=p.line_key AND q.suffix='D' AND q.segment_key LIKE 'png_band/%' AND q.png_reference<>'../images/列车/JR東日本/JR東日本_キハ110系.png' AND p.min_number<=q.max_number AND q.min_number<=p.max_number) THEN RAISE EXCEPTION 'JR38 overlapping different PNG'; END IF;
END;
$check$;
DELETE FROM public.published_train_png_number_ranges WHERE edition='2611' AND suffix='D' AND png_reference='../images/列车/JR東日本/JR東日本_キハ110系.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE AND ((line_key='Iiyama' AND segment_key='png_band/Iiyama/0120-1123D' AND min_number=120 AND max_number=1123));
INSERT INTO public.published_train_png_number_ranges (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed) VALUES
  ('2611','Iiyama','png_band/Iiyama/0120-0120D',120,120,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Iiyama','png_band/Iiyama/0122-0147D',122,147,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Iiyama','png_band/Iiyama/0149-0151D',149,151,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Iiyama','png_band/Iiyama/0162-0164D',162,164,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Iiyama','png_band/Iiyama/0166-0166D',166,166,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Iiyama','png_band/Iiyama/0170-0170D',170,170,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Iiyama','png_band/Iiyama/0172-0172D',172,172,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Iiyama','png_band/Iiyama/0175-0175D',175,175,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Iiyama','png_band/Iiyama/0181-0182D',181,182,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Iiyama','png_band/Iiyama/0185-0190D',185,190,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Iiyama','png_band/Iiyama/0192-0194D',192,194,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Iiyama','png_band/Iiyama/0196-0196D',196,196,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Iiyama','png_band/Iiyama/0198-0198D',198,198,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','Iiyama','png_band/Iiyama/1120-1123D',1120,1123,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='Iiyama' AND segment_key LIKE 'png_band/Iiyama/%' AND suffix='D' AND png_reference='../images/列车/JR東日本/JR東日本_キハ110系.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>14 OR (SELECT coalesce(sum(max_number-min_number+1),0) FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='Iiyama' AND segment_key LIKE 'png_band/Iiyama/%' AND suffix='D' AND png_reference='../images/列车/JR東日本/JR東日本_キハ110系.png')<>54 THEN RAISE EXCEPTION 'JR38: Iiyama expected 14 bands/54 exact numbers'; END IF;
 IF EXISTS(SELECT 1 FROM public.published_train_png_number_ranges WHERE edition='2611' AND ((line_key='Iiyama' AND segment_key='png_band/Iiyama/0120-1123D'))) THEN RAISE EXCEPTION 'JR38 old broad row still present'; END IF;
END;
$verify$;
COMMIT;
