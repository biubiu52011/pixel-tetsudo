-- JR East 2611 奥羽本線 published Shinkansen train-number crosswalk:
-- exact name <-> M-number pairs for existing YamagataShinkansen templates.
-- Tsubasa uses M number on Fukushima-Yamagata-Shinjo; B number on
-- Tohoku Shinkansen segment. Never turn the name suffix into a number.
-- Three ambiguous alternating named services are EXCLUDED:
-- Tsubasa88 (8188/9088/6088), 90 (9090/6090), 177 (6177/8177).
-- The 42 listed pairs are train-number-only; original stop clocks and
-- run dates remain unverified. E8 generic PNG is never a physical carset.
BEGIN;
WITH official(service_label,full_number,direction,source_url) AS (
VALUES
 ('つばさ87','9087M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/249d1.html'),
 ('つばさ91','9091M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/249d1.html'),
 ('つばさ93','9093M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/249d1.html'),
 ('つばさ97','9097M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/249d1.html'),
 ('つばさ121','121M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/249d1.html'),
 ('つばさ123','123M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/249d1.html'),
 ('つばさ127','127M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/249d1.html'),
 ('つばさ129','129M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/249d1.html'),
 ('つばさ131','131M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/249d1.html'),
 ('つばさ133','133M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/249d1.html'),
 ('つばさ135','135M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/249d1.html'),
 ('つばさ137','137M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/249d1.html'),
 ('つばさ139','139M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/249d1.html'),
 ('つばさ141','141M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/249d1.html'),
 ('つばさ143','143M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/249d1.html'),
 ('つばさ145','145M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/249d1.html'),
 ('つばさ149','149M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/249d1.html'),
 ('つばさ153','153M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/249d1.html'),
 ('つばさ157','157M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/249d1.html'),
 ('つばさ159','159M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/249d1.html'),
 ('つばさ171','171M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/249d1.html'),
 ('つばさ195','8195M','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/249d1.html'),
 ('つばさ86','9086M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/249u1.html'),
 ('つばさ94','6094M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/249u1.html'),
 ('つばさ122','122M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/249u1.html'),
 ('つばさ124','124M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/249u1.html'),
 ('つばさ128','128M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/249u1.html'),
 ('つばさ132','132M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/249u1.html'),
 ('つばさ136','136M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/249u1.html'),
 ('つばさ138','138M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/249u1.html'),
 ('つばさ140','140M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/249u1.html'),
 ('つばさ142','142M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/249u1.html'),
 ('つばさ144','144M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/249u1.html'),
 ('つばさ146','146M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/249u1.html'),
 ('つばさ148','148M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/249u1.html'),
 ('つばさ150','150M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/249u1.html'),
 ('つばさ154','154M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/249u1.html'),
 ('つばさ156','156M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/249u1.html'),
 ('つばさ158','158M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/249u1.html'),
 ('つばさ160','160M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/249u1.html'),
 ('つばさ188','8188M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/249u1.html'),
 ('つばさ192','8192M','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/249u1.html')
), matched AS (
 SELECT m.id,m.calendar_urn,m.direction_urn,
        o.full_number,o.source_url
 FROM official o JOIN public.manual_timetable_templates m
 ON m.line_key='YamagataShinkansen'
 AND m.train_number=o.service_label
 AND m.railway_urn='odpt.Railway:JR-East.YamagataShinkansen'
 AND m.calendar_urn='odpt.Calendar:Weekday'
 AND m.direction_urn='odpt.RailDirection:'||o.direction
 JOIN public.train_timetable_members mem ON mem.source_template_id=m.id
 JOIN public.train_timetable_vehicle_mappings vm
   ON vm.timetable_id=mem.timetable_id AND vm.source_template_id=m.id
   AND vm.vehicle_type='E8系'
   AND vm.mapping_level='official_service_vehicle_plan'
   AND vm.actual_vehicle_confirmed=false
)
INSERT INTO public.published_train_number_evidence
(edition,line_key,calendar_urn,direction_urn,train_number,
 source_template_id,official_source_url,verification_scope)
SELECT '2611','YamagataShinkansen',x.calendar_urn,x.direction_urn,
 x.full_number,x.id,x.source_url,'train_number_only'
FROM matched x
WHERE (SELECT count(*) FROM matched)=42
ON CONFLICT DO NOTHING;

WITH roster AS (
 SELECT e.*,substring(e.train_number FROM '^[0-9]+')::int AS digits
 FROM public.published_train_number_evidence e
 JOIN public.manual_timetable_templates m
   ON m.id=e.source_template_id AND m.line_key=e.line_key
   AND m.calendar_urn=e.calendar_urn AND m.direction_urn=e.direction_urn
 JOIN public.train_timetable_members mem ON mem.source_template_id=m.id
 JOIN public.train_timetable_vehicle_mappings vm
   ON vm.timetable_id=mem.timetable_id AND vm.source_template_id=m.id
 JOIN public.vehicle_image_assets a ON a.operator='JR-East'
  AND a.vehicle_type='E8系'
  AND a.image_path='images/列车/JR東日本/JR東日本_E8系.png'
  AND a.is_generic=true AND a.asset_status='available'
  AND a.file_format_status='native_png'
 WHERE e.edition='2611' AND e.line_key='YamagataShinkansen'
 AND e.calendar_urn='odpt.Calendar:Weekday'
 AND e.train_number~'^[0-9]{1,5}M$'
 AND e.verification_scope='train_number_only'
 AND m.railway_urn='odpt.Railway:JR-East.YamagataShinkansen'
 AND vm.vehicle_type='E8系' AND vm.mapping_level='official_service_vehicle_plan'
 AND vm.actual_vehicle_confirmed=false
)
INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,
 vehicle_model,png_reference,source_url,requires_exact_roster,
 actual_vehicle_confirmed)
SELECT edition,line_key,'weekday_verified_single_number',digits,digits,'M',
 'E8系','../images/列车/JR東日本/JR東日本_E8系.png',
 official_source_url,true,false FROM roster
WHERE (SELECT count(*) FROM roster)=42
ON CONFLICT DO NOTHING;
COMMIT;
