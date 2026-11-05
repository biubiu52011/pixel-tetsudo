-- Nov-2026 official JR Kyushu train-level detail pages:
-- 18 individually evidenced Tsubame A-numbers in the holiday source
-- (17 new formal numbers; 302A was separately verified earlier).
-- Explicit 14 x 800-series 6-car, 4 x N700-series 8-car plans.
-- Only JR-Kyushu native generic 800 PNG exists. Do not assign N700
-- a substitute stock image; no broad range crosses N700 exceptions.
-- All vehicle plans are published, NOT actual carset dispatch.
BEGIN;
SELECT pg_advisory_xact_lock(2611,800);
WITH official(service_label,number_full,source_model,source_url,source_key) AS (VALUES
('つばめ302','302A','N700系','https://www.jrkyushu-timetable.jp/sp/2611/0037/00377401.html?d=20261101&t=0829200','jrkyushu-2611-kyushu-shinkansen-302a-n700'),
('つばめ307','307A','N700系','https://www.jrkyushu-timetable.jp/sp/2611/0034/00349801.html?d=20261101&t=2828300','jrkyushu-2611-kyushu-shinkansen-307a-n700'),
('つばめ309','309A','N700系','https://www.jrkyushu-timetable.jp/sp/2611/0034/00349901.html?d=20261101&t=2862601','jrkyushu-2611-kyushu-shinkansen-309a-n700'),
('つばめ310','310A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00352201.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-310a-800'),
('つばめ311','311A','N700系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00350001.html?d=20261101&t=2898401','jrkyushu-2611-kyushu-shinkansen-311a-n700'),
('つばめ312','312A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353101.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-312a-800'),
('つばめ313','313A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00350101.html?d=20261105&t=2828300','jrkyushu-2611-kyushu-shinkansen-313a-800'),
('つばめ314','314A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353201.html?d=20261105&t=2862600','jrkyushu-2611-kyushu-shinkansen-314a-800'),
('つばめ315','315A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00350201.html?d=20261103&t=2828300','jrkyushu-2611-kyushu-shinkansen-315a-800'),
('つばめ316','316A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353301.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-316a-800'),
('つばめ318','318A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353401.html?d=20261104&t=2862600','jrkyushu-2611-kyushu-shinkansen-318a-800'),
('つばめ320','320A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353501.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-320a-800'),
('つばめ322','322A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353601.html?d=20261104&t=2862600','jrkyushu-2611-kyushu-shinkansen-322a-800'),
('つばめ324','324A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353801.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-324a-800'),
('つばめ326','326A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353901.html?d=20261101&t=0829200','jrkyushu-2611-kyushu-shinkansen-326a-800'),
('つばめ328','328A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00352301.html?d=20261104&t=0829200','jrkyushu-2611-kyushu-shinkansen-328a-800'),
('つばめ330','330A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00354001.html?d=20261104&t=0829200','jrkyushu-2611-kyushu-shinkansen-330a-800'),
('つばめ332','332A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353701.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-332a-800')
), matched AS (
 SELECT m.id,m.line_key,m.calendar_urn,m.direction_urn,mem.timetable_id,
 o.number_full,o.source_url
 FROM official o JOIN manual_timetable_templates m
 ON m.line_key='KyushuShinkansen' AND m.train_number=o.service_label
 AND m.calendar_urn='odpt.Calendar:SaturdayHoliday'
 AND m.railway_urn='odpt.Railway:JR-Kyushu.KyushuShinkansen'
 AND m.direction_urn='odpt.RailDirection:'||
 CASE WHEN substring(o.number_full FROM '^[0-9]+')::int%2=1 THEN 'Outbound' ELSE 'Inbound' END
 JOIN train_timetable_members mem ON mem.source_template_id=m.id AND mem.member_role='primary'
)
INSERT INTO public.published_train_number_evidence
(edition,line_key,calendar_urn,direction_urn,train_number,
 source_template_id,official_source_url,verification_scope)
