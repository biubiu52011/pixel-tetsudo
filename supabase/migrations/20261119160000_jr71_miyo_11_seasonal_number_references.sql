-- JR71: JR-East 弥彦線 (Miyo) 2026-11 official seasonal/extra M train numbers.
-- Up direction https://timetables.jreast.co.jp/2611/timetable-v/233u2.html
-- Down direction https://timetables.jreast.co.jp/2611/timetable-v/233d2.html
-- Up: 8266M 9228M 9282M 8232M 9234M 9284M.
-- Down: 8231M 9235M 8271M 9281M 9241M.
-- All 11 numbers are explicitly printed in the official monthly timetable.
-- A reference PNG is NOT a vehicle formation or daily-service confirmation.
-- Some run only on specific holiday/date ranges; original guards remain mandatory.
-- D-suffix special trains (e.g. 9225D/9279D) are intentionally excluded.
BEGIN;
DO $preflight$
DECLARE original_count integer; png_count integer; num_count integer;
BEGIN
 SELECT count(*) INTO original_count
 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Miyo'
 AND segment_key='miyo_e129_regular_seasonal'
 AND min_number=220 AND max_number=9284 AND suffix='M'
 AND vehicle_model='E129系'
 AND png_reference='../images/列车/JR東日本/JR東日本_E129系.png'
 AND source_url='https://timetables.jreast.co.jp/2611/timetable-v/233u2.html'
 AND requires_exact_roster=TRUE AND actual_vehicle_confirmed=FALSE;
 IF original_count<>1 THEN RAISE EXCEPTION 'JR71: original Miyo E129 model evidence changed'; END IF;
 SELECT count(*) INTO png_count
 FROM public.vehicle_image_assets
 WHERE image_path='images/列车/JR東日本/JR東日本_E129系.png'
 AND operator='JR-East' AND asset_status='available'
 AND asset_scope='generic' AND vehicle_type='E129系'
 AND file_format_status='native_png';
 IF png_count<>1 THEN RAISE EXCEPTION 'JR71: original E129 PNG registration changed'; END IF;
 SELECT count(DISTINCT num) INTO num_count FROM (VALUES
 (8231),
 (8232),
 (8266),
 (8271),
 (9228),
 (9234),
 (9235),
 (9241),
 (9281),
 (9282),
 (9284)
 ) v(num);
 IF num_count<>11 THEN RAISE EXCEPTION 'JR71: expected 11 unique official train numbers'; END IF;
 IF EXISTS (
 SELECT 1 FROM public.published_train_png_number_ranges p
 JOIN (VALUES
 (8231),
 (8232),
 (8266),
 (8271),
 (9228),
 (9234),
 (9235),
 (9241),
 (9281),
 (9282),
 (9284)
 ) v(num) ON p.min_number<=v.num AND p.max_number>=v.num
 WHERE p.edition='2611' AND p.line_key='Miyo' AND p.suffix='M'
 AND p.segment_key LIKE 'png_band/%'
 ) THEN RAISE EXCEPTION 'JR71: pre-existing Miyo pure PNG band overlaps a proposed number'; END IF;
END
$preflight$;
INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,
vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','Miyo','png_band/Miyo/8231-8231M',8231,8231,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
 ('2611','Miyo','png_band/Miyo/8232-8232M',8232,8232,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
 ('2611','Miyo','png_band/Miyo/8266-8266M',8266,8266,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
 ('2611','Miyo','png_band/Miyo/8271-8271M',8271,8271,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
 ('2611','Miyo','png_band/Miyo/9228-9228M',9228,9228,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
 ('2611','Miyo','png_band/Miyo/9234-9234M',9234,9234,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
 ('2611','Miyo','png_band/Miyo/9235-9235M',9235,9235,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
 ('2611','Miyo','png_band/Miyo/9241-9241M',9241,9241,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
 ('2611','Miyo','png_band/Miyo/9281-9281M',9281,9281,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
 ('2611','Miyo','png_band/Miyo/9282-9282M',9282,9282,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
 ('2611','Miyo','png_band/Miyo/9284-9284M',9284,9284,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Miyo'
 AND segment_key IN (
 'png_band/Miyo/8231-8231M',
 'png_band/Miyo/8232-8232M',
 'png_band/Miyo/8266-8266M',
 'png_band/Miyo/8271-8271M',
 'png_band/Miyo/9228-9228M',
 'png_band/Miyo/9234-9234M',
 'png_band/Miyo/9235-9235M',
 'png_band/Miyo/9241-9241M',
 'png_band/Miyo/9281-9281M',
 'png_band/Miyo/9282-9282M',
 'png_band/Miyo/9284-9284M'
 )
 AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>11
 THEN RAISE EXCEPTION 'JR71: eleven proposed Miyo bands are missing or invalid'; END IF;
 IF EXISTS (
 SELECT 1 FROM public.published_train_png_number_ranges a
 JOIN public.published_train_png_number_ranges b
 ON a.edition=b.edition AND a.line_key=b.line_key AND a.suffix=b.suffix
 AND a.min_number<=b.max_number AND b.min_number<=a.max_number
 AND a.png_reference<>b.png_reference
 WHERE a.edition='2611' AND a.segment_key LIKE 'png_band/%'
 AND b.segment_key LIKE 'png_band/%'
 ) THEN RAISE EXCEPTION 'JR71: multiple PNGs overlap in pure bands'; END IF;
END
$verify$;
COMMIT;
