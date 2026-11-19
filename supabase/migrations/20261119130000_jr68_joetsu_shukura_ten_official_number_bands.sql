-- JR68: Joetsu Line November 2026 historical official published train numbers
-- for "越乃 / ゆざわ / あかね / 摂田屋 / 弥彦 Shu*Kura" services.
-- Internal line_key=Joetsu, 2611 edition only. No runtime model approval added.
-- Official JR East timetable evidence, exact (not inferred from min/max):
-- 8124D: https://timetables.jreast.co.jp/2611/timetable-v/296u2.html
-- 8133D: https://timetables.jreast.co.jp/2611/timetable-v/296d2.html
-- 9721D: https://timetables.jreast.co.jp/2611/timetable-v/296d2.html
-- 9726D: https://timetables.jreast.co.jp/2611/timetable-v/296u2.html
-- 9762D: https://timetables.jreast.co.jp/2611/timetable-v/296u1.html
-- 9765D: https://timetables.jreast.co.jp/2611/timetable-v/296d1.html
-- 9780D: https://timetables.jreast.co.jp/2611/timetable-v/296u1.html
-- 9781D: https://timetables.jreast.co.jp/2611/timetable-v/296d2.html
-- 9782D: https://timetables.jreast.co.jp/2611/timetable-v/296u2.html
-- 9783D: https://timetables.jreast.co.jp/2611/timetable-v/296d2.html
-- Ten distinct official D numbers compact to seven gap-free pure number bands.
-- In particular, 9780-9783D includes four separately evidenced numbers.
-- Some 2026-11 operating dates have already passed, others are future seasonal
-- days; do not infer daily service, concrete cars, or vehicle confirmation.
-- The PNG's asset_scope='review' is retained; no promotion or bypass.
BEGIN;
DO $preflight$
DECLARE n_source integer; n_asset integer; n_numbers integer;
BEGIN
 SELECT count(*) INTO n_source
 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Joetsu' AND segment_key='north'
 AND min_number=8124 AND max_number=9783 AND suffix='D'
 AND vehicle_model='キハ40・48形（越乃Shu＊Kura）'
 AND png_reference='../images/列车/JR東日本/JR東日本_キハ40・48形_越乃Shu＊Kura.png'
 AND source_url='https://timetables.jreast.co.jp/2611/timetable-v/296d2.html'
 AND requires_exact_roster=TRUE AND actual_vehicle_confirmed=FALSE;
 IF n_source<>1 THEN RAISE EXCEPTION 'JR68: original Joetsu ShuKura source-bound envelope changed'; END IF;

 SELECT count(*) INTO n_asset FROM public.vehicle_image_assets
 WHERE image_path='images/列车/JR東日本/JR東日本_キハ40・48形_越乃Shu＊Kura.png'
 AND operator='JR-East' AND asset_status='available'
 AND asset_scope='review' AND appearance_class='dedicated_vehicle_identity'
 AND vehicle_type='キハ40・48形' AND file_format_status='native_png';
 IF n_asset<>1 THEN RAISE EXCEPTION 'JR68: ShuKura PNG review source registration changed'; END IF;

 SELECT sum(hi-lo+1)::integer INTO n_numbers FROM (VALUES
 (8124,8124),
 (8133,8133),
 (9721,9721),
 (9726,9726),
 (9762,9762),
 (9765,9765),
 (9780,9783)
 ) t(lo,hi);
 IF n_numbers<>10 THEN RAISE EXCEPTION 'JR68: seven compact bands must cover exactly ten sourced numbers'; END IF;

 IF EXISTS (
 SELECT 1 FROM public.published_train_png_number_ranges p
 JOIN (VALUES
 (8124,8124),
 (8133,8133),
 (9721,9721),
 (9726,9726),
 (9762,9762),
 (9765,9765),
 (9780,9783)
 ) t(lo,hi)
 ON p.min_number<=t.hi AND p.max_number>=t.lo
 WHERE p.edition='2611' AND p.line_key='Joetsu'
 AND p.suffix='D' AND p.segment_key LIKE 'png_band/%'
 ) THEN RAISE EXCEPTION 'JR68: selected pure Joetsu D-number intervals overlap prior references'; END IF;
END;
$preflight$;

INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,
 vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','Joetsu','png_band/Joetsu/8124-8124D',8124,8124,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ40・48形_越乃Shu＊Kura.png',NULL,FALSE,FALSE),
 ('2611','Joetsu','png_band/Joetsu/8133-8133D',8133,8133,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ40・48形_越乃Shu＊Kura.png',NULL,FALSE,FALSE),
 ('2611','Joetsu','png_band/Joetsu/9721-9721D',9721,9721,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ40・48形_越乃Shu＊Kura.png',NULL,FALSE,FALSE),
 ('2611','Joetsu','png_band/Joetsu/9726-9726D',9726,9726,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ40・48形_越乃Shu＊Kura.png',NULL,FALSE,FALSE),
 ('2611','Joetsu','png_band/Joetsu/9762-9762D',9762,9762,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ40・48形_越乃Shu＊Kura.png',NULL,FALSE,FALSE),
 ('2611','Joetsu','png_band/Joetsu/9765-9765D',9765,9765,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ40・48形_越乃Shu＊Kura.png',NULL,FALSE,FALSE),
 ('2611','Joetsu','png_band/Joetsu/9780-9783D',9780,9783,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ40・48形_越乃Shu＊Kura.png',NULL,FALSE,FALSE);

DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Joetsu'
 AND segment_key IN (
 'png_band/Joetsu/8124-8124D',
  'png_band/Joetsu/8133-8133D',
  'png_band/Joetsu/9721-9721D',
  'png_band/Joetsu/9726-9726D',
  'png_band/Joetsu/9762-9762D',
  'png_band/Joetsu/9765-9765D',
  'png_band/Joetsu/9780-9783D'
 )
 AND png_reference='../images/列车/JR東日本/JR東日本_キハ40・48形_越乃Shu＊Kura.png'
 AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>7
 THEN RAISE EXCEPTION 'JR68: expected seven pure ShuKura reference intervals not persisted'; END IF;
 IF EXISTS (
 SELECT 1 FROM public.published_train_png_number_ranges a
 JOIN public.published_train_png_number_ranges b
 ON a.edition=b.edition AND a.line_key=b.line_key AND a.suffix=b.suffix
 AND a.min_number<=b.max_number AND b.min_number<=a.max_number
 AND a.png_reference<>b.png_reference
 WHERE a.edition='2611' AND a.segment_key LIKE 'png_band/%'
 AND b.segment_key LIKE 'png_band/%'
 ) THEN RAISE EXCEPTION 'JR68: conflicting distinct PNG for same line/suffix/number'; END IF;
END;
$verify$;
COMMIT;