SELECT '2611',line_key,calendar_urn,direction_urn,
 number_full,id,source_url,'train_number_only' FROM matched
WHERE (SELECT count(*) FROM matched)=18
 AND (SELECT count(DISTINCT id) FROM matched)=18
ON CONFLICT DO NOTHING;

WITH official(service_label,number_full,source_model,source_url,source_key) AS (VALUES
('つばめ302','302A','N700系','https://www.jrkyushu-timetable.jp/sp/2611/0037/00377401.html?d=20261101&t=0829200','jrkyushu-2611-kyushu-shinkansen-302a-n700'),
('つばめ307','307A','N700系','https://www.jrkyushu-timetable.jp/sp/2611/0034/00349801.html?d=20261101&t=2828300','jrkyushu-2611-kyushu-shinkansen-307a-n700'),
('つばめ309','309A','N700系','https://www.jrkyushu-timetable.jp/sp/2611/0034/00349901.html?d=20261101&t=2862601','jrkyushu-2611-kyushu-shinkansen-309a-n700'),
('つばめ310','310A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00352201.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-310a-800'),
('つばめ311','311A','N700系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00350001.html?d=20261101&t=2898401','jrkyushu-2611-kyushu-shinkansen-311a-n700'),
('つばめ312','312A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353101.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-312a-800'),
('つばめ313','313A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00350101.html?d=20261105&t=2828300','jrkyushu-2611-kyushu-shinkansen-313a-800'),
('つばめ314','314A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353201.html?d=20261105&t=2862600','jrkyushu-2611-kyushu-shinkansen-314a-800'),
('つばめ315','315A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00350201.html?d=20261103&t=2828300','jrkyushu-2611-kyushu-shinkansen-315a-800'),
('つばめ316','316A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353301.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-316a-800'),
('つばめ318','318A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353401.html?d=20261104&t=2862600','jrkyushu-2611-kyushu-shinkansen-318a-800'),
('つばめ320','320A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353501.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-320a-800'),
('つばめ322','322A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353601.html?d=20261104&t=2862600','jrkyushu-2611-kyushu-shinkansen-322a-800'),
('つばめ324','324A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353801.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-324a-800'),
('つばめ326','326A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353901.html?d=20261101&t=0829200','jrkyushu-2611-kyushu-shinkansen-326a-800'),
('つばめ328','328A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00352301.html?d=20261104&t=0829200','jrkyushu-2611-kyushu-shinkansen-328a-800'),
('つばめ330','330A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00354001.html?d=20261104&t=0829200','jrkyushu-2611-kyushu-shinkansen-330a-800'),
('つばめ332','332A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353701.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-332a-800')
), numbered AS (
 SELECT (SELECT COALESCE(MAX(id),0) FROM evidence_sources)+
 ROW_NUMBER() OVER(ORDER BY source_key) AS new_id,
 source_key,source_url,number_full,source_model FROM official
)
INSERT INTO evidence_sources
(id,source_key,source_url,source_type,evidence_grade,notes)
SELECT new_id,source_key,source_url,'official','A',
 'JR Kyushu 2611 published single service: '||number_full||
 ' uses '||source_model||' as planned equipment, actual vehicle unconfirmed'
FROM numbered WHERE (SELECT COUNT(*) FROM numbered)=18
ON CONFLICT (source_key) DO NOTHING;

