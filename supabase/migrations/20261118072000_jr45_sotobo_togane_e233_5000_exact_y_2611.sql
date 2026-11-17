-- JR45: Sotobo + Togane E233-5000, 6 explicit Nov 2026 original JS numbers -> 6 no-gap PNG bands.
-- Keep original JR-East/date/train-type/model/roster guards; these rows are NOT evidence of actual formation.
-- Already exact old PNG number ranges are retained without mutation.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.vehicle_image_assets WHERE image_path='images/列车/JR東日本/JR東日本_E233系5000番台.png' AND asset_status='available' AND file_format_status='native_png') THEN RAISE EXCEPTION 'JR45: gallery image not available'; END IF;
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND suffix='Y' AND png_reference='../images/列车/JR東日本/JR東日本_E233系5000番台.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE AND ((line_key='Sotobo' AND segment_key='png_band/Sotobo/3680-5983Y' AND min_number=3680 AND max_number=5983) OR (line_key='Togane' AND segment_key='png_band/Togane/5680-5983Y' AND min_number=5680 AND max_number=5983)))<>2 THEN RAISE EXCEPTION 'JR45: original source SQL rows changed'; END IF;
 IF EXISTS(WITH proposed(line_key,min_number,max_number) AS(VALUES
    ('Sotobo',3680,3680),
    ('Sotobo',4883,4883),
    ('Sotobo',5680,5680),
    ('Sotobo',5983,5983),
    ('Togane',5680,5680),
    ('Togane',5983,5983)
   ) SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges q ON q.edition='2611' AND q.line_key=p.line_key AND q.suffix='Y' AND q.segment_key LIKE 'png_band/%' AND q.png_reference<>'../images/列车/JR東日本/JR東日本_E233系5000番台.png' AND p.min_number<=q.max_number AND q.min_number<=p.max_number) THEN RAISE EXCEPTION 'JR45: new reference collides with another PNG'; END IF;
END;
$preflight$;
DELETE FROM public.published_train_png_number_ranges WHERE edition='2611' AND suffix='Y' AND png_reference='../images/列车/JR東日本/JR東日本_E233系5000番台.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE AND ((line_key='Sotobo' AND segment_key='png_band/Sotobo/3680-5983Y' AND min_number=3680 AND max_number=5983) OR (line_key='Togane' AND segment_key='png_band/Togane/5680-5983Y' AND min_number=5680 AND max_number=5983));
INSERT INTO public.published_train_png_number_ranges (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed) VALUES
  ('2611','Sotobo','png_band/Sotobo/3680-3680Y',3680,3680,'Y',NULL,'../images/列车/JR東日本/JR東日本_E233系5000番台.png',NULL,FALSE,FALSE),
  ('2611','Sotobo','png_band/Sotobo/4883-4883Y',4883,4883,'Y',NULL,'../images/列车/JR東日本/JR東日本_E233系5000番台.png',NULL,FALSE,FALSE),
  ('2611','Sotobo','png_band/Sotobo/5680-5680Y',5680,5680,'Y',NULL,'../images/列车/JR東日本/JR東日本_E233系5000番台.png',NULL,FALSE,FALSE),
  ('2611','Sotobo','png_band/Sotobo/5983-5983Y',5983,5983,'Y',NULL,'../images/列车/JR東日本/JR東日本_E233系5000番台.png',NULL,FALSE,FALSE),
  ('2611','Togane','png_band/Togane/5680-5680Y',5680,5680,'Y',NULL,'../images/列车/JR東日本/JR東日本_E233系5000番台.png',NULL,FALSE,FALSE),
  ('2611','Togane','png_band/Togane/5983-5983Y',5983,5983,'Y',NULL,'../images/列车/JR東日本/JR東日本_E233系5000番台.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND suffix='Y' AND png_reference='../images/列车/JR東日本/JR東日本_E233系5000番台.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE AND line_key='Sotobo' AND segment_key LIKE 'png_band/Sotobo/%')<>4 OR (SELECT coalesce(sum(max_number-min_number+1),0) FROM public.published_train_png_number_ranges WHERE edition='2611' AND suffix='Y' AND png_reference='../images/列车/JR東日本/JR東日本_E233系5000番台.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE AND line_key='Sotobo' AND segment_key LIKE 'png_band/Sotobo/%')<>4 THEN RAISE EXCEPTION 'JR45: Sotobo count/coverage mismatch'; END IF;
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND suffix='Y' AND png_reference='../images/列车/JR東日本/JR東日本_E233系5000番台.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE AND line_key='Togane' AND segment_key LIKE 'png_band/Togane/%')<>2 OR (SELECT coalesce(sum(max_number-min_number+1),0) FROM public.published_train_png_number_ranges WHERE edition='2611' AND suffix='Y' AND png_reference='../images/列车/JR東日本/JR東日本_E233系5000番台.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE AND line_key='Togane' AND segment_key LIKE 'png_band/Togane/%')<>2 THEN RAISE EXCEPTION 'JR45: Togane count/coverage mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM public.published_train_png_number_ranges WHERE edition='2611' AND ((line_key='Sotobo' AND segment_key='png_band/Sotobo/3680-5983Y') OR (line_key='Togane' AND segment_key='png_band/Togane/5680-5983Y'))) THEN RAISE EXCEPTION 'JR45: retired unvalidated wide range still present'; END IF;
END;
$verify$;
COMMIT;
