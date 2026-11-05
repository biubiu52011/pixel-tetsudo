-- Akita Shinkansen JR-East 2026-11 official 003d1/003u1:
-- existing Weekday Komachi source labels to published full M-numbers.
-- Unlike a generated range, these 33 individually matched official
-- pairs include 5013M, 5021M, 5026M, 8062M, 8065M, 3096M.
-- The paired Tohoku Hayabusa runs may carry B train numbers; never
-- collapse the physically coupled services to one number.
BEGIN;
WITH official(source_label,full_number,direction,official_source_url) AS (
 VALUES ('こまち7','3007M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('こまち9','3009M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('こまち13','5013M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('こまち15','3015M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('こまち19','3019M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('こまち21','5021M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('こまち23','3023M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('こまち25','3025M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('こまち29','5029M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('こまち33','3033M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('こまち35','3035M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('こまち37','3037M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('こまち39','3039M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('こまち59','5059M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('こまち61','5061M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('こまち63','5063M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('こまち65','8065M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/003d1.html'),
 ('こまち10','3010M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('こまち12','3012M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('こまち14','3014M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('こまち16','3016M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('こまち18','3018M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('こまち20','3020M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('こまち24','3024M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('こまち26','5026M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('こまち28','3028M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('こまち34','3034M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('こまち36','3036M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('こまち38','3038M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('こまち42','3042M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('こまち44','3044M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('こまち62','8062M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html'),
 ('こまち96','3096M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/003u1.html')
), matched AS (
 SELECT m.id,m.calendar_urn,m.direction_urn,o.full_number,o.official_source_url
 FROM official o
 JOIN public.manual_timetable_templates m
 ON m.line_key='AkitaShinkansen'
 AND m.train_number=o.source_label
 AND m.calendar_urn='odpt.Calendar:Weekday'
 AND m.direction_urn='odpt.RailDirection:'||o.direction
 AND m.railway_urn='odpt.Railway:JR-East.AkitaShinkansen'
)
INSERT INTO public.published_train_number_evidence
(edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,
 official_source_url,verification_scope)
SELECT '2611','AkitaShinkansen',calendar_urn,direction_urn,full_number,id,
 official_source_url,'train_number_only' FROM matched
WHERE (SELECT count(*) FROM matched)=33
  AND (SELECT count(DISTINCT id) FROM matched)=33
ON CONFLICT DO NOTHING;

WITH exact AS (
 SELECT e.edition,e.line_key,e.train_number,e.official_source_url,
 substring(e.train_number FROM '^[0-9]+')::int AS digits
 FROM public.published_train_number_evidence e
 JOIN public.manual_timetable_templates m
   ON m.id=e.source_template_id AND m.line_key=e.line_key
   AND m.calendar_urn=e.calendar_urn AND m.direction_urn=e.direction_urn
 JOIN public.train_timetable_members tm
   ON tm.source_template_id=m.id
 JOIN public.train_timetable_vehicle_mappings vm
   ON vm.timetable_id=tm.timetable_id AND vm.source_template_id=m.id
   AND vm.mapping_level='official_service_vehicle_plan'
   AND vm.vehicle_type='E6系' AND vm.actual_vehicle_confirmed=false
 JOIN public.vehicle_image_assets img
   ON img.operator='JR-East' AND img.vehicle_type='E6系'
   AND img.image_path='images/列车/JR東日本/JR東日本_E6系.png'
   AND img.asset_status='available' AND img.is_generic=true
   AND img.file_format_status='native_png'
 WHERE e.edition='2611' AND e.line_key='AkitaShinkansen'
   AND e.calendar_urn='odpt.Calendar:Weekday'
   AND e.verification_scope='train_number_only'
   AND e.train_number~'^[0-9]{1,5}M$'
)
INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
 png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
SELECT edition,line_key,'weekday_verified_single_number',digits,digits,'M',
 'E6系','../images/列车/JR東日本/JR東日本_E6系.png',
 official_source_url,true,false FROM exact
WHERE (SELECT COUNT(*) FROM exact)=44
ON CONFLICT DO NOTHING;
COMMIT;