WITH official(service_label,number_full,source_model,source_url,source_key) AS (VALUES
('つばめ302','302A','N700系','https://www.jrkyushu-timetable.jp/sp/2611/0037/00377401.html?d=20261101&t=0829200','jrkyushu-2611-kyushu-shinkansen-302a-n700'),
('つばめ307','307A','N700系','https://www.jrkyushu-timetable.jp/sp/2611/0034/00349801.html?d=20261101&t=2828300','jrkyushu-2611-kyushu-shinkansen-307a-n700'),
('つばめ309','309A','N700系','https://www.jrkyushu-timetable.jp/sp/2611/0034/00349901.html?d=20261101&t=2862601','jrkyushu-2611-kyushu-shinkansen-309a-n700'),
('つばめ310','310A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00352201.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-310a-800'),
('つばめ311','311A','N700系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00350001.html?d=20261101&t=2898401','jrkyushu-2611-kyushu-shinkansen-311a-n700'),
('つばめ312','312A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353101.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-312a-800'),
('つばめ313','313A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00350101.html?d=20261105&t=2828300','jrkyushu-2611-kyushu-shinkansen-313a-800'),
('つばめ314','314A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353201.html?d=20261105&t=2862600','jrkyushu-2611-kyushu-shinkansen-314a-800'),
('つばめ315','315A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00350201.html?d=20261103&t=2828300','jrkyushu-2611-kyushu-shinkansen-315a-800'),
('つばめ316','316A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353301.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-316a-800'),
('つばめ318','318A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353401.html?d=20261104&t=2862600','jrkyushu-2611-kyushu-shinkansen-318a-800'),
('つばめ320','320A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353501.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-320a-800'),
('つばめ322','322A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353601.html?d=20261104&t=2862600','jrkyushu-2611-kyushu-shinkansen-322a-800'),
('つばめ324','324A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353801.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-324a-800'),
('つばめ326','326A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353901.html?d=20261101&t=0829200','jrkyushu-2611-kyushu-shinkansen-326a-800'),
('つばめ328','328A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00352301.html?d=20261104&t=0829200','jrkyushu-2611-kyushu-shinkansen-328a-800'),
('つばめ330','330A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00354001.html?d=20261104&t=0829200','jrkyushu-2611-kyushu-shinkansen-330a-800'),
('つばめ332','332A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353701.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-332a-800')
), verified AS (
 SELECT m.id,mem.timetable_id,o.source_model,o.source_url,
 es.id evidence_id
 FROM official o
 JOIN manual_timetable_templates m ON m.line_key='KyushuShinkansen'
   AND m.train_number=o.service_label
   AND m.calendar_urn='odpt.Calendar:SaturdayHoliday'
   AND m.railway_urn='odpt.Railway:JR-Kyushu.KyushuShinkansen'
   AND m.direction_urn='odpt.RailDirection:'||
     CASE WHEN substring(o.number_full FROM '^[0-9]+')::int%2=1 THEN 'Outbound' ELSE 'Inbound' END
 JOIN train_timetable_members mem ON mem.source_template_id=m.id AND mem.member_role='primary'
 JOIN published_train_number_evidence n ON n.edition='2611' AND n.source_template_id=m.id
   AND n.train_number=o.number_full AND n.official_source_url=o.source_url
 JOIN evidence_sources es ON es.source_key=o.source_key AND es.source_url=o.source_url
   AND es.source_type='official' AND es.evidence_grade='A'
)
INSERT INTO train_timetable_vehicle_mappings
(timetable_id,source_template_id,vehicle_type,mapping_level,
 source_id,source_path,actual_vehicle_confirmed)
SELECT timetable_id,id,source_model,'official_service_vehicle_plan',
 evidence_id,'official-2611:'||source_url,false
FROM verified WHERE (SELECT COUNT(*) FROM verified)=18
ON CONFLICT (timetable_id) DO NOTHING;

