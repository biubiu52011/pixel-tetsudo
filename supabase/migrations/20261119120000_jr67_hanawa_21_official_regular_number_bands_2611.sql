-- JR67: JR East Hanawa Line (internal ODPT/JR-East line_key Kounan) 2026-11.
-- IMPORTANT: this is NOT Konan Railway. Keep existing JR-East Kounan proof identity.
-- Only the 21 explicitly published local D numbers from JR East's 2611 timetables:
-- outbound/down: https://timetables.jreast.co.jp/2611/timetable-v/274d1.html
--   921,1923,1925,929,1927,1931,933,1935,1937,1939 (D)
-- inbound/up: https://timetables.jreast.co.jp/2611/timetable-v/274u1.html
--   1922,1924,1926,928,1930,1932,1934,936,1938,1940,942 (D)
-- Nine compact gap-free reference intervals cover exactly those 21 numbers.
-- Exclude separate Hinabi 9921/9922D and 9934D maintenance, and do not
-- treat image references as proof of a real vehicle or calendar applicability.
BEGIN;
DO $preflight$
DECLARE source_count integer; asset_count integer; total_numbers integer;
BEGIN
 SELECT count(*) INTO source_count
 FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Kounan' AND segment_key='regular'
 AND min_number=921 AND max_number=1940 AND suffix='D'
 AND vehicle_model='キハ110系'
 AND png_reference='../images/列车/JR東日本/JR東日本_キハ110系.png'
 AND source_url='https://timetables.jreast.co.jp/2611/timetable-v/274d1.html'
 AND requires_exact_roster=TRUE AND actual_vehicle_confirmed=FALSE;
 IF source_count<>1 THEN RAISE EXCEPTION 'JR67: Hanawa/Kounan original KiHa110 regular-range evidence changed'; END IF;

 SELECT count(*) INTO asset_count FROM public.vehicle_image_assets
 WHERE image_path='images/列车/JR東日本/JR東日本_キハ110系.png'
 AND operator='JR-East' AND vehicle_type='キハ110系'
 AND asset_status='available' AND asset_scope='generic'
 AND file_format_status='native_png';
 IF asset_count<>1 THEN RAISE EXCEPTION 'JR67: original JR East KiHa110 PNG asset changed'; END IF;

 SELECT sum(hi-lo+1)::int INTO total_numbers FROM (VALUES
 (921,921),
 (928,929),
 (933,933),
 (936,936),
 (942,942),
 (1922,1927),
 (1930,1932),
 (1934,1935),
 (1937,1940)
 ) t(lo,hi);
 IF total_numbers<>21 THEN RAISE EXCEPTION 'JR67: merged nine ranges no longer cover exactly 21 official numbers'; END IF;

 IF EXISTS (
 SELECT 1 FROM public.published_train_png_number_ranges p
 JOIN (VALUES
 (921,921),
 (928,929),
 (933,933),
 (936,936),
 (942,942),
 (1922,1927),
 (1930,1932),
 (1934,1935),
 (1937,1940)
 ) t(lo,hi) ON p.min_number<=t.hi AND p.max_number>=t.lo
 WHERE p.edition='2611' AND p.line_key='Kounan'
 AND p.suffix='D' AND p.segment_key LIKE 'png_band/%'
 ) THEN RAISE EXCEPTION 'JR67: a target number already intersects a pure PNG band'; END IF;
END;
$preflight$;

INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,
 vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','Kounan','png_band/Kounan/921-921D',921,921,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
 ('2611','Kounan','png_band/Kounan/928-929D',928,929,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
 ('2611','Kounan','png_band/Kounan/933-933D',933,933,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
 ('2611','Kounan','png_band/Kounan/936-936D',936,936,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
 ('2611','Kounan','png_band/Kounan/942-942D',942,942,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
 ('2611','Kounan','png_band/Kounan/1922-1927D',1922,1927,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
 ('2611','Kounan','png_band/Kounan/1930-1932D',1930,1932,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
 ('2611','Kounan','png_band/Kounan/1934-1935D',1934,1935,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
 ('2611','Kounan','png_band/Kounan/1937-1940D',1937,1940,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE);

DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND segment_key IN (
 'png_band/Kounan/921-921D',
 'png_band/Kounan/928-929D',
 'png_band/Kounan/933-933D',
 'png_band/Kounan/936-936D',
 'png_band/Kounan/942-942D',
 'png_band/Kounan/1922-1927D',
 'png_band/Kounan/1930-1932D',
 'png_band/Kounan/1934-1935D',
 'png_band/Kounan/1937-1940D'
 ) AND line_key='Kounan' AND png_reference='../images/列车/JR東日本/JR東日本_キハ110系.png'
 AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>9
 THEN RAISE EXCEPTION 'JR67: expected nine pure reference intervals missing'; END IF;
 IF EXISTS (
 SELECT 1 FROM public.published_train_png_number_ranges a
 JOIN public.published_train_png_number_ranges b
 ON a.edition=b.edition AND a.line_key=b.line_key AND a.suffix=b.suffix
 AND a.min_number<=b.max_number AND b.min_number<=a.max_number
 AND a.png_reference<>b.png_reference
 WHERE a.edition='2611' AND a.segment_key LIKE 'png_band/%'
 AND b.segment_key LIKE 'png_band/%'
 ) THEN RAISE EXCEPTION 'JR67: different PNGs overlap same line and suffix'; END IF;
END;
$verify$;
COMMIT;
