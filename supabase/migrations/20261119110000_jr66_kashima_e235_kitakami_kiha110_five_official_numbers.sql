-- JR66: five EXACT published 2611 JR East train numbers, not their wide source envelopes.
-- Official 2026-11 timetable references (the train number only; not confirmed vehicle):
-- Kashima 9520M: https://timetables.jreast.co.jp/2611/timetable-v/214u2.html
-- Kashima 9545M: https://timetables.jreast.co.jp/2611/timetable-v/214d2.html
-- Kitakami 723D: https://timetables.jreast.co.jp/2611/train/050/051721.html
-- Kitakami 727D: https://timetables.jreast.co.jp/2611/train/050/051731.html
-- Kitakami 733D: https://timetables.jreast.co.jp/2611/train/050/051751.html
-- Kitakami Hotto-Yuda - Yokote suspension from October 23 remains a runtime limitation.
-- Does NOT claim that any number implies a confirmed trainset or a particular service day.
BEGIN;
DO $preflight$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges
  WHERE edition='2611' AND line_key='Kashima' AND segment_key='e235_through'
   AND min_number=9520 AND max_number=9545 AND suffix='M'
   AND vehicle_model='E235系1000番台'
   AND png_reference='../images/列车/JR東日本/JR東日本_E235系_1000番台.png'
   AND source_url='https://www.jreast.co.jp/train/local/e235.html'
   AND requires_exact_roster AND NOT actual_vehicle_confirmed) <> 1
 THEN RAISE EXCEPTION 'JR66: original Kashima E235 9520-9545M source range changed'; END IF;
 IF (SELECT count(*) FROM public.published_train_png_number_ranges
  WHERE edition='2611' AND line_key='Kitakami' AND segment_key='rail_to_hotto_yuda'
   AND min_number=722 AND max_number=739 AND suffix='D'
   AND vehicle_model='キハ110系'
   AND png_reference='../images/列车/JR東日本/JR東日本_キハ110系.png'
   AND source_url='https://timetables.jreast.co.jp/2611/timetable/tt0564/0564040.html'
   AND requires_exact_roster AND NOT actual_vehicle_confirmed) <> 1
 THEN RAISE EXCEPTION 'JR66: original Kitakami KiHa110 722-739D source range changed'; END IF;
 IF (SELECT count(*) FROM public.vehicle_image_assets WHERE operator='JR-East'
 AND asset_status='available' AND file_format_status='native_png'
 AND ((image_path='images/列车/JR東日本/JR東日本_E235系_1000番台.png' AND asset_scope='subseries' AND vehicle_type='E235系')
 OR (image_path='images/列车/JR東日本/JR東日本_キハ110系.png' AND asset_scope='generic' AND vehicle_type='キハ110系'))) <> 2
 THEN RAISE EXCEPTION 'JR66: E235 subseries/KiHa110 PNG source changed'; END IF;
 IF EXISTS (
 SELECT 1 FROM public.published_train_png_number_ranges p
 JOIN (VALUES
 ('Kashima',9520,'M','../images/列车/JR東日本/JR東日本_E235系_1000番台.png'),
 ('Kashima',9545,'M','../images/列车/JR東日本/JR東日本_E235系_1000番台.png'),
 ('Kitakami',723,'D','../images/列车/JR東日本/JR東日本_キハ110系.png'),
 ('Kitakami',727,'D','../images/列车/JR東日本/JR東日本_キハ110系.png'),
 ('Kitakami',733,'D','../images/列车/JR東日本/JR東日本_キハ110系.png')
 ) t(line_key,n,suffix,png_reference)
 ON p.line_key=t.line_key AND p.suffix=t.suffix
 AND p.min_number<=t.n AND p.max_number>=t.n
 WHERE p.edition='2611' AND p.segment_key LIKE 'png_band/%'
 ) THEN RAISE EXCEPTION 'JR66: a five-number target already exists in a pure band'; END IF;
END
$preflight$;
INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,
vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','Kashima','png_band/Kashima/9520-9520M',9520,9520,'M',NULL,'../images/列车/JR東日本/JR東日本_E235系_1000番台.png',NULL,FALSE,FALSE),
 ('2611','Kashima','png_band/Kashima/9545-9545M',9545,9545,'M',NULL,'../images/列车/JR東日本/JR東日本_E235系_1000番台.png',NULL,FALSE,FALSE),
 ('2611','Kitakami','png_band/Kitakami/0723-0723D',723,723,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
 ('2611','Kitakami','png_band/Kitakami/0727-0727D',727,727,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE),
 ('2611','Kitakami','png_band/Kitakami/0733-0733D',733,733,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系.png',NULL,FALSE,FALSE);
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND segment_key IN (
 'png_band/Kashima/9520-9520M',
 'png_band/Kashima/9545-9545M',
 'png_band/Kitakami/0723-0723D',
 'png_band/Kitakami/0727-0727D',
 'png_band/Kitakami/0733-0733D'
 ) AND vehicle_model IS NULL AND source_url IS NULL
 AND NOT requires_exact_roster AND NOT actual_vehicle_confirmed)<>5
 THEN RAISE EXCEPTION 'JR66: five exact-reference PNG bands were not persisted'; END IF;
 IF EXISTS (
 SELECT 1 FROM public.published_train_png_number_ranges a
 JOIN public.published_train_png_number_ranges b
 ON a.edition=b.edition AND a.line_key=b.line_key AND a.suffix=b.suffix
 AND a.min_number<=b.max_number AND b.min_number<=a.max_number
 AND a.png_reference<>b.png_reference
 WHERE a.edition='2611' AND a.segment_key LIKE 'png_band/%'
 AND b.segment_key LIKE 'png_band/%'
 ) THEN RAISE EXCEPTION 'JR66: different PNGs overlap within same line/suffix number'; END IF;
END
$verify$;
COMMIT;
