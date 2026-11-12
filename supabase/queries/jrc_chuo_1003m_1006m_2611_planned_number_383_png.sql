-- Extend existing ChuoCentral 2611 native 383 illustration PNG pool.
-- Source-owned official planned service numbers 1003M/1004M/1005M/1006M.
-- Numbers are individual min=max rules; never calculate entire number series.
-- 383 image is a planned-number MAP ILLUSTRATION, never live carset evidence.
BEGIN;
DO $validate$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM (
  SELECT t.train_number
  FROM public.manual_timetable_templates t
  WHERE t.line_key='ChuoCentral' AND t.train_number IN ('1003M','1004M','1005M','1006M')
    AND t.railway_urn='odpt.Railway:JR-Central.Chuo'
    AND t.train_type_urn='odpt.TrainType:JR-Central.LimitedExpress'
    AND t.source_revision_date='2026-11-01'
    AND t.operating_dates IS NOT NULL
  GROUP BY t.train_number HAVING count(distinct calendar_urn)=2
    AND count(distinct direction_urn)=1
 ) ok;
 IF n<>4 THEN RAISE EXCEPTION 'CHUO_NEW_SHINANO_2611_SCHEDULE_ROSTER_INVALID:%',n; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.vehicle_image_assets
  WHERE operator='JR-Central' AND vehicle_type='383系'
  AND image_path='images/列车/JR東海/JR東海_383系.png'
  AND asset_status='available' AND file_format_status='native_png'
 ) THEN RAISE EXCEPTION 'JR_CENTRAL_NATIVE_383_PNG_ABSENT'; END IF;
END
$validate$;
WITH numbered(num,url) AS (VALUES
 (1003,'https://timetables.jreast.co.jp/2611/train/000/000081.html'),
 (1004,'https://timetables.jreast.co.jp/2611/train/000/000111.html'),
 (1005,'https://timetables.jreast.co.jp/2611/train/015/019971.html'),
 (1006,'https://timetables.jreast.co.jp/2611/train/000/000151.html')
)
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,
 vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
SELECT '2611','ChuoCentral','2611_shinano_exact_planned_number_reference',
 num,num,'M','383系','../images/列车/JR東海/JR東海_383系.png',
 url,true,false FROM numbered
ON CONFLICT DO NOTHING;
COMMIT;
SELECT min_number::text||suffix as planned_number,vehicle_model,png_reference,
       actual_vehicle_confirmed
FROM public.published_train_png_number_ranges
WHERE line_key='ChuoCentral' and edition='2611'
AND segment_key='2611_shinano_exact_planned_number_reference'
ORDER BY min_number;
