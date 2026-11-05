-- Kyushu Shinkansen official 2611 7 individually checked Tsubame A numbers.
-- SIX official JR Kyushu detail pages prove 800系 6-car on these names:
-- 300A 301A 304A 305A 306A 308A.
-- 302A officially runs N700系 8-car, with a revised 2026-10-23
-- operation segment; its number is proved but NO PNG is assigned.
-- Do not turn the interval 300A..308A into a blanket 800 PNG.
-- Historical source stop clocks are not re-certified by this work.
BEGIN;
SELECT pg_advisory_xact_lock(2611,800);
WITH official(service_label,full_number,source_model,source_url,source_key) AS (
 VALUES ('つばめ300','300A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00352901.html?d=20261104&t=0829100','jrkyushu-2611-kyushu-shinkansen-300a-800'),
('つばめ301','301A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00351901.html?d=20261101&t=2898401','jrkyushu-2611-kyushu-shinkansen-301a-800'),
('つばめ302','302A','N700系','https://www.jrkyushu-timetable.jp/sp/2611/0037/00377401.html?d=20261101&t=0829200','jrkyushu-2611-kyushu-shinkansen-302a-n700'),
('つばめ304','304A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353001.html?d=20261104&t=0829200','jrkyushu-2611-kyushu-shinkansen-304a-800'),
('つばめ305','305A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00351801.html?d=20261106&t=2862601','jrkyushu-2611-kyushu-shinkansen-305a-800'),
('つばめ306','306A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00352001.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-306a-800'),
('つばめ308','308A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00352101.html?d=20261103&t=2814400','jrkyushu-2611-kyushu-shinkansen-308a-800')
), matched AS (
 SELECT m.id,m.line_key,m.calendar_urn,m.direction_urn,mem.timetable_id,
  o.full_number,o.source_model,o.source_url,o.source_key
 FROM official o
 JOIN manual_timetable_templates m
   ON m.line_key='KyushuShinkansen'
   AND m.train_number=o.service_label
   AND m.calendar_urn='odpt.Calendar:SaturdayHoliday'
   AND m.railway_urn='odpt.Railway:JR-Kyushu.KyushuShinkansen'
   AND m.direction_urn='odpt.RailDirection:'||
   (CASE WHEN substring(o.full_number FROM '^[0-9]+')::int%2=1
     THEN 'Outbound' ELSE 'Inbound' END)
 JOIN train_timetable_members mem ON mem.source_template_id=m.id AND mem.member_role='primary'
 JOIN train_timetables t ON t.id=mem.timetable_id AND t.group_evidence='source_only'
)
INSERT INTO public.published_train_number_evidence
(edition,line_key,calendar_urn,direction_urn,train_number,
 source_template_id,official_source_url,verification_scope)
SELECT '2611',m.line_key,m.calendar_urn,m.direction_urn,
 m.full_number,m.id,m.source_url,'train_number_only'
FROM matched m WHERE (SELECT COUNT(*) FROM matched)=7
 AND (SELECT COUNT(DISTINCT id) FROM matched)=7
ON CONFLICT DO NOTHING;

-- evidence_sources has a manually allocated BIGINT ID (no sequence).
-- Allocate ids transactionally from current MAX, without a hardcoded id.
WITH official(source_label,full_number,model,source_url,source_key) AS (
 VALUES ('つばめ300','300A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00352901.html?d=20261104&t=0829100','jrkyushu-2611-kyushu-shinkansen-300a-800'),
('つばめ301','301A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00351901.html?d=20261101&t=2898401','jrkyushu-2611-kyushu-shinkansen-301a-800'),
('つばめ302','302A','N700系','https://www.jrkyushu-timetable.jp/sp/2611/0037/00377401.html?d=20261101&t=0829200','jrkyushu-2611-kyushu-shinkansen-302a-n700'),
('つばめ304','304A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353001.html?d=20261104&t=0829200','jrkyushu-2611-kyushu-shinkansen-304a-800'),
('つばめ305','305A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00351801.html?d=20261106&t=2862601','jrkyushu-2611-kyushu-shinkansen-305a-800'),
('つばめ306','306A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00352001.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-306a-800'),
('つばめ308','308A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00352101.html?d=20261103&t=2814400','jrkyushu-2611-kyushu-shinkansen-308a-800')
), numbered AS (
 SELECT (SELECT COALESCE(MAX(id),0) FROM public.evidence_sources)
 +ROW_NUMBER() OVER (ORDER BY source_key) AS new_id,
 source_key,source_url,full_number FROM official WHERE model='800系'
)
INSERT INTO public.evidence_sources
(id,source_key,source_url,source_type,evidence_grade,notes)
SELECT new_id,source_key,source_url,'official','A',
 'JR Kyushu 2611 individual Shinkansen timetable: exact '||full_number||
 ' 800 series 6-car service, not actual formation'
