-- JR47: RikutoEast KiHa110, 45 explicit Nov 2026 original JS numbers -> 9 no-gap PNG bands.
-- Keep original JR-East/date/train-type/model/roster guards; these rows are NOT evidence of actual formation.
-- Already exact old PNG number ranges are retained without mutation.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.vehicle_image_assets WHERE image_path='images/列车/JR東日本/JR東日本_キハ110系.png' AND asset_status='available' AND file_format_status='native_png') THEN RAISE EXCEPTION 'JR47: gallery image not available'; END IF;
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND suffix='D' AND png_reference='../images/列车/JR東日本/JR東日本_キハ110系.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE AND ((line_key='RikutoEast' AND segment_key='png_band/RikutoEast/1720-1747D' AND min_number=1720 AND max_number=1747) OR (line_key='RikutoEast' AND segment_key='png_band/RikutoEast/2725-2725D' AND min_number=2725 AND max_number=2725) OR (line_key='RikutoEast' AND segment_key='png_band/RikutoEast/4725-4734D' AND min_number=4725 AND max_number=4734) OR (line_key='RikutoEast' AND segment_key='png_band/RikutoEast/5720-5735D' AND min_number=5720 AND max_number=5735)))<>4 THEN RAISE EXCEPTION 'JR47: original source SQL rows changed'; END IF;
 IF EXISTS(WITH proposed(line_key,min_number,max_number) AS(VALUES
    ('RikutoEast',1720,1724),
    ('RikutoEast',1726,1728),
    ('RikutoEast',1731,1732),
    ('RikutoEast',1735,1747),
    ('RikutoEast',4725,4725),
    ('RikutoEast',4729,4730),
    ('RikutoEast',4733,4734)
   ) SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges q ON q.edition='2611' AND q.line_key=p.line_key AND q.suffix='D' AND q.segment_key LIKE 'png_band/%' AND q.png_reference<>'../images/列车/JR東日本/JR東日本_キハ110系.png' AND p.min_number<=q.max_number AND q.min_number<=p.max_number) THEN RAISE EXCEPTION 'JR47: new reference collides with another PNG'; END IF;
END;
$preflight$;
DELETE FROM public.published_train_png_number_ranges WHERE edition='2611' AND suffix='D' AND png_reference='../images/列车/JR東日本/JR東日本_キハ110系.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE AND ((line_key='RikutoEast' AND segment_key='png_band/RikutoEast/1720-1747D' AND min_number=1720 AND max_number=1747) OR (line_key='RikutoEast' AND segment_key='png_band/RikutoEast/4725-4734D' AND min_number=4725 AND max_number=4734));
INSERT INTO public.published_train_png_number_ranges (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed) VALUES
  ('2611','RikutoEast','png_band/RikutoEast/1720-1724D',1720,1724,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','RikutoEast','png_band/RikutoEast/1726-1728D',1726,1728,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','RikutoEast','png_band/RikutoEast/1731-1732D',1731,1732,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','RikutoEast','png_band/RikutoEast/1735-1747D',1735,1747,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','RikutoEast','png_band/RikutoEast/4725-4725D',4725,4725,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','RikutoEast','png_band/RikutoEast/4729-4730D',4729,4730,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
  ('2611','RikutoEast','png_band/RikutoEast/4733-4734D',4733,4734,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND suffix='D' AND png_reference='../images/列车/JR東日本/JR東日本_キハ110系.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE AND line_key='RikutoEast' AND segment_key LIKE 'png_band/RikutoEast/%')<>9 OR (SELECT coalesce(sum(max_number-min_number+1),0) FROM public.published_train_png_number_ranges WHERE edition='2611' AND suffix='D' AND png_reference='../images/列车/JR東日本/JR東日本_キハ110系.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE AND line_key='RikutoEast' AND segment_key LIKE 'png_band/RikutoEast/%')<>45 THEN RAISE EXCEPTION 'JR47: RikutoEast count/coverage mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM public.published_train_png_number_ranges WHERE edition='2611' AND ((line_key='RikutoEast' AND segment_key='png_band/RikutoEast/1720-1747D') OR (line_key='RikutoEast' AND segment_key='png_band/RikutoEast/4725-4734D'))) THEN RAISE EXCEPTION 'JR47: retired unvalidated wide range still present'; END IF;
END;
$verify$;
COMMIT;
