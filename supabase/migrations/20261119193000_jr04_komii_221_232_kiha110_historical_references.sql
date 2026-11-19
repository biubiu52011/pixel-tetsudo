-- JR-04: two exact historical KiHa110 Kosumi / Komii train-number sources.
-- 221D: 2026-01-03 firsthand 小海線221D photographed with KiHa110;
-- posted 2026-01-09 https://onadaka.blog.fc2.com/?no=6483
-- 232D: 2026-06-21 firsthand Komoro 14:00 232D KiHa110 two-car ride;
-- https://ameblo.jp/syoniitachan/entry-12979520820.html
-- JR East official 2611 Komii service numbers:
-- 221D https://timetables.jreast.co.jp/2611/timetable-v/228d1p.html
-- 232D https://timetables.jreast.co.jp/2611/timetable-v/228u1p.html
-- JR East official vehicle family:
-- https://www.jreast.co.jp/train/local/kiha110.html
-- These are HISTORICAL vehicle observations + separate Nov timetable proof
-- of the train numbers. They DO NOT prove any particular 2026-11 consist,
-- departure calendar, actual PNG car ID, or current-day vehicle assignment.
-- The line's 2026-11 timetable has temporary rockfall cancellations.
-- Never infer adjacent numbers or unobserved vehicle identity.
-- A KiHa110 number is not a vehicle serial number.
-- Do not modify existing JS source-date/model/line/corridor guards.
BEGIN;
DO $pre$
DECLARE v_assets integer; v_existing integer;
BEGIN
 SELECT COUNT(*) INTO v_assets FROM public.vehicle_image_assets
 WHERE image_path='images/列车/JR東日本/JR東日本_キハ110系（小海線）.png' AND operator='JR-East'
 AND asset_status='available' AND asset_scope='generic'
 AND vehicle_type='キハ110系（小海線）' AND file_format_status='native_png';
 IF v_assets<>1 THEN RAISE EXCEPTION 'JR-04: KiHa110 Komii asset status changed'; END IF;
 SELECT COUNT(*) INTO v_existing FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Komii' AND suffix='D'
 AND segment_key LIKE 'png_band/%'
 AND ((min_number<=221 AND max_number>=221) OR
      (min_number<=232 AND max_number>=232));
 IF v_existing<>0 THEN RAISE EXCEPTION 'JR-04: 221D or 232D was already numbered'; END IF;
END
$pre$;
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,
  vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','Komii','png_band/Komii/0221-0221D',221,221,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系（小海線）.png',NULL,FALSE,FALSE),
 ('2611','Komii','png_band/Komii/0232-0232D',232,232,'D',NULL,'../images/列车/JR東日本/JR東日本_キハ110系（小海線）.png',NULL,FALSE,FALSE);
DO $post$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_train_png_number_ranges
 WHERE edition='2611' AND line_key='Komii'
 AND segment_key IN ('png_band/Komii/0221-0221D','png_band/Komii/0232-0232D')
 AND min_number=max_number AND suffix='D' AND png_reference='../images/列车/JR東日本/JR東日本_キハ110系（小海線）.png'
 AND vehicle_model IS NULL AND source_url IS NULL
 AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE)<>2
 THEN RAISE EXCEPTION 'JR-04: two reference-only exact numbers not present'; END IF;
 IF EXISTS (
  SELECT 1 FROM public.published_train_png_number_ranges a
  JOIN public.published_train_png_number_ranges b
    ON a.edition=b.edition AND a.line_key=b.line_key AND a.suffix=b.suffix
   AND a.min_number<=b.max_number AND b.min_number<=a.max_number
   AND a.png_reference<>b.png_reference
  WHERE a.edition='2611' AND a.segment_key LIKE 'png_band/%'
    AND b.segment_key LIKE 'png_band/%'
 ) THEN RAISE EXCEPTION 'JR-04: competing PNG same pure line/number/suffix'; END IF;
END
$post$;
COMMIT;
