-- JR-01: Eleven distinct exact public K-suffix train numbers listed by
-- JR East's 2026-11 Tokyo Metro Tozai timetable (NOT K operation identifiers).
-- https://timetables.jreast.co.jp/2611/timetable-v/671d1p.html
-- https://timetables.jreast.co.jp/2611/timetable-v/671d2.html
-- JRE's E231-800 Tozai-through model: https://media.jreast.co.jp/articles/1723
-- Only the exact 11 numbers below are referenced. Do NOT use 0400-2599K as a
-- continuous roster; do NOT infer train identity, actual carset, paint, or run day.
-- Existing frontend Tozai suffix K, source-railway, operator, model and valid-date
-- guards remain authoritative. The metro-prefixed A/B original form is retained
-- by existing JS number parsing. The SQL pure bands are reference-only.
-- E231-0 and 209-500 Musashino exact rosters share numbers and require model
-- evidence: intentionally excluded to avoid any cross-PNG conflict.
BEGIN;
DO $pre$
DECLARE n_assets integer; n_existing integer; n_nums integer;
BEGIN
 SELECT count(*) INTO n_assets FROM public.vehicle_image_assets
 WHERE image_path='images/列车/JR東日本/JR東日本_E231系_800番台.png'
 AND operator='JR-East' AND asset_status='available'
 AND asset_scope='subseries' AND vehicle_type='E231系'
 AND file_format_status='native_png';
 IF n_assets<>1 THEN RAISE EXCEPTION 'JR-01: E231-800 asset registration changed'; END IF;
 SELECT count(DISTINCT number) INTO n_nums FROM (VALUES
 (507),
 (603),
 (605),
 (611),
 (703),
 (707),
 (903),
 (1203),
 (1403),
 (1611),
 (1703)
 ) t(number);
 IF n_nums<>11 THEN RAISE EXCEPTION 'JR-01: expected 11 distinct official K train numbers'; END IF;
 SELECT count(*) INTO n_existing
 FROM public.published_train_png_number_ranges p
 JOIN (VALUES
 (507),
 (603),
 (605),
 (611),
 (703),
 (707),
 (903),
 (1203),
 (1403),
 (1611),
 (1703)
 ) t(number) ON p.min_number <= t.number AND p.max_number >= t.number
 WHERE p.edition='2611' AND p.line_key='Tozai' AND p.suffix='K'
 AND p.segment_key LIKE 'png_band/%';
 IF n_existing<>0 THEN RAISE EXCEPTION 'JR-01: K PNG reference overlap already exists'; END IF;
END
$pre$;
INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','Tozai','png_band/Tozai/0507-0507K',507,507,'K',NULL,'../images/列车/JR東日本/JR東日本_E231系_800番台.png',NULL,FALSE,FALSE),
 ('2611','Tozai','png_band/Tozai/0603-0603K',603,603,'K',NULL,'../images/列车/JR東日本/JR東日本_E231系_800番台.png',NULL,FALSE,FALSE),
 ('2611','Tozai','png_band/Tozai/0605-0605K',605,605,'K',NULL,'../images/列车/JR東日本/JR東日本_E231系_800番台.png',NULL,FALSE,FALSE),
 ('2611','Tozai','png_band/Tozai/0611-0611K',611,611,'K',NULL,'../images/列车/JR東日本/JR東日本_E231系_800番台.png',NULL,FALSE,FALSE),
 ('2611','Tozai','png_band/Tozai/0703-0703K',703,703,'K',NULL,'../images/列车/JR東日本/JR東日本_E231系_800番台.png',NULL,FALSE,FALSE),
 ('2611','Tozai','png_band/Tozai/0707-0707K',707,707,'K',NULL,'../images/列车/JR東日本/JR東日本_E231系_800番台.png',NULL,FALSE,FALSE),
 ('2611','Tozai','png_band/Tozai/0903-0903K',903,903,'K',NULL,'../images/列车/JR東日本/JR東日本_E231系_800番台.png',NULL,FALSE,FALSE),
 ('2611','Tozai','png_band/Tozai/1203-1203K',1203,1203,'K',NULL,'../images/列车/JR東日本/JR東日本_E231系_800番台.png',NULL,FALSE,FALSE),
 ('2611','Tozai','png_band/Tozai/1403-1403K',1403,1403,'K',NULL,'../images/列车/JR東日本/JR東日本_E231系_800番台.png',NULL,FALSE,FALSE),
 ('2611','Tozai','png_band/Tozai/1611-1611K',1611,1611,'K',NULL,'../images/列车/JR東日本/JR東日本_E231系_800番台.png',NULL,FALSE,FALSE),
 ('2611','Tozai','png_band/Tozai/1703-1703K',1703,1703,'K',NULL,'../images/列车/JR東日本/JR東日本_E231系_800番台.png',NULL,FALSE,FALSE);
DO $post$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Tozai' AND suffix='K'
 AND segment_key IN (
 'png_band/Tozai/0507-0507K',
 'png_band/Tozai/0603-0603K',
 'png_band/Tozai/0605-0605K',
 'png_band/Tozai/0611-0611K',
 'png_band/Tozai/0703-0703K',
 'png_band/Tozai/0707-0707K',
 'png_band/Tozai/0903-0903K',
 'png_band/Tozai/1203-1203K',
 'png_band/Tozai/1403-1403K',
 'png_band/Tozai/1611-1611K',
 'png_band/Tozai/1703-1703K'
 )
 AND png_reference='../images/列车/JR東日本/JR東日本_E231系_800番台.png'
 AND min_number=max_number AND source_url IS NULL AND vehicle_model IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>11
 THEN RAISE EXCEPTION 'JR-01: expected eleven single-number reference rows'; END IF;
 IF EXISTS (
 SELECT 1 FROM public.published_train_png_number_ranges a
 JOIN public.published_train_png_number_ranges b
 ON a.edition=b.edition AND a.line_key=b.line_key AND a.suffix=b.suffix
 AND a.min_number<=b.max_number AND b.min_number<=a.max_number
 AND a.png_reference<>b.png_reference
 WHERE a.edition='2611'
 AND a.segment_key LIKE 'png_band/%' AND b.segment_key LIKE 'png_band/%'
 ) THEN RAISE EXCEPTION 'JR-01: cross-PNG reference collision'; END IF;
END
$post$;
COMMIT;
