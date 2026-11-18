-- JR52: two exact WEST EXPRESS Ginga service-number references on the
-- Sanyo Main corridor (2026 October / November operator timetable).
-- 8076M official JR West train timetable (incl. 2026-11-18 scheduled):
-- https://timetable.jr-odekake.net/train-timetable/258771?date=20261028
-- 8079M official JR West train timetable (incl. 2026-11-16 scheduled):
-- https://timetable.jr-odekake.net/train-timetable/275451?date=20261103
-- Operator 2026 Sanyo route details:
-- https://www.jr-odekake.net/railroad/westexginga/course_sanyo/
-- JR West rolling-stock contractor confirms the one-set 117-series train:
-- https://media.jrw-ip.jp/news/9399/
--
-- SOURCE REFERENCE ONLY, not a live physical fleet assertion. Timetables
-- cannot establish that a scheduled run was not cancelled. The gallery PNG
-- remains asset_status=review / asset_scope=review / requires_review.
-- SanyoMain is the single scoped canonical route: do not assign these numbers
-- to SaninMain, KiseiWest, Tokaido, or TokaidoKansai via this migration.
-- Do not fill 8077M / 8078M; those numbers are not Sanyo November services.
-- No front-end artwork selection or override is added by this migration.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.vehicle_image_assets
  WHERE image_path='images/列车/JR西日本/JR西日本_117系_WEST_EXPRESS銀河.png'
    AND operator='JR-West' AND vehicle_type='117系'
    AND asset_status='review' AND asset_scope='review'
    AND appearance_class='requires_review'
    AND is_generic=FALSE AND formation_id IS NULL AND car_id IS NULL
 ) THEN
  RAISE EXCEPTION 'JR52: WEST EXPRESS Ginga review-only gallery record absent or changed';
 END IF;
 IF EXISTS (
   SELECT 1 FROM public.published_train_png_number_ranges r
   JOIN (VALUES (8076),(8079)) proposed(n)
     ON r.edition='2611' AND r.line_key='SanyoMain' AND r.suffix='M'
    AND proposed.n BETWEEN r.min_number AND r.max_number
 ) THEN
  RAISE EXCEPTION 'JR52: 8076M or 8079M already assigned on SanyoMain';
 END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','SanyoMain','png_band/SanyoMain/8076-8076M',8076,8076,'M',NULL,'../images/列车/JR西日本/JR西日本_117系_WEST_EXPRESS銀河.png',NULL,FALSE,FALSE),
 ('2611','SanyoMain','png_band/SanyoMain/8079-8079M',8079,8079,'M',NULL,'../images/列车/JR西日本/JR西日本_117系_WEST_EXPRESS銀河.png',NULL,FALSE,FALSE);
DO $verify$
DECLARE n_rows integer; n_numbers integer;
BEGIN
 SELECT COUNT(*), COALESCE(SUM(max_number-min_number+1),0)
 INTO n_rows,n_numbers
 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='SanyoMain' AND suffix='M'
  AND png_reference='../images/列车/JR西日本/JR西日本_117系_WEST_EXPRESS銀河.png'
  AND segment_key IN ('png_band/SanyoMain/8076-8076M','png_band/SanyoMain/8079-8079M')
  AND min_number=max_number AND vehicle_model IS NULL AND source_url IS NULL
  AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
 IF n_rows<>2 OR n_numbers<>2 THEN
  RAISE EXCEPTION 'JR52: reference band count mismatch: rows %, numbers %',n_rows,n_numbers;
 END IF;
END;
$verify$;
COMMIT;
