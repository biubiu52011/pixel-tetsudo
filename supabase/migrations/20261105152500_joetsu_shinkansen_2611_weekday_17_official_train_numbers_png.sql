-- JR East 2611 published train-number roster for the 17 existing Joetsu
-- Shinkansen weekday SQL templates. Train name != full railway number.
-- Source: JR East official 004d1 / 004u1 2026-11 timetable.
-- Special 440xC alternatives may run on specific dates: only the
-- standard weekday train number documented alongside that service is
-- attached to the recurring weekday template, not the special number.
-- Exact-roster-only PNG: E7 stock is official for ALL Joetsu services
-- from 2023-03-18; neither PNG nor plan proves a physical trainset.
BEGIN;
WITH official(name, rail_no, dir, url) AS (
 VALUES
 ('Toki301','1301C','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
 ('Toki331','331C','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
 ('Toki333','333C','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
 ('Toki345','345C','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
 ('Tanigawa401','401C','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
 ('Tanigawa403','2403C','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
 ('Tanigawa405','405C','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/004d1.html'),
 ('Toki302','302C','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
 ('Toki306','306C','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
 ('Toki312','1312C','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
 ('Toki316','316C','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
 ('Toki342','342C','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
 ('Toki344','1344C','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
 ('Toki346','346C','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
 ('Tanigawa408','2408C','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
 ('Tanigawa410','2410C','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html'),
 ('Tanigawa414','414C','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/004u1.html')
), matched AS (
 SELECT m.id, m.train_number, m.direction_urn, m.calendar_urn,
   o.rail_no, o.url
 FROM official o
 JOIN public.manual_timetable_templates m ON m.line_key='JoetsuShinkansen'
 AND m.train_number=o.name
 AND m.direction_urn='odpt.RailDirection:'||o.dir
 AND m.calendar_urn='odpt.Calendar:Weekday'
 AND m.railway_urn='odpt.Railway:JR-East.JoetsuShinkansen'
 WHERE EXISTS (
 SELECT 1 FROM public.train_timetable_members tm
 JOIN public.train_timetable_vehicle_mappings v
 ON v.timetable_id=tm.timetable_id AND v.source_template_id=m.id
 WHERE tm.source_template_id=m.id AND v.vehicle_type='E7系'
 AND v.mapping_level='official_service_vehicle_plan'
 AND v.actual_vehicle_confirmed=false)
), approval AS (SELECT count(*) n FROM matched)
INSERT INTO public.published_train_number_evidence
 (edition,line_key,calendar_urn,direction_urn,train_number,
 source_template_id,official_source_url,verification_scope)
SELECT '2611','JoetsuShinkansen',x.calendar_urn,x.direction_urn,
 x.rail_no,x.id,x.url,'train_number_only'
FROM matched x CROSS JOIN approval a WHERE a.n=17
ON CONFLICT DO NOTHING;

-- A compact range would include numbers not proven by this list, so
-- each published number is a one-number closed range. Any future
-- coalescing MUST join published_train_number_evidence on the full
-- number + line + calendar + direction + original template.
WITH roster AS (
 SELECT e.*, substring(e.train_number FROM '^[0-9]+')::int AS numeral
 FROM public.published_train_number_evidence e
 WHERE e.edition='2611' AND e.line_key='JoetsuShinkansen'
 AND e.train_number ~ '^[0-9]{2,5}C$'
 AND e.official_source_url LIKE 'https://timetables.jreast.co.jp/2611/%'
), valid AS (
 SELECT r.* FROM roster r
 JOIN public.train_timetable_members tm
   ON tm.source_template_id=r.source_template_id
 JOIN public.train_timetable_vehicle_mappings v
   ON v.timetable_id=tm.timetable_id
   AND v.source_template_id=r.source_template_id
   AND v.vehicle_type='E7系'
   AND v.mapping_level='official_service_vehicle_plan'
 JOIN public.vehicle_image_assets a
   ON a.operator='JR-East' AND a.vehicle_type='E7系'
   AND a.image_path='images/列车/JR東日本/JR東日本_E7系.png'
   AND a.asset_status='available' AND a.is_generic=true
   AND a.file_format_status='native_png'
 WHERE v.actual_vehicle_confirmed=false
)
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,
  vehicle_model,png_reference,source_url,requires_exact_roster,
  actual_vehicle_confirmed)
SELECT r.edition,r.line_key,'weekday_verified_single_number',
  r.numeral,r.numeral,'C','E7系',
  '../images/列车/JR東日本/JR東日本_E7系.png',
  r.official_source_url,true,false
FROM valid r
WHERE r.calendar_urn='odpt.Calendar:Weekday'
  AND (SELECT count(*) FROM valid
       WHERE calendar_urn='odpt.Calendar:Weekday')=17
ON CONFLICT DO NOTHING;
COMMIT;
