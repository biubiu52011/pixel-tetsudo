-- JR50: official 2026-11 "Fujikawa" 1-14 public train numbers 4001M..4014M.
-- Original JR-Central gallery maps JR東海_373系.png to TokaidoCentral only.
-- JR East 2611 published Minobu timetable gives even 4002M/4004M/.../4014M:
-- https://timetables.jreast.co.jp/2611/timetable-v/109u1.html
-- JR 2026-11 "Fujikawa" 1/3/5/7/9/11/13 service roster and 13=4013M:
-- https://jr-group.jp/fujikawa-timetable/
-- https://timetable.jr-odekake.net/train-timetable/33561?date=20260517
-- JR Central explicitly identifies 373-series for Fujikawa:
-- https://recommend.jr-central.co.jp/oshi-tabi/contents025.html
-- This is a number-scoped _reference_ for existing TokaidoCentral gallery scope,
-- NOT a verified individual carset, livery, current running day, or new Minobu selector.
-- Preserve operator, direction, calendar, train class, source and identity guards.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS(
   SELECT 1 FROM public.vehicle_image_assets
   WHERE image_path='images/列车/JR東海/JR東海_373系.png'
     AND operator='JR-Central' AND vehicle_type='373系'
     AND asset_status='available' AND file_format_status='native_png'
     AND is_generic=TRUE AND formation_id IS NULL AND car_id IS NULL
 ) THEN RAISE EXCEPTION 'JR50: existing generic 373 gallery PNG not eligible'; END IF;

 IF EXISTS(
   SELECT 1 FROM public.published_train_png_number_ranges
   WHERE edition='2611' AND line_key='TokaidoCentral' AND suffix='M'
     AND min_number<=4014 AND max_number>=4001
 ) THEN RAISE EXCEPTION 'JR50: TokaidoCentral M-number band overlaps an existing record'; END IF;
END;
$preflight$;

INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','TokaidoCentral','png_band/TokaidoCentral/4001-4014M',4001,4014,'M',NULL,
  '../images/列车/JR東海/JR東海_373系.png',NULL,FALSE,FALSE);

DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges
     WHERE edition='2611' AND line_key='TokaidoCentral'
       AND segment_key='png_band/TokaidoCentral/4001-4014M'
       AND min_number=4001 AND max_number=4014 AND suffix='M'
       AND png_reference='../images/列车/JR東海/JR東海_373系.png'
       AND vehicle_model IS NULL AND source_url IS NULL
       AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>1
 THEN RAISE EXCEPTION 'JR50: expected pure 373 band missing or ambiguous'; END IF;
END;
$verify$;
COMMIT;
