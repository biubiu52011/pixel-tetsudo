-- JR58: 2026-10-03 JR-East E501 SAKIGAKE (K754) historical service references.
-- JR-East official event dates and K754 vehicle:
-- https://media.jreast.co.jp/articles/6720
-- Historical 2026-10-03 witnessed service numbers, NOT an operator train-number bulletin:
-- 9621M Tsuchiura -> Kasama (JobanMain + Mito):
-- https://www.tetsudo.com/movie/calendar/20261003/37.html
-- 9725M Katsuta -> Hitachi (JobanMain):
-- https://www.tetsudo.com/movie/calendar/20261003/36.html
-- Do not infer operation on 2026-11-18. Do not apply either number to generic E501,
-- the alternate K754 artwork, or any E531. No actual vehicle confirmation in SQL.
-- Single canonical artwork reference: images/列车/JR東日本/JR東日本_E501系_E501_SAKIGAKE.png
-- Alternate K754 drawing remains unnumbered: images/列车/JR東日本/JR東日本_E501系_さきがけ.png
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.vehicle_image_assets
   WHERE image_path='images/列车/JR東日本/JR東日本_E501系_E501_SAKIGAKE.png' AND operator='JR-East' AND vehicle_type='E501系'
     AND formation_id='K754' AND asset_status='available'
     AND file_format_status='native_png' AND asset_scope='theme'
     AND theme='E501_SAKIGAKE' AND appearance_class='dedicated_vehicle_identity'
     AND is_generic=FALSE
 ) THEN RAISE EXCEPTION 'JR58: canonical E501 K754 artwork changed'; END IF;
 IF NOT EXISTS (
   SELECT 1 FROM public.vehicle_image_assets
   WHERE image_path='images/列车/JR東日本/JR東日本_E501系_さきがけ.png' AND operator='JR-East' AND vehicle_type='E501系'
     AND formation_id='K754' AND asset_status='available'
     AND file_format_status='native_png'
 ) THEN RAISE EXCEPTION 'JR58: duplicate K754 artwork no longer tracked'; END IF;
 IF EXISTS (
   SELECT 1 FROM public.published_train_png_number_ranges r
   WHERE r.edition='2611' AND r.suffix='M'
     AND ((r.line_key='JobanMain' AND
          ((r.min_number<=9621 AND r.max_number>=9621) OR
           (r.min_number<=9725 AND r.max_number>=9725)))
       OR (r.line_key='Mito' AND r.min_number<=9621 AND r.max_number>=9621))
 ) THEN RAISE EXCEPTION 'JR58: historical number already assigned on route'; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,
  vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','JobanMain','png_band/JobanMain/9621-9621M',9621,9621,'M',NULL,'../images/列车/JR東日本/JR東日本_E501系_E501_SAKIGAKE.png',NULL,FALSE,FALSE),
 ('2611','Mito','png_band/Mito/9621-9621M',9621,9621,'M',NULL,'../images/列车/JR東日本/JR東日本_E501系_E501_SAKIGAKE.png',NULL,FALSE,FALSE),
 ('2611','JobanMain','png_band/JobanMain/9725-9725M',9725,9725,'M',NULL,'../images/列车/JR東日本/JR東日本_E501系_E501_SAKIGAKE.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
     WHERE edition='2611' AND segment_key IN
       ('png_band/JobanMain/9621-9621M','png_band/Mito/9621-9621M',
        'png_band/JobanMain/9725-9725M')
       AND png_reference='../images/列车/JR東日本/JR東日本_E501系_E501_SAKIGAKE.png'
       AND vehicle_model IS NULL AND source_url IS NULL AND suffix='M'
       AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>3
 THEN RAISE EXCEPTION 'JR58: expected three scoped reference rows'; END IF;
 IF EXISTS (
   SELECT 1 FROM public.published_train_png_number_ranges
   WHERE edition='2611' AND png_reference='../images/列车/JR東日本/JR東日本_E501系_さきがけ.png'
     AND line_key IN ('JobanMain','Mito')
     AND suffix='M' AND min_number<=9725 AND max_number>=9621
 ) THEN RAISE EXCEPTION 'JR58: duplicate K754 artwork must stay unnumbered'; END IF;
END;
$verify$;
COMMIT;
