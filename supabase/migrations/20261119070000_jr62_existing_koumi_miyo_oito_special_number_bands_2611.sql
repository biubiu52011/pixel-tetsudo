-- JR62: reuse three pre-existing 2611 SQL roster scopes without inventing
-- any new train numbers, widening gaps, or confirming the actual formation.
-- Komii HIGH RAIL 1375: 8221/8222/8223D, original highrail1375_official.
-- Miyo Kairi: 9278/9279D, original momiji_no_sql_source.
-- Oito Resort View Furusato: 8361/8362D, original east_hbe300_resort.
-- These reference bands do not bypass service-date, route, class, calendar,
-- existing roster, asset review, or actual car identity restrictions.
BEGIN;
DO $preflight$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND segment_key NOT LIKE 'png_band/%'
 AND ((line_key='Komii' AND segment_key='highrail1375_official' AND min_number=8221 AND max_number=8223 AND suffix='D' AND png_reference='../images/列车/JR東日本/JR東日本_キハ100・110系_HIGH_RAIL_1375.png')
 OR (line_key='Miyo' AND segment_key='momiji_no_sql_source' AND min_number=9278 AND max_number=9279 AND suffix='D' AND png_reference='../images/列车/JR東日本/JR東日本_HB-E300系_海里.png')
 OR (line_key='Oito' AND segment_key='east_hbe300_resort' AND min_number=8361 AND max_number=8362 AND suffix='D' AND png_reference='../images/列车/JR東日本/JR東日本_HB-E300系_リゾートビューふるさと.png'))) <> 3
 THEN RAISE EXCEPTION 'JR62: original 3 exact-number rosters changed'; END IF;
 IF (SELECT COUNT(*) FROM public.vehicle_image_assets
 WHERE image_path IN (
 'images/列车/JR東日本/JR東日本_キハ100・110系_HIGH_RAIL_1375.png',
 'images/列车/JR東日本/JR東日本_HB-E300系_海里.png',
 'images/列车/JR東日本/JR東日本_HB-E300系_リゾートビューふるさと.png')
 AND operator='JR-East' AND file_format_status='native_png') <> 3
 THEN RAISE EXCEPTION 'JR62: gallery PNG registration changed'; END IF;
 IF EXISTS (
 SELECT 1 FROM public.published_train_png_number_ranges x
 JOIN (VALUES
  ('Komii',8221,8223,'D','../images/列车/JR東日本/JR東日本_キハ100・110系_HIGH_RAIL_1375.png'),
  ('Miyo',9278,9279,'D','../images/列车/JR東日本/JR東日本_HB-E300系_海里.png'),
  ('Oito',8361,8362,'D','../images/列车/JR東日本/JR東日本_HB-E300系_リゾートビューふるさと.png')
 ) t(line_key,lo,hi,suffix,png) ON x.line_key=t.line_key
 WHERE x.edition='2611' AND x.segment_key LIKE 'png_band/%'
 AND x.suffix=t.suffix AND x.min_number<=t.hi AND x.max_number>=t.lo
 ) THEN RAISE EXCEPTION 'JR62: target reference already inserted/overlaps existing pure band'; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,
vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
('2611','Komii','png_band/Komii/8221-8223D',8221,8223,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ100・110系_HIGH_RAIL_1375.png',NULL,FALSE,FALSE),
('2611','Miyo','png_band/Miyo/9278-9279D',9278,9279,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E300系_海里.png',NULL,FALSE,FALSE),
('2611','Oito','png_band/Oito/8361-8362D',8361,8362,'D',NULL,'../images/列车/JR東日本/JR東日本_HB-E300系_リゾートビューふるさと.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND segment_key IN
 ('png_band/Komii/8221-8223D','png_band/Miyo/9278-9279D','png_band/Oito/8361-8362D')
 AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>3
 THEN RAISE EXCEPTION 'JR62: reference rows not persisted exactly'; END IF;
 IF EXISTS (
 SELECT 1 FROM public.published_train_png_number_ranges a
 JOIN public.published_train_png_number_ranges b
 ON a.edition=b.edition AND a.line_key=b.line_key AND a.suffix=b.suffix
 AND a.min_number<=b.max_number AND b.min_number<=a.max_number
 AND a.png_reference<>b.png_reference
 WHERE a.edition='2611' AND a.segment_key LIKE 'png_band/%'
 AND b.segment_key LIKE 'png_band/%'
 ) THEN RAISE EXCEPTION 'JR62: ambiguous cross-PNG pure-number bands'; END IF;
END;
$verify$;
COMMIT;
