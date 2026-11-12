-- Four source-backed exact planned-number entries for JR-Central ChuoCentral
-- 1001M / 1002M / 1011M / 1026M scheduled Shinano services (November 2026).
-- PNG pool is a LINE + TRAIN NUMBER -> native 383-family illustration.
-- Does not prove any actual day's formation, location or vehicle assignment.
-- Official number/stop references: JR East 2611 individual planned timetable.
-- Fleet context: https://company.jr-central.co.jp/sustainability/social/conventional-line/
BEGIN;
DO $precheck$
DECLARE n integer;
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.vehicle_image_assets
   WHERE operator='JR-Central' AND vehicle_type='383系'
     AND image_path='images/列车/JR東海/JR東海_383系.png'
     AND asset_status='available' AND file_format_status='native_png'
     AND is_generic=true
 ) THEN RAISE EXCEPTION 'JRC_CHUO_GENERIC_383_GALLERY_NOT_REGISTERED'; END IF;
 SELECT count(*) INTO n
 FROM (
   SELECT train_number FROM public.manual_timetable_templates
   WHERE line_key='ChuoCentral'
     AND train_number IN ('1001M','1002M','1011M','1026M')
     AND railway_urn='odpt.Railway:JR-Central.Chuo'
     AND train_type_urn='odpt.TrainType:JR-Central.LimitedExpress'
     AND source_revision_date='2026-11-01'::date
     AND operating_dates IS NOT NULL
   GROUP BY train_number
   HAVING count(DISTINCT calendar_urn)=2
     AND count(DISTINCT direction_urn)=1
 ) ready;
 IF n<>4 THEN RAISE EXCEPTION 'JRC_CHUO_2611_PLANNED_NUMBER_ROSTER_NOT_READY: %', n; END IF;
END
$precheck$;
WITH approved(train_number,source_url) AS (
 VALUES
 ('1001M','https://timetables.jreast.co.jp/2611/train/000/000041.html'),
 ('1002M','https://timetables.jreast.co.jp/2611/train/000/000071.html'),
 ('1011M','https://timetables.jreast.co.jp/2611/train/000/000271.html'),
 ('1026M','https://timetables.jreast.co.jp/2611/train/000/000461.html')
)
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,
  vehicle_model,png_reference,source_url,requires_exact_roster,
  actual_vehicle_confirmed)
SELECT '2611','ChuoCentral','2611_shinano_exact_planned_number_reference',
 substring(train_number from '^[0-9]+')::integer,
 substring(train_number from '^[0-9]+')::integer,
 'M','383系','../images/列车/JR東海/JR東海_383系.png',
 source_url,true,false
FROM approved
ON CONFLICT DO NOTHING;
COMMIT;
SELECT line_key,edition,segment_key,count(*) AS exact_number_rules
FROM public.published_train_png_number_ranges
WHERE line_key='ChuoCentral' AND edition='2611'
  AND segment_key='2611_shinano_exact_planned_number_reference'
GROUP BY line_key,edition,segment_key;
