-- JR East 253-1000 PNG-first reference-only number intervals, edition 2611.
-- Numeric endpoints are from the 2026/11 JR East 2611 published Nikko/Kinugawa
-- train numbers (1082M,1083M,5021M,5022M,5026M,5113M).
-- JR East's 253-series Kinugawa vehicle guide and Tobu 2026 schedules tie
-- the 253 stock to those particular JR-through services.
-- The date, train type, exact official service name, source/operator and
-- through-running route must STILL be checked by their existing owner rules.
-- A reference-only band is NOT a claim that every train number and date runs,
-- and never proves the physical trainset; do not use it as an unconditional
-- image selection or replace any existing route/number resolver.
-- Official number examples:
-- https://timetables.jreast.co.jp/2611/train/045/046991.html
-- https://timetables.jreast.co.jp/2611/train/085/087831.html
-- https://timetables.jreast.co.jp/2611/train/095/096851.html
-- https://timetables.jreast.co.jp/2611/train/175/178011.html
-- https://timetables.jreast.co.jp/2611/train/085/087841.html
-- https://www.jreast.co.jp/train/express/nikkou_kinugawa.html
-- https://www.tobu.co.jp/pdf/timetable/2026/time-table_01_kudari.pdf

DO $jr253_png_guard$
DECLARE x record;
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.vehicle_image_assets
   WHERE image_path='images/列车/JR東日本/JR東日本_253系_1000番台.png'
     AND operator='JR-East' AND asset_status='available'
     AND file_format_status='native_png'
     AND appearance_class IS DISTINCT FROM 'requires_review'
 ) THEN
  RAISE EXCEPTION 'JR 253 PNG is unavailable or requires review';
 END IF;
 FOR x IN
  SELECT * FROM (VALUES
    ('UtsunomiyaJR',1082,1083),
    ('UtsunomiyaJR',5021,5022),
    ('UtsunomiyaJR',5026,5026),
    ('UtsunomiyaJR',5113,5113),
    ('TobuNikko',1082,1083),
    ('TobuNikko',5021,5022),
    ('TobuNikko',5026,5026),
    ('TobuNikko',5113,5113),
    ('Nikkoku',1082,1083),
    ('Nikkoku',5113,5113)
  ) AS v(line_key,min_number,max_number)
 LOOP
  IF EXISTS (
   SELECT 1 FROM public.published_train_png_number_ranges p
   WHERE p.edition='2611' AND p.line_key=x.line_key AND p.suffix='M'
     AND p.min_number<=x.max_number AND p.max_number>=x.min_number
     AND p.png_reference<>'../images/列车/JR東日本/JR東日本_253系_1000番台.png'
  ) THEN RAISE EXCEPTION 'JR 253 PNG band overlaps different artwork: %, %-%',
       x.line_key,x.min_number,x.max_number; END IF;
 END LOOP;
END
$jr253_png_guard$;

INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
 png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','UtsunomiyaJR','png_band/UtsunomiyaJR/1082-1083M',1082,1083,'M',NULL,'../images/列车/JR東日本/JR東日本_253系_1000番台.png',NULL,FALSE,FALSE),
  ('2611','UtsunomiyaJR','png_band/UtsunomiyaJR/5021-5022M',5021,5022,'M',NULL,'../images/列车/JR東日本/JR東日本_253系_1000番台.png',NULL,FALSE,FALSE),
  ('2611','UtsunomiyaJR','png_band/UtsunomiyaJR/5026-5026M',5026,5026,'M',NULL,'../images/列车/JR東日本/JR東日本_253系_1000番台.png',NULL,FALSE,FALSE),
  ('2611','UtsunomiyaJR','png_band/UtsunomiyaJR/5113-5113M',5113,5113,'M',NULL,'../images/列车/JR東日本/JR東日本_253系_1000番台.png',NULL,FALSE,FALSE),
  ('2611','TobuNikko','png_band/TobuNikko/1082-1083M',1082,1083,'M',NULL,'../images/列车/JR東日本/JR東日本_253系_1000番台.png',NULL,FALSE,FALSE),
  ('2611','TobuNikko','png_band/TobuNikko/5021-5022M',5021,5022,'M',NULL,'../images/列车/JR東日本/JR東日本_253系_1000番台.png',NULL,FALSE,FALSE),
  ('2611','TobuNikko','png_band/TobuNikko/5026-5026M',5026,5026,'M',NULL,'../images/列车/JR東日本/JR東日本_253系_1000番台.png',NULL,FALSE,FALSE),
  ('2611','TobuNikko','png_band/TobuNikko/5113-5113M',5113,5113,'M',NULL,'../images/列车/JR東日本/JR東日本_253系_1000番台.png',NULL,FALSE,FALSE),
  ('2611','Nikkoku','png_band/Nikkoku/1082-1083M',1082,1083,'M',NULL,'../images/列车/JR東日本/JR東日本_253系_1000番台.png',NULL,FALSE,FALSE),
  ('2611','Nikkoku','png_band/Nikkoku/5113-5113M',5113,5113,'M',NULL,'../images/列车/JR東日本/JR東日本_253系_1000番台.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;

DO $jr253_png_verify$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND png_reference='../images/列车/JR東日本/JR東日本_253系_1000番台.png'
   AND segment_key LIKE 'png_band/%' AND suffix='M'
   AND line_key IN ('UtsunomiyaJR','TobuNikko','Nikkoku')
   AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE
   AND vehicle_model IS NULL AND source_url IS NULL;
 IF n<>10 THEN RAISE EXCEPTION 'JR 253 reference bands mismatch % /10',n; END IF;
END
$jr253_png_verify$;
