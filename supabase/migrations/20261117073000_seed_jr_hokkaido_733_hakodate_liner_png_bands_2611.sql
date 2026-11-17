-- JR Hokkaido 733-1000 Hakodate Liner illustration-only number bands.
-- Boundaries are from the 2026 Hakodate Main up/down public train-number lists:
-- local Liner family 1321M..1368M, rapid Liner family 3323M..3362M.
-- Sparse numbers may appear within an inclusive range; ONLY existing matching
-- Hakodate-Liner services with their source, date, train type and calendar
-- already verified may use these bounds. Never infer a physical carset.
-- 2026 Hakodate Main line train-number table:
-- https://jrhokkaidonorikae.com/vtime/vtime.php?p=y&s=2810
-- https://jrhokkaidonorikae.com/vtime/vtime.php?p=y&s=2811
-- 733-1000 is the dedicated Hakodate Liner subseries.
DO $jr_hakodate_liner_png_guard$
DECLARE r record;
BEGIN
 IF NOT EXISTS(
   SELECT 1 FROM public.vehicle_image_assets
   WHERE image_path='images/列车/JR北海道/JR北海道_733系_1000代_はこだてライナー.png'
    AND operator='JR-Hokkaido' AND asset_status='available'
    AND file_format_status='native_png'
    AND appearance_class IS DISTINCT FROM 'requires_review'
 ) THEN RAISE EXCEPTION 'JR Hokkaido 733-1000 PNG unavailable'; END IF;
 FOR r IN SELECT * FROM (VALUES
   (1321,1368),(3323,3362)
 ) AS v(first_number,last_number)
 LOOP
  IF EXISTS(
   SELECT 1 FROM public.published_train_png_number_ranges p
   WHERE p.edition='2611' AND p.line_key='HakodateMain' AND p.suffix='M'
    AND p.min_number<=r.last_number AND p.max_number>=r.first_number
    AND p.png_reference<>'../images/列车/JR北海道/JR北海道_733系_1000代_はこだてライナー.png'
  ) THEN RAISE EXCEPTION 'Conflicting Hakodate Liner band %-%',r.first_number,r.last_number;
  END IF;
 END LOOP;
END
$jr_hakodate_liner_png_guard$;

INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','HakodateMain','png_band/HakodateMain/1321-1368M',1321,1368,'M',NULL,'../images/列车/JR北海道/JR北海道_733系_1000代_はこだてライナー.png',NULL,FALSE,FALSE),
  ('2611','HakodateMain','png_band/HakodateMain/3323-3362M',3323,3362,'M',NULL,'../images/列车/JR北海道/JR北海道_733系_1000代_はこだてライナー.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;

DO $jr_hakodate_liner_verify$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='HakodateMain'
  AND png_reference='../images/列车/JR北海道/JR北海道_733系_1000代_はこだてライナー.png' AND suffix='M'
  AND segment_key LIKE 'png_band/%'
  AND actual_vehicle_confirmed=FALSE AND requires_exact_roster=FALSE
  AND vehicle_model IS NULL AND source_url IS NULL;
 IF n<>2 THEN RAISE EXCEPTION 'Hakodate Liner PNG band count not 2: %',n; END IF;
END
$jr_hakodate_liner_verify$;