WITH official(service_label,number_full,source_model,source_url,source_key) AS (VALUES
('つばめ302','302A','N700系','https://www.jrkyushu-timetable.jp/sp/2611/0037/00377401.html?d=20261101&t=0829200','jrkyushu-2611-kyushu-shinkansen-302a-n700'),
('つばめ307','307A','N700系','https://www.jrkyushu-timetable.jp/sp/2611/0034/00349801.html?d=20261101&t=2828300','jrkyushu-2611-kyushu-shinkansen-307a-n700'),
('つばめ309','309A','N700系','https://www.jrkyushu-timetable.jp/sp/2611/0034/00349901.html?d=20261101&t=2862601','jrkyushu-2611-kyushu-shinkansen-309a-n700'),
('つばめ310','310A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00352201.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-310a-800'),
('つばめ311','311A','N700系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00350001.html?d=20261101&t=2898401','jrkyushu-2611-kyushu-shinkansen-311a-n700'),
('つばめ312','312A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353101.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-312a-800'),
('つばめ313','313A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00350101.html?d=20261105&t=2828300','jrkyushu-2611-kyushu-shinkansen-313a-800'),
('つばめ314','314A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353201.html?d=20261105&t=2862600','jrkyushu-2611-kyushu-shinkansen-314a-800'),
('つばめ315','315A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00350201.html?d=20261103&t=2828300','jrkyushu-2611-kyushu-shinkansen-315a-800'),
('つばめ316','316A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353301.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-316a-800'),
('つばめ318','318A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353401.html?d=20261104&t=2862600','jrkyushu-2611-kyushu-shinkansen-318a-800'),
('つばめ320','320A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353501.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-320a-800'),
('つばめ322','322A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353601.html?d=20261104&t=2862600','jrkyushu-2611-kyushu-shinkansen-322a-800'),
('つばめ324','324A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353801.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-324a-800'),
('つばめ326','326A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353901.html?d=20261101&t=0829200','jrkyushu-2611-kyushu-shinkansen-326a-800'),
('つばめ328','328A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00352301.html?d=20261104&t=0829200','jrkyushu-2611-kyushu-shinkansen-328a-800'),
('つばめ330','330A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00354001.html?d=20261104&t=0829200','jrkyushu-2611-kyushu-shinkansen-330a-800'),
('つばめ332','332A','800系','https://www.jrkyushu-timetable.jp/sp/2611/0035/00353701.html?d=20261101&t=2814400','jrkyushu-2611-kyushu-shinkansen-332a-800')
), verified AS (
 SELECT e.edition,e.line_key,e.train_number,e.official_source_url,
 substring(e.train_number FROM '^[0-9]+')::int AS digits,img.image_path
 FROM official o
 JOIN manual_timetable_templates m ON m.line_key='KyushuShinkansen'
   AND m.train_number=o.service_label
   AND m.calendar_urn='odpt.Calendar:SaturdayHoliday'
   AND m.railway_urn='odpt.Railway:JR-Kyushu.KyushuShinkansen'
 JOIN published_train_number_evidence e ON e.edition='2611'
   AND e.source_template_id=m.id AND e.train_number=o.number_full
   AND e.calendar_urn=m.calendar_urn AND e.direction_urn=m.direction_urn
   AND e.official_source_url=o.source_url
 JOIN train_timetable_members mem ON mem.source_template_id=m.id AND mem.member_role='primary'
 JOIN train_timetable_vehicle_mappings vm ON vm.timetable_id=mem.timetable_id
   AND vm.source_template_id=m.id AND vm.vehicle_type=o.source_model
   AND vm.mapping_level='official_service_vehicle_plan' AND vm.actual_vehicle_confirmed=false
 JOIN evidence_sources src ON src.id=vm.source_id AND src.source_key=o.source_key
   AND src.source_url=o.source_url AND src.source_type='official' AND src.evidence_grade='A'
 JOIN vehicle_image_assets img ON img.operator='JR-Kyushu'
   AND img.vehicle_type='800系'
   AND img.image_path='images/列车/JR九州/JR九州_800系.png'
   AND img.asset_status='available' AND img.file_format_status='native_png'
   AND img.is_generic=true
 WHERE o.source_model='800系' AND e.train_number~'^[0-9]{3}A$'
)
INSERT INTO published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
 png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
SELECT edition,line_key,'holiday_verified_single_number',
 digits,digits,'A','800系','../'||image_path,official_source_url,true,false
FROM verified WHERE (SELECT COUNT(*) FROM verified)=14
ON CONFLICT DO NOTHING;
COMMIT;