-- Private18: source-backed historic 634型 Sky Tree Train excursion numbers.
-- Official Tobu 2026 July/August Aizu Railway/Yagan Railway charter timetable:
-- https://www.tobu.co.jp/cms-pdf/news/20260617101307S58bkJR6rTPBgknijenx1A.pdf
-- Sky Tree Train 81: 5181, Kasukabe -> Tochigi -> Shimo-Imaichi -> Aizu-Tajima.
-- Sky Tree Train 82: 5182, Aizu-Tajima -> Shimo-Imaichi -> Kasukabe -> Asakusa.
-- Days: July 18/20, August 8/11/15, 2026. Not Nov 2026 or a live consist.
-- Scope: TobuNikko for both directions; TobuSkytree ONLY for 5182.
-- Tobu 634 is a review-only asset; no new auto-render authorization.
-- Crucially DO NOT seed 1262/1263 from 2026 July/Aug Nikko special timetables:
-- the same train numbers are officially used for N100 SPACIA X on other days.
-- Dates / actual 634 consist / line segments must be verified by existing
-- runtime guards; a plain png_band is only a historical reference index.
-- No priority, inferred neighbouring numbers, actual vehicle or roster proof.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.vehicle_image_assets
   WHERE image_path='images/列车/東武鉄道/東武鉄道_634型_スカイツリートレイン.png'
     AND operator='Tobu' AND vehicle_type='634型'
     AND asset_status='available' AND file_format_status='native_png'
     AND asset_scope='review' AND is_generic=FALSE
     AND formation_id IS NULL AND car_id IS NULL
 ) THEN RAISE EXCEPTION 'Private18: expected review-only Tobu 634 gallery asset missing'; END IF;
 IF EXISTS(
   WITH proposed(line_key,num) AS (
     VALUES ('TobuNikko',5181),('TobuNikko',5182),('TobuSkytree',5182)
   )
   SELECT 1 FROM proposed p
   JOIN public.published_train_png_number_ranges r ON
     r.edition='2611' AND r.line_key=p.line_key AND
     COALESCE(r.suffix,'')='' AND p.num BETWEEN r.min_number AND r.max_number
 ) THEN RAISE EXCEPTION 'Private18: existing source number collision; do not insert'; END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','TobuNikko','png_band/TobuNikko/5181-5181',5181,5181,'',NULL,'../images/列车/東武鉄道/東武鉄道_634型_スカイツリートレイン.png',NULL,FALSE,FALSE),
 ('2611','TobuNikko','png_band/TobuNikko/5182-5182',5182,5182,'',NULL,'../images/列车/東武鉄道/東武鉄道_634型_スカイツリートレイン.png',NULL,FALSE,FALSE),
 ('2611','TobuSkytree','png_band/TobuSkytree/5182-5182',5182,5182,'',NULL,'../images/列车/東武鉄道/東武鉄道_634型_スカイツリートレイン.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
     WHERE edition='2611' AND png_reference='../images/列车/東武鉄道/東武鉄道_634型_スカイツリートレイン.png'
       AND segment_key LIKE 'png_band/%'
       AND vehicle_model IS NULL AND source_url IS NULL
       AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE
       AND min_number=max_number AND suffix='' AND
       ((line_key='TobuNikko' AND min_number IN (5181,5182))
        OR (line_key='TobuSkytree' AND min_number=5182))
    ) <> 3 THEN RAISE EXCEPTION 'Private18: expected 3 exact scoped references'; END IF;
END;
$verify$;
COMMIT;
