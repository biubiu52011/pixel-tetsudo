-- Official JR East 2611 Akita Shinkansen weekday name/NUMBER crosswalk.
-- These are selectively verified pairs, not "3000 + service number".
-- All additions preserve original service labels, direction, calendar and
-- official E6 single-fleet published plan. Actual-day carsets NOT verified.
BEGIN;
WITH official(service_label, full_number, direction, source_url) AS (
 VALUES
 ('こまち1','3001M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/258d1p.html'),
 ('こまち3','3003M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/258d1p.html'),
 ('こまち6','3006M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1p.html'),
 ('こまち17','9017M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1p.html'),
 ('こまち27','3027M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/258d1p.html'),
 ('こまち31','3031M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/258d1p.html'),
 ('こまち32','3032M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1p.html'),
 ('こまち41','3041M','Outbound','https://timetables.jreast.co.jp/2611/train/060/062371.html'),
 ('こまち45','5045M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/258d1p.html'),
 ('こまち51','5051M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/258d1p.html'),
 ('こまち95','3095M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/258d1p.html')
), matched AS (
 SELECT m.id,m.direction_urn,m.calendar_urn,o.full_number,o.source_url
 FROM official o
 JOIN public.manual_timetable_templates m
   ON m.line_key='AkitaShinkansen'
   AND m.train_number=o.service_label
   AND m.calendar_urn='odpt.Calendar:Weekday'
   AND m.direction_urn='odpt.RailDirection:'||o.direction
   AND m.railway_urn='odpt.Railway:JR-East.AkitaShinkansen'
 JOIN public.train_timetable_members mem
   ON mem.source_template_id=m.id
 JOIN public.train_timetable_vehicle_mappings vm
   ON vm.timetable_id=mem.timetable_id
   AND vm.source_template_id=m.id
   AND vm.vehicle_type='E6系'
   AND vm.mapping_level='official_service_vehicle_plan'
   AND vm.actual_vehicle_confirmed=false
), verified AS (SELECT count(*) AS n FROM matched)
INSERT INTO public.published_train_number_evidence
  (edition,line_key,calendar_urn,direction_urn,train_number,
   source_template_id,official_source_url,verification_scope)
SELECT '2611','AkitaShinkansen',m.calendar_urn,m.direction_urn,
   m.full_number,m.id,m.source_url,'train_number_only'
FROM matched m CROSS JOIN verified v WHERE v.n=11
ON CONFLICT DO NOTHING;

WITH roster AS (
 SELECT e.*,substring(e.train_number FROM '^[0-9]+')::int AS digits
 FROM public.published_train_number_evidence e
 JOIN public.manual_timetable_templates m
 ON m.id=e.source_template_id
 JOIN public.train_timetable_members mem ON mem.source_template_id=m.id
 JOIN public.train_timetable_vehicle_mappings vm
 ON vm.timetable_id=mem.timetable_id AND vm.source_template_id=m.id
 JOIN public.vehicle_image_assets asset
 ON asset.operator='JR-East' AND asset.vehicle_type='E6系'
 AND asset.image_path='images/列车/JR東日本/JR東日本_E6系.png'
 AND asset.asset_status='available' AND asset.is_generic=true
 AND asset.file_format_status='native_png'
 WHERE e.edition='2611' AND e.line_key='AkitaShinkansen'
 AND e.calendar_urn='odpt.Calendar:Weekday'
 AND e.train_number~'^[0-9]{1,5}M$'
 AND e.verification_scope='train_number_only'
 AND m.line_key='AkitaShinkansen'
 AND m.direction_urn=e.direction_urn
 AND m.railway_urn='odpt.Railway:JR-East.AkitaShinkansen'
 AND vm.vehicle_type='E6系'
 AND vm.mapping_level='official_service_vehicle_plan'
 AND vm.actual_vehicle_confirmed=false
)
INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,
 vehicle_model,png_reference,source_url,requires_exact_roster,
 actual_vehicle_confirmed)
SELECT edition,line_key,'weekday_verified_single_number',
  digits,digits,'M','E6系',
  '../images/列车/JR東日本/JR東日本_E6系.png',
  official_source_url,true,false FROM roster
WHERE (SELECT count(*) FROM roster)=11
ON CONFLICT DO NOTHING;
COMMIT;
