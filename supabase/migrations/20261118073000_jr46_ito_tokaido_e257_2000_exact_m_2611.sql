-- JR46: Ito + Tokaido E257-2000, 16 explicit Nov 2026 original JS numbers -> 6 no-gap PNG bands.
-- Keep original JR-East/date/train-type/model/roster guards; these rows are NOT evidence of actual formation.
-- Already exact old PNG number ranges are retained without mutation.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.vehicle_image_assets WHERE image_path='images/列车/JR東日本/JR東日本_E257系_2000番台.png' AND asset_status='available' AND file_format_status='native_png') THEN RAISE EXCEPTION 'JR46: gallery image not available'; END IF;
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND suffix='M' AND png_reference='../images/列车/JR東日本/JR東日本_E257系_2000番台.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE AND ((line_key='Ito' AND segment_key='png_band/Ito/3021-3031M' AND min_number=3021 AND max_number=3031) OR (line_key='Tokaido' AND segment_key='png_band/Tokaido/3021-3031M' AND min_number=3021 AND max_number=3031)))<>2 THEN RAISE EXCEPTION 'JR46: original source SQL rows changed'; END IF;
 IF EXISTS(WITH proposed(line_key,min_number,max_number) AS(VALUES
    ('Ito',3021,3022),
    ('Ito',3024,3026),
    ('Ito',3029,3031),
    ('Tokaido',3021,3022),
    ('Tokaido',3024,3026),
    ('Tokaido',3029,3031)
   ) SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges q ON q.edition='2611' AND q.line_key=p.line_key AND q.suffix='M' AND q.segment_key LIKE 'png_band/%' AND q.png_reference<>'../images/列车/JR東日本/JR東日本_E257系_2000番台.png' AND p.min_number<=q.max_number AND q.min_number<=p.max_number) THEN RAISE EXCEPTION 'JR46: new reference collides with another PNG'; END IF;
END;
$preflight$;
DELETE FROM public.published_train_png_number_ranges WHERE edition='2611' AND suffix='M' AND png_reference='../images/列车/JR東日本/JR東日本_E257系_2000番台.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE AND ((line_key='Ito' AND segment_key='png_band/Ito/3021-3031M' AND min_number=3021 AND max_number=3031) OR (line_key='Tokaido' AND segment_key='png_band/Tokaido/3021-3031M' AND min_number=3021 AND max_number=3031));
INSERT INTO public.published_train_png_number_ranges (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed) VALUES
  ('2611','Ito','png_band/Ito/3021-3022M',3021,3022,'M',NULL,'../images/列车/JR東日本/JR東日本_E257系_2000番台.png',NULL,FALSE,FALSE),
  ('2611','Ito','png_band/Ito/3024-3026M',3024,3026,'M',NULL,'../images/列车/JR東日本/JR東日本_E257系_2000番台.png',NULL,FALSE,FALSE),
  ('2611','Ito','png_band/Ito/3029-3031M',3029,3031,'M',NULL,'../images/列车/JR東日本/JR東日本_E257系_2000番台.png',NULL,FALSE,FALSE),
  ('2611','Tokaido','png_band/Tokaido/3021-3022M',3021,3022,'M',NULL,'../images/列车/JR東日本/JR東日本_E257系_2000番台.png',NULL,FALSE,FALSE),
  ('2611','Tokaido','png_band/Tokaido/3024-3026M',3024,3026,'M',NULL,'../images/列车/JR東日本/JR東日本_E257系_2000番台.png',NULL,FALSE,FALSE),
  ('2611','Tokaido','png_band/Tokaido/3029-3031M',3029,3031,'M',NULL,'../images/列车/JR東日本/JR東日本_E257系_2000番台.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND suffix='M' AND png_reference='../images/列车/JR東日本/JR東日本_E257系_2000番台.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE AND line_key='Ito' AND segment_key LIKE 'png_band/Ito/%')<>3 OR (SELECT coalesce(sum(max_number-min_number+1),0) FROM public.published_train_png_number_ranges WHERE edition='2611' AND suffix='M' AND png_reference='../images/列车/JR東日本/JR東日本_E257系_2000番台.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE AND line_key='Ito' AND segment_key LIKE 'png_band/Ito/%')<>8 THEN RAISE EXCEPTION 'JR46: Ito count/coverage mismatch'; END IF;
 IF (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND suffix='M' AND png_reference='../images/列车/JR東日本/JR東日本_E257系_2000番台.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE AND line_key='Tokaido' AND segment_key LIKE 'png_band/Tokaido/%')<>3 OR (SELECT coalesce(sum(max_number-min_number+1),0) FROM public.published_train_png_number_ranges WHERE edition='2611' AND suffix='M' AND png_reference='../images/列车/JR東日本/JR東日本_E257系_2000番台.png' AND vehicle_model IS NULL AND source_url IS NULL AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE AND line_key='Tokaido' AND segment_key LIKE 'png_band/Tokaido/%')<>8 THEN RAISE EXCEPTION 'JR46: Tokaido count/coverage mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM public.published_train_png_number_ranges WHERE edition='2611' AND ((line_key='Ito' AND segment_key='png_band/Ito/3021-3031M') OR (line_key='Tokaido' AND segment_key='png_band/Tokaido/3021-3031M'))) THEN RAISE EXCEPTION 'JR46: retired unvalidated wide range still present'; END IF;
END;
$verify$;
COMMIT;
