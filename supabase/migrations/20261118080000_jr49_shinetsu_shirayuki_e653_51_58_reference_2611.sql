-- JR49: 2026-11 official Shinetsu/Shirayuki service numbers, 51M-58M.
-- Official JR East 2611 timetable references by exact named train:
-- 51M https://timetables.jreast.co.jp/2611/train/060/064031.html (Shirayuki 1; service calendar must be checked)
-- 52M https://timetables.jreast.co.jp/2611/train/060/064051.html (Shirayuki 2)
-- 53M https://timetables.jreast.co.jp/2611/train/110/111451.html (Shirayuki 3)
-- 54M https://timetables.jreast.co.jp/2611/train/060/064061.html (Shirayuki 4)
-- 55M https://timetables.jreast.co.jp/2611/train/060/064041.html (Shirayuki 5)
-- 56M https://timetables.jreast.co.jp/2611/train/060/064071.html (Shirayuki 6)
-- 57M https://timetables.jreast.co.jp/2611/train/110/111461.html (Shirayuki 7)
-- 58M https://timetables.jreast.co.jp/2611/train/075/076201.html (Shirayuki 8)
-- Model basis: https://www.jreast.co.jp/train/express/inaho_shirayuki.html (E653 family).
-- The existing gallery owner maps jr-east-e653-shirayuki to JR東日本_E653系.png / Shinetsu.
-- This is a number-bounded PNG illustration reference, NOT a physical consist, service-day,
-- exterior/livery, 4/7-car substitution or live fleet confirmation.
-- Preserve separate date, line, source, train type, operator and fleet-identity guards.
-- Do not create a new runtime selector or permit this band to override uncertain identities.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.vehicle_image_assets
   WHERE image_path='images/列车/JR東日本/JR東日本_E653系.png'
     AND operator='JR-East' AND asset_status='available'
     AND asset_scope='generic' AND is_generic=TRUE AND file_format_status='native_png'
 ) THEN RAISE EXCEPTION 'JR49: expected eligible generic PNG is missing'; END IF;
 IF EXISTS (
   SELECT 1 FROM public.published_train_png_number_ranges
   WHERE edition='2611' AND line_key='Shinetsu' AND suffix='M'
     AND min_number<=58 AND max_number>=51
 ) THEN RAISE EXCEPTION 'JR49: Shinetsu 51M-58M already intersects another mapping'; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','Shinetsu','png_band/Shinetsu/0051-0058M',51,58,'M',NULL,
  '../images/列车/JR東日本/JR東日本_E653系.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges
     WHERE edition='2611' AND line_key='Shinetsu' AND
       segment_key='png_band/Shinetsu/0051-0058M'
       AND min_number=51 AND max_number=58 AND suffix='M'
       AND png_reference='../images/列车/JR東日本/JR東日本_E653系.png'
       AND vehicle_model IS NULL AND source_url IS NULL
       AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'JR49: pure numbered reference not persisted precisely'; END IF;
END;
$verify$;
COMMIT;