FROM numbered WHERE (SELECT COUNT(*) FROM numbered)=6
ON CONFLICT (source_key) DO NOTHING;

WITH selected AS (
 SELECT m.id,mem.timetable_id,e.train_number,e.official_source_url,
 src.id source_id,src.source_url,
 img.image_path
 FROM manual_timetable_templates m
 JOIN train_timetable_members mem
   ON mem.source_template_id=m.id AND mem.member_role='primary'
 JOIN published_train_number_evidence e
   ON e.edition='2611' AND e.line_key=m.line_key AND e.source_template_id=m.id
   AND e.calendar_urn=m.calendar_urn AND e.direction_urn=m.direction_urn
 JOIN evidence_sources src ON src.source_url=e.official_source_url
   AND src.source_key='jrkyushu-2611-kyushu-shinkansen-'||lower(e.train_number)||'-800'
   AND src.source_type='official' AND src.evidence_grade='A'
 JOIN vehicle_image_assets img ON img.operator='JR-Kyushu'
  AND img.vehicle_type='800系'
  AND img.image_path='images/列车/JR九州/JR九州_800系.png'
  AND img.asset_status='available' AND img.file_format_status='native_png'
  AND img.is_generic=true
 WHERE m.line_key='KyushuShinkansen'
  AND m.railway_urn='odpt.Railway:JR-Kyushu.KyushuShinkansen'
  AND m.calendar_urn='odpt.Calendar:SaturdayHoliday'
  AND e.train_number IN ('300A','301A','304A','305A','306A','308A')
)
INSERT INTO train_timetable_vehicle_mappings
 (timetable_id,source_template_id,vehicle_type,mapping_level,
 source_id,source_path,actual_vehicle_confirmed)
SELECT timetable_id,id,'800系','official_service_vehicle_plan',
 source_id,'official-2611:'||source_url,false
FROM selected WHERE (SELECT COUNT(*) FROM selected)=6
ON CONFLICT (timetable_id) DO NOTHING;

WITH approved AS (
 SELECT e.*,m.id source_id,vm.vehicle_type,
 substring(e.train_number FROM '^[0-9]+')::int AS digits,
 img.image_path
 FROM public.published_train_number_evidence e
 JOIN public.manual_timetable_templates m ON m.id=e.source_template_id
   AND m.line_key=e.line_key AND m.calendar_urn=e.calendar_urn AND m.direction_urn=e.direction_urn
 JOIN public.train_timetable_members mem ON mem.source_template_id=m.id
 JOIN public.train_timetable_vehicle_mappings vm
  ON vm.source_template_id=m.id AND vm.timetable_id=mem.timetable_id
  AND vm.vehicle_type='800系' AND vm.mapping_level='official_service_vehicle_plan'
  AND vm.actual_vehicle_confirmed=false
 JOIN public.evidence_sources src ON src.id=vm.source_id
  AND src.source_type='official' AND src.evidence_grade='A'
  AND src.source_url=e.official_source_url
 JOIN public.vehicle_image_assets img ON img.operator='JR-Kyushu'
  AND img.vehicle_type='800系'
  AND img.image_path='images/列车/JR九州/JR九州_800系.png'
  AND img.asset_status='available' AND img.file_format_status='native_png'
  AND img.is_generic=true
 WHERE e.edition='2611' AND e.line_key='KyushuShinkansen'
   AND e.calendar_urn='odpt.Calendar:SaturdayHoliday'
   AND e.verification_scope='train_number_only'
   AND e.train_number IN ('300A','301A','304A','305A','306A','308A')
)
INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
 png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
SELECT edition,line_key,'holiday_verified_single_number',
 digits,digits,'A','800系','../'||image_path,official_source_url,true,false
FROM approved WHERE (SELECT count(*) FROM approved)=6
ON CONFLICT DO NOTHING;
COMMIT;