-- Private17: Keikyu 2100 series ordinary model family, 10 exact official
-- full service numbers on BOTH Keikyu main and through-running Kurihama.
-- Official 2025-12-13 holiday 322 diagram 6 named services:
-- https://www.keikyu.co.jp/ride/train/sys_files/train_holyday_pdf/6/20251213holiday.pdf
-- 603C,702C,903A,1002A,1203A,1302A.
-- Official 2025-12-15 weekday 323 diagram 4 named services:
-- https://www.keikyu.co.jp/ride/train/sys_files/train_workday_pdf/5/20251215weekday.pdf
-- 901A,1000A,1101A,1200A.
-- FAQ: normal non-special 2100-series shares special train paths; actual
-- vehicle may be substituted on inspection, and livery is NOT proven.
-- https://keikyufaq.fastcloud.jp/fa/keikyucall/web/knowledge899.html
-- https://keikyufaq.fastcloud.jp/fa/keikyucall/web/knowledge779.html
-- Official current full line timetable valid through 2026-11-20:
-- https://www.keikyu.co.jp/ride/kakueki/schedule.html
-- A new holiday timetable begins 2026-11-21, weekday 2026-11-24.
-- https://www.keikyu.co.jp/company/news/2026/20261020HP_26095RK.html
-- These rows are reference-only from the old 322/323 diagram, NOT a
-- 2026-11-18 actually observed carset. No automatic rendering or official
-- November day-specific confirmation. The two line keys record the SAME
-- through services in each corridor; do not double-render the physical train.
-- Do NOT apply to KeikyuAirport / KeikyuZushi or other vehicle PNG.
-- Neither integer tails nor numbers between references may be inferred.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS(
  SELECT 1 FROM public.vehicle_image_assets
  WHERE image_path='images/列车/京浜急行電鉄/京浜急行電鉄_2100形.png' AND operator='Keikyu'
   AND vehicle_type='2100形' AND asset_status='available'
   AND file_format_status='native_png' AND asset_scope='generic'
   AND is_generic=TRUE AND formation_id IS NULL AND car_id IS NULL)
 THEN RAISE EXCEPTION 'Private17: generic Keikyu 2100 gallery image absent'; END IF;
 IF EXISTS(
  WITH proposed AS(
    SELECT line_key,num,suf FROM
      (VALUES ('Keikyu',603,'C'),
             ('Keikyu',702,'C'),
             ('Keikyu',901,'A'),
             ('Keikyu',903,'A'),
             ('Keikyu',1000,'A'),
             ('Keikyu',1002,'A'),
             ('Keikyu',1101,'A'),
             ('Keikyu',1200,'A'),
             ('Keikyu',1203,'A'),
             ('Keikyu',1302,'A'),
             ('KeikyuKurihama',603,'C'),
             ('KeikyuKurihama',702,'C'),
             ('KeikyuKurihama',901,'A'),
             ('KeikyuKurihama',903,'A'),
             ('KeikyuKurihama',1000,'A'),
             ('KeikyuKurihama',1002,'A'),
             ('KeikyuKurihama',1101,'A'),
             ('KeikyuKurihama',1200,'A'),
             ('KeikyuKurihama',1203,'A'),
             ('KeikyuKurihama',1302,'A')) v(line_key,num,suf)
  )
  SELECT 1 FROM proposed p JOIN public.published_train_png_number_ranges r
   ON r.edition='2611' AND r.line_key=p.line_key AND r.suffix=p.suf
    AND p.num BETWEEN r.min_number AND r.max_number
 ) THEN RAISE EXCEPTION 'Private17: Keikyu numeric collision'; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','Keikyu','png_band/Keikyu/0603-0603C',603,603,'C',NULL,'../images/列车/京浜急行電鉄/京浜急行電鉄_2100形.png',NULL,FALSE,FALSE),
 ('2611','Keikyu','png_band/Keikyu/0702-0702C',702,702,'C',NULL,'../images/列车/京浜急行電鉄/京浜急行電鉄_2100形.png',NULL,FALSE,FALSE),
 ('2611','Keikyu','png_band/Keikyu/0901-0901A',901,901,'A',NULL,'../images/列车/京浜急行電鉄/京浜急行電鉄_2100形.png',NULL,FALSE,FALSE),
 ('2611','Keikyu','png_band/Keikyu/0903-0903A',903,903,'A',NULL,'../images/列车/京浜急行電鉄/京浜急行電鉄_2100形.png',NULL,FALSE,FALSE),
 ('2611','Keikyu','png_band/Keikyu/1000-1000A',1000,1000,'A',NULL,'../images/列车/京浜急行電鉄/京浜急行電鉄_2100形.png',NULL,FALSE,FALSE),
 ('2611','Keikyu','png_band/Keikyu/1002-1002A',1002,1002,'A',NULL,'../images/列车/京浜急行電鉄/京浜急行電鉄_2100形.png',NULL,FALSE,FALSE),
 ('2611','Keikyu','png_band/Keikyu/1101-1101A',1101,1101,'A',NULL,'../images/列车/京浜急行電鉄/京浜急行電鉄_2100形.png',NULL,FALSE,FALSE),
 ('2611','Keikyu','png_band/Keikyu/1200-1200A',1200,1200,'A',NULL,'../images/列车/京浜急行電鉄/京浜急行電鉄_2100形.png',NULL,FALSE,FALSE),
 ('2611','Keikyu','png_band/Keikyu/1203-1203A',1203,1203,'A',NULL,'../images/列车/京浜急行電鉄/京浜急行電鉄_2100形.png',NULL,FALSE,FALSE),
 ('2611','Keikyu','png_band/Keikyu/1302-1302A',1302,1302,'A',NULL,'../images/列车/京浜急行電鉄/京浜急行電鉄_2100形.png',NULL,FALSE,FALSE),
 ('2611','KeikyuKurihama','png_band/KeikyuKurihama/0603-0603C',603,603,'C',NULL,'../images/列车/京浜急行電鉄/京浜急行電鉄_2100形.png',NULL,FALSE,FALSE),
 ('2611','KeikyuKurihama','png_band/KeikyuKurihama/0702-0702C',702,702,'C',NULL,'../images/列车/京浜急行電鉄/京浜急行電鉄_2100形.png',NULL,FALSE,FALSE),
 ('2611','KeikyuKurihama','png_band/KeikyuKurihama/0901-0901A',901,901,'A',NULL,'../images/列车/京浜急行電鉄/京浜急行電鉄_2100形.png',NULL,FALSE,FALSE),
 ('2611','KeikyuKurihama','png_band/KeikyuKurihama/0903-0903A',903,903,'A',NULL,'../images/列车/京浜急行電鉄/京浜急行電鉄_2100形.png',NULL,FALSE,FALSE),
 ('2611','KeikyuKurihama','png_band/KeikyuKurihama/1000-1000A',1000,1000,'A',NULL,'../images/列车/京浜急行電鉄/京浜急行電鉄_2100形.png',NULL,FALSE,FALSE),
 ('2611','KeikyuKurihama','png_band/KeikyuKurihama/1002-1002A',1002,1002,'A',NULL,'../images/列车/京浜急行電鉄/京浜急行電鉄_2100形.png',NULL,FALSE,FALSE),
 ('2611','KeikyuKurihama','png_band/KeikyuKurihama/1101-1101A',1101,1101,'A',NULL,'../images/列车/京浜急行電鉄/京浜急行電鉄_2100形.png',NULL,FALSE,FALSE),
 ('2611','KeikyuKurihama','png_band/KeikyuKurihama/1200-1200A',1200,1200,'A',NULL,'../images/列车/京浜急行電鉄/京浜急行電鉄_2100形.png',NULL,FALSE,FALSE),
 ('2611','KeikyuKurihama','png_band/KeikyuKurihama/1203-1203A',1203,1203,'A',NULL,'../images/列车/京浜急行電鉄/京浜急行電鉄_2100形.png',NULL,FALSE,FALSE),
 ('2611','KeikyuKurihama','png_band/KeikyuKurihama/1302-1302A',1302,1302,'A',NULL,'../images/列车/京浜急行電鉄/京浜急行電鉄_2100形.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
     WHERE edition='2611' AND line_key IN ('Keikyu','KeikyuKurihama')
       AND png_reference='../images/列车/京浜急行電鉄/京浜急行電鉄_2100形.png'
       AND segment_key LIKE 'png_band/%'
       AND min_number=max_number AND suffix IN ('A','C')
       AND vehicle_model IS NULL AND source_url IS NULL
       AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE
     )<>20
 THEN RAISE EXCEPTION 'Private17: expected twenty exact scoped singleton refs'; END IF;
 IF (SELECT COUNT(DISTINCT min_number::text||suffix)
   FROM public.published_train_png_number_ranges
   WHERE edition='2611' AND line_key IN ('Keikyu','KeikyuKurihama')
     AND png_reference='../images/列车/京浜急行電鉄/京浜急行電鉄_2100形.png')<>10
 THEN RAISE EXCEPTION 'Private17: ten source-backed full numbers mismatch'; END IF;
END;
$verify$;
COMMIT;
