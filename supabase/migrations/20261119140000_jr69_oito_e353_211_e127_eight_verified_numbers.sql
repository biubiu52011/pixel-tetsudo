-- JR69: Oito Line / JR-East 2026-11 published eight exact M numbers.
-- Source: JR East https://timetables.jreast.co.jp/2611/timetable-v/230d1.html
--         https://timetables.jreast.co.jp/2611/timetable-v/230u1.html
--         https://timetables.jreast.co.jp/2611/timetable-v/230d2.html
--         https://timetables.jreast.co.jp/2611/timetable-v/230u2.html
-- Official timetable numbers: 5M,38M,3220M,5356M,8041M,8042M,8352M,8353M.
-- Existing train-number-png-ranges.js Oito strict-source proof:
-- 5M and 38M E353 (LimitedExpress), 3220M 211 Nagano Rapid,
-- 5356M E127-100 Rapid; seasonal Hakuba 8041/8042M E353 and
-- 8352/8353M E127-100 only on 2026-11-01/21/22/23 and exact date guard.
-- E127 PNG is asset_status=review and asset_scope=review; NOT promoted.
-- A pure-number range does not bypass SQL roster, calendar, route or real-car guards.
BEGIN;
DO $preflight$
DECLARE source_count integer; png_count integer; target_count integer;
BEGIN
 SELECT count(*) INTO source_count
 FROM public.published_train_png_number_ranges p
 JOIN (VALUES
 ('east_e353_azusa_hakuba',5,8042,'E353系','../images/列车/JR東日本/JR東日本_E353系.png','https://timetables.jreast.co.jp/2611/timetable-v/230d2.html'),
 ('east_211_family',1522,3259,'211系（長野地区）','../images/列车/JR東日本/JR東日本_211系_長野色.png','https://timetables.jreast.co.jp/2611/timetable-v/230u1.html'),
 ('east_e127_100_family',3111,8353,'E127系100番台','../images/列车/JR東日本/JR東日本_E127系_100番台_長野色.png','https://timetables.jreast.co.jp/2611/timetable-v/230d1.html')
 ) t(segment_key,lo,hi,vehicle_model,png_reference,source_url)
 ON p.segment_key=t.segment_key AND p.min_number=t.lo
 AND p.max_number=t.hi AND p.vehicle_model=t.vehicle_model
 AND p.png_reference=t.png_reference AND p.source_url=t.source_url
 WHERE p.edition='2611' AND p.line_key='Oito' AND p.suffix='M'
 AND p.requires_exact_roster=TRUE AND p.actual_vehicle_confirmed=FALSE;
 IF source_count<>3 THEN
  RAISE EXCEPTION 'JR69: three Oito original model/date evidence envelopes changed';
 END IF;

 SELECT count(*) INTO png_count FROM public.vehicle_image_assets p
 JOIN (VALUES
 ('images/列车/JR東日本/JR東日本_E353系.png','available','generic','E353系'),
 ('images/列车/JR東日本/JR東日本_211系_長野色.png','available','theme','211系'),
 ('images/列车/JR東日本/JR東日本_E127系_100番台_長野色.png','review','review','E127系100番台')
 ) a(image_path,asset_status,asset_scope,vehicle_type)
 ON p.image_path=a.image_path AND p.asset_status=a.asset_status
 AND p.asset_scope=a.asset_scope AND p.vehicle_type=a.vehicle_type
 WHERE p.operator='JR-East' AND p.file_format_status='native_png';
 IF png_count<>3 THEN
  RAISE EXCEPTION 'JR69: three original E353/211/E127 PNG asset registrations changed';
 END IF;

 SELECT sum(hi-lo+1)::integer INTO target_count FROM (VALUES
 (5,5),
 (38,38),
 (3220,3220),
 (5356,5356),
 (8041,8042),
 (8352,8353)
 ) v(lo,hi);
 IF target_count<>8 THEN
  RAISE EXCEPTION 'JR69: six intervals must match exactly eight official numbers';
 END IF;

 IF EXISTS (
  SELECT 1 FROM public.published_train_png_number_ranges p
  JOIN (VALUES
 (5,5),
 (38,38),
 (3220,3220),
 (5356,5356),
 (8041,8042),
 (8352,8353)
  ) v(lo,hi) ON p.min_number<=v.hi AND p.max_number>=v.lo
  WHERE p.edition='2611' AND p.line_key='Oito' AND p.suffix='M'
  AND p.segment_key LIKE 'png_band/%'
 ) THEN RAISE EXCEPTION 'JR69: Oito pure PNG range intersects an existing interval'; END IF;
END
$preflight$;

INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,
vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','Oito','png_band/Oito/5-5M',5,5,'M',NULL,'../images/列车/JR東日本/JR東日本_E353系.png',NULL,FALSE,FALSE),
 ('2611','Oito','png_band/Oito/38-38M',38,38,'M',NULL,'../images/列车/JR東日本/JR東日本_E353系.png',NULL,FALSE,FALSE),
 ('2611','Oito','png_band/Oito/3220-3220M',3220,3220,'M',NULL,'../images/列车/JR東日本/JR東日本_211系_長野色.png',NULL,FALSE,FALSE),
 ('2611','Oito','png_band/Oito/5356-5356M',5356,5356,'M',NULL,'../images/列车/JR東日本/JR東日本_E127系_100番台_長野色.png',NULL,FALSE,FALSE),
 ('2611','Oito','png_band/Oito/8041-8042M',8041,8042,'M',NULL,'../images/列车/JR東日本/JR東日本_E353系.png',NULL,FALSE,FALSE),
 ('2611','Oito','png_band/Oito/8352-8353M',8352,8353,'M',NULL,'../images/列车/JR東日本/JR東日本_E127系_100番台_長野色.png',NULL,FALSE,FALSE);

DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Oito'
 AND segment_key IN (
  'png_band/Oito/5-5M',
  'png_band/Oito/38-38M',
  'png_band/Oito/3220-3220M',
  'png_band/Oito/5356-5356M',
  'png_band/Oito/8041-8042M',
  'png_band/Oito/8352-8353M'
 ) AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>6
 THEN RAISE EXCEPTION 'JR69: six pure reference Oito intervals not persisted'; END IF;
 IF EXISTS (
 SELECT 1 FROM public.published_train_png_number_ranges a
 JOIN public.published_train_png_number_ranges b
 ON a.edition=b.edition AND a.line_key=b.line_key AND a.suffix=b.suffix
 AND a.min_number<=b.max_number AND b.min_number<=a.max_number
 AND a.png_reference<>b.png_reference
 WHERE a.edition='2611' AND a.segment_key LIKE 'png_band/%'
 AND b.segment_key LIKE 'png_band/%'
 ) THEN RAISE EXCEPTION 'JR69: different pure PNGs conflict within a line'; END IF;
END
$verify$;
COMMIT;
