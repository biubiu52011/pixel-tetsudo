-- JR57: exact 2026-11 JR-West "Kuroshio / Ocean Arrow" train numbers,
-- strictly connected to the operator-declared 283-series vehicle family.
--
-- Operator official full number 2052M Kuroshio 2, Wakayama -> Shin-Osaka,
-- 2026-11-12 schedule, explicitly "オーシャンアロー車両で運転", daily:
-- https://timetable.jr-odekake.net/train-timetable/100511?date=20261112
-- Operator official full number 6055M Kuroshio 5, Shin-Osaka -> Shingu,
-- 2026-11-03, explicitly "オーシャンアロー車両で運転":
-- https://timetable.jr-odekake.net/train-timetable/198571?date=20261103
-- Also 2026-11-04 Kuroshio 5 with the identical full 6055M:
-- https://timetable.jr-odekake.net/train-timetable/198561?date=20261104
-- Operator official full number 2085M Kuroshio 35, Shin-Osaka -> Wakayama,
-- 2026-10-16 timetable with the 2026-11 calendar and daily operation,
-- explicitly "オーシャンアロー車両で運転":
-- https://timetable.jr-odekake.net/train-timetable/144441?date=20261016
-- Operator's official service page identifies Ocean Arrow as 283-series:
-- https://www.jr-odekake.net/railroad/kuroshio/
--
-- Scope by ACTUAL traversed line (not extra through-route propagation):
-- Hanwa 2052M / 2085M / 6055M, KiseiWest 6055M only.
-- The 2052M/2085M services start/end at Wakayama and do not continue
-- south on the KiseiWest corridor; never assign those to KiseiWest.
-- 2052, 2085, 6055 are three isolated exact train numbers, NOT an envelope.
-- Use the generic-name 283 PNG solely as SOURCE-ONLY; "_283系_K.png" remains
-- unnumbered because appearance/sub-variant evidence is unreviewed.
-- This migration does NOT confirm a running day, a real consist or artwork
-- validation, nor promote asset_status=review / appearance_class=requires_review.
BEGIN;
DO $preflight$
DECLARE n int;
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.vehicle_image_assets
  WHERE image_path='images/列车/JR西日本/JR西日本_283系.png'
    AND operator='JR-West' AND vehicle_type='283系'
    AND asset_scope='review' AND asset_status='review'
    AND file_format_status IS NULL AND appearance_class='requires_review'
    AND is_generic=FALSE AND formation_id IS NULL AND car_id IS NULL
 ) THEN RAISE EXCEPTION 'JR57: main 283-series PNG review asset changed'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.vehicle_image_assets
  WHERE image_path='images/列车/JR西日本/JR西日本_283系_K.png'
    AND asset_status='review' AND asset_scope='review'
 ) THEN RAISE EXCEPTION 'JR57: K-variant review image changed'; END IF;
 SELECT count(*) INTO n FROM public.published_train_png_number_ranges r
 JOIN (VALUES ('Hanwa',2052),('Hanwa',2085),('Hanwa',6055),('KiseiWest',6055))
     AS proposed(line_key,number) ON r.line_key=proposed.line_key
   AND r.edition='2611' AND r.suffix='M'
   AND proposed.number BETWEEN r.min_number AND r.max_number;
 IF n<>0 THEN RAISE EXCEPTION 'JR57: conflict with % existing referenced intervals',n; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,
 vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
('2611','Hanwa','png_band/Hanwa/2052-2052M',2052,2052,'M',NULL,'../images/列车/JR西日本/JR西日本_283系.png',NULL,FALSE,FALSE),
('2611','Hanwa','png_band/Hanwa/2085-2085M',2085,2085,'M',NULL,'../images/列车/JR西日本/JR西日本_283系.png',NULL,FALSE,FALSE),
('2611','Hanwa','png_band/Hanwa/6055-6055M',6055,6055,'M',NULL,'../images/列车/JR西日本/JR西日本_283系.png',NULL,FALSE,FALSE),
('2611','KiseiWest','png_band/KiseiWest/6055-6055M',6055,6055,'M',NULL,'../images/列车/JR西日本/JR西日本_283系.png',NULL,FALSE,FALSE);
DO $verify$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.published_train_png_number_ranges r
 JOIN (VALUES ('Hanwa',2052),('Hanwa',2085),('Hanwa',6055),('KiseiWest',6055))
      AS expected(line_key,number)
 ON r.edition='2611' AND r.line_key=expected.line_key AND r.min_number=expected.number
    AND r.max_number=expected.number AND r.suffix='M'
    AND r.segment_key='png_band/'||expected.line_key||'/'||expected.number||'-'||expected.number||'M'
 WHERE r.png_reference='../images/列车/JR西日本/JR西日本_283系.png'
   AND r.vehicle_model IS NULL AND r.source_url IS NULL
   AND r.requires_exact_roster=FALSE AND r.actual_vehicle_confirmed=FALSE;
 IF n<>4 THEN RAISE EXCEPTION 'JR57: verified only % of 4 required exact numbers',n; END IF;
END;
$verify$;
COMMIT;
