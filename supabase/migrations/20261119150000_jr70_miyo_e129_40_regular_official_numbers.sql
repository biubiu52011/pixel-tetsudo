-- JR70: Miyo (弥彦線), 2026-11 JR East official timetable.
-- Official up  : https://timetables.jreast.co.jp/2611/timetable-v/233u1.html
-- Official down: https://timetables.jreast.co.jp/2611/timetable-v/233d1.html
-- The listed regular-train M numbers consist of 40 explicit consecutive
-- numbers in seven no-gap bands. Not all integer values of the original
-- 220..9284M E129 model envelope are supported; do NOT infer missing numbers.
-- A train-number-to-PNG band is only a reference; the original operating
-- date, station route, class, SQL model, and actual-vehicle guards still apply.
BEGIN;
DO $preflight$
DECLARE source_count integer; png_count integer; observed_count integer;
BEGIN
 SELECT count(*) INTO source_count
 FROM public.published_train_png_number_ranges p
 WHERE p.edition='2611' AND p.line_key='Miyo'
 AND p.segment_key='miyo_e129_regular_seasonal'
 AND p.min_number=220 AND p.max_number=9284 AND p.suffix='M'
 AND p.vehicle_model='E129系'
 AND p.png_reference='../images/列车/JR東日本/JR東日本_E129系.png'
 AND p.source_url='https://timetables.jreast.co.jp/2611/timetable-v/233u2.html'
 AND p.requires_exact_roster=TRUE AND p.actual_vehicle_confirmed=FALSE;
 IF source_count<>1 THEN
  RAISE EXCEPTION 'JR70: original Miyo E129 roster/source envelope changed';
 END IF;

 SELECT count(*) INTO png_count FROM public.vehicle_image_assets
 WHERE image_path='images/列车/JR東日本/JR東日本_E129系.png'
 AND operator='JR-East' AND asset_status='available' AND asset_scope='generic'
 AND vehicle_type='E129系' AND file_format_status='native_png';
 IF png_count<>1 THEN
  RAISE EXCEPTION 'JR70: registered E129 PNG changed';
 END IF;

 SELECT sum(hi-lo+1)::integer INTO observed_count FROM (VALUES
 (220,229),
 (231,232),
 (234,235),
 (237,238),
 (240,251),
 (261,265),
 (272,278)
 ) v(lo,hi);
 IF observed_count<>40 THEN
  RAISE EXCEPTION 'JR70: seven no-gap bands must represent 40 timetable numbers';
 END IF;

 IF EXISTS (
  SELECT 1 FROM public.published_train_png_number_ranges p
  JOIN (VALUES
 (220,229),
 (231,232),
 (234,235),
 (237,238),
 (240,251),
 (261,265),
 (272,278)
  ) v(lo,hi) ON p.min_number<=v.hi AND p.max_number>=v.lo
  WHERE p.edition='2611' AND p.line_key='Miyo' AND p.suffix='M'
  AND p.segment_key LIKE 'png_band/%'
 ) THEN
  RAISE EXCEPTION 'JR70: Miyo official bands overlap an existing pure PNG range';
 END IF;
END
$preflight$;

INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,
 vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','Miyo','png_band/Miyo/0220-0229M',220,229,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
 ('2611','Miyo','png_band/Miyo/0231-0232M',231,232,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
 ('2611','Miyo','png_band/Miyo/0234-0235M',234,235,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
 ('2611','Miyo','png_band/Miyo/0237-0238M',237,238,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
 ('2611','Miyo','png_band/Miyo/0240-0251M',240,251,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
 ('2611','Miyo','png_band/Miyo/0261-0265M',261,265,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE),
 ('2611','Miyo','png_band/Miyo/0272-0278M',272,278,'M',NULL,'../images/列车/JR東日本/JR東日本_E129系.png',NULL,FALSE,FALSE);

DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Miyo' AND segment_key IN (
  'png_band/Miyo/0220-0229M',
  'png_band/Miyo/0231-0232M',
  'png_band/Miyo/0234-0235M',
  'png_band/Miyo/0237-0238M',
  'png_band/Miyo/0240-0251M',
  'png_band/Miyo/0261-0265M',
  'png_band/Miyo/0272-0278M'
 ) AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>7
 THEN RAISE EXCEPTION 'JR70: seven pure E129 bands not persisted'; END IF;
 IF EXISTS (
 SELECT 1 FROM public.published_train_png_number_ranges a
 JOIN public.published_train_png_number_ranges b
 ON a.edition=b.edition AND a.line_key=b.line_key AND a.suffix=b.suffix
 AND a.min_number<=b.max_number AND b.min_number<=a.max_number
 AND a.png_reference<>b.png_reference
 WHERE a.edition='2611' AND a.segment_key LIKE 'png_band/%'
 AND b.segment_key LIKE 'png_band/%'
 ) THEN RAISE EXCEPTION 'JR70: different pure PNGs conflict within the same line'; END IF;
END
$verify$;
COMMIT;
