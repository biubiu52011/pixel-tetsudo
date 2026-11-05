-- 2026-11: individually web-verified 40 JR-Kyushu 西九州新幹線
-- かもめ service names and 200xG/210xG FULL train numbers.
-- Each source_url is an actual JR-Kyushu 2611 official train-detail page
-- displaying BOTH columns 列車名 and 列車番号 and 毎日運転, N700S系.
-- NEVER copy the adjacent リレーかもめ H number into the G-number slot.
-- Weekday and SaturdayHoliday share each 毎日運転 source-backed number.
-- 103 is only present in the original imported holiday subset.
-- We do NOT extrapolate uninspected names from 2000+service ordinal.
-- The gallery lacks JR-Kyushu N700S native PNG, so NO PNG reference is
-- written. This verifies the formal train number, not the actual carset,
-- dated train position, or full timetable stop-clock correctness.
BEGIN;
WITH official(service_name,official_number,direction_urn,source_url) AS (
 VALUES
 ('かもめ1号','2001G','odpt.RailDirection:Outbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00190501.html?d=20261103&t=2838901e'),
 ('かもめ2号','2002G','odpt.RailDirection:Inbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00192401.html?d=20261105&t=2853300l'),
 ('かもめ4号','2004G','odpt.RailDirection:Inbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00192501.html?d=20261104&t=2844300'),
 ('かもめ5号','2005G','odpt.RailDirection:Outbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00190701.html?d=20261102&t=1122701'),
 ('かもめ8号','2008G','odpt.RailDirection:Inbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00192601.html?d=20261102&t=2844300'),
 ('かもめ9号','2009G','odpt.RailDirection:Outbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00190801.html?d=20261103&t=2838901e'),
 ('かもめ12号','2012G','odpt.RailDirection:Inbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00192701.html?d=20261105&t=2853300l'),
 ('かもめ13号','2013G','odpt.RailDirection:Outbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00190901.html?d=20261103&t=0829103e'),
 ('かもめ14号','2014G','odpt.RailDirection:Inbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00192801.html?d=20261102&t=2853300l'),
 ('かもめ17号','2017G','odpt.RailDirection:Outbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00191001.html?d=20261102&t=2838901e'),
 ('かもめ18号','2018G','odpt.RailDirection:Inbound','https://www.jrkyushu-timetable.jp/sp/2611/0023/00239301.html?d=20261102&t=2844300'),
 ('かもめ21号','2021G','odpt.RailDirection:Outbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00191101.html?d=20261103&t=2839902e'),
 ('かもめ22号','2022G','odpt.RailDirection:Inbound','https://www.jrkyushu-timetable.jp/sp/2611/0023/00239401.html?d=20261103&t=2844300'),
 ('かもめ25号','2025G','odpt.RailDirection:Outbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00191201.html?d=20261104&t=0829103e'),
 ('かもめ26号','2026G','odpt.RailDirection:Inbound','https://www.jrkyushu-timetable.jp/sp/2611/0023/00239501.html?d=20261103&t=2844300'),
 ('かもめ29号','2029G','odpt.RailDirection:Outbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00191301.html?d=20261103&t=0829103e'),
 ('かもめ33号','2033G','odpt.RailDirection:Outbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00191401.html?d=20261101&t=2838901e'),
 ('かもめ34号','2034G','odpt.RailDirection:Inbound','https://www.jrkyushu-timetable.jp/sp/2611/0023/00239701.html?d=20261103&t=2844300'),
 ('かもめ37号','2037G','odpt.RailDirection:Outbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00191501.html?d=20261102&t=1122701'),
 ('かもめ38号','2038G','odpt.RailDirection:Inbound','https://www.jrkyushu-timetable.jp/sp/2611/0023/00239801.html?d=20261031&t=2844300'),
 ('かもめ42号','2042G','odpt.RailDirection:Inbound','https://www.jrkyushu-timetable.jp/sp/2611/0023/00239901.html?d=20261101&t=1122600'),
 ('かもめ43号','2043G','odpt.RailDirection:Outbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00191701.html?d=20261103&t=2838901e'),
 ('かもめ46号','2046G','odpt.RailDirection:Inbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00192901.html?d=20261102&t=2844300'),
 ('かもめ48号','2048G','odpt.RailDirection:Inbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00193001.html?d=20261104&t=2854700'),
 ('かもめ49号','2049G','odpt.RailDirection:Outbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00191901.html?d=20261103&t=0829103e'),
 ('かもめ50号','2050G','odpt.RailDirection:Inbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00193101.html?d=20261024&t=2853300l'),
 ('かもめ51号','2051G','odpt.RailDirection:Outbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00192001.html?d=20261101&t=0829103e'),
 ('かもめ52号','2052G','odpt.RailDirection:Inbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00193201.html?d=20261104&t=2844300'),
 ('かもめ53号','2053G','odpt.RailDirection:Outbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00192101.html?d=20261104&t=2844301'),
 ('かもめ54号','2054G','odpt.RailDirection:Inbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00193301.html?d=20261030&t=2853300l'),
 ('かもめ55号','2055G','odpt.RailDirection:Outbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00192201.html?d=20261103&t=2838901e'),
 ('かもめ56号','2056G','odpt.RailDirection:Inbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00193401.html?d=20261104&t=1122600'),
 ('かもめ57号','2057G','odpt.RailDirection:Outbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00192301.html?d=20261103&t=0829103e'),
 ('かもめ58号','2058G','odpt.RailDirection:Inbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00193501.html?d=20261102&t=2853300l'),
 ('かもめ59号','2059G','odpt.RailDirection:Outbound','https://www.jrkyushu-timetable.jp/sp/2611/0029/00290001.html?d=20261103&t=2838901e'),
 ('かもめ60号','2060G','odpt.RailDirection:Inbound','https://www.jrkyushu-timetable.jp/sp/2611/0024/00240001.html?d=20261104&t=1122600'),
 ('かもめ66号','2066G','odpt.RailDirection:Inbound','https://www.jrkyushu-timetable.jp/sp/2611/0024/00240101.html?d=20261104&t=2828301e'),
 ('かもめ67号','2067G','odpt.RailDirection:Outbound','https://www.jrkyushu-timetable.jp/sp/2611/0029/00290401.html?d=20261101&t=2838901e'),
 ('かもめ102号','2102G','odpt.RailDirection:Inbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00193901.html?d=20261101&t=2853300l'),
 ('かもめ103号','2103G','odpt.RailDirection:Outbound','https://www.jrkyushu-timetable.jp/sp/2611/0019/00193801.html?d=20261101&t=1122701')
), checked AS (
 SELECT m.id,m.line_key,m.calendar_urn,m.direction_urn,
  o.official_number,o.source_url
 FROM official o
 JOIN public.manual_timetable_templates m
 ON m.line_key='NishiKyushuShinkansen'
 AND m.train_number=o.service_name
 AND m.direction_urn=o.direction_urn
 AND m.railway_urn='odpt.Railway:JR-Kyushu.NishiKyushuShinkansen'
 AND m.calendar_urn IN ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
 JOIN public.train_timetable_members tm ON tm.source_template_id=m.id
 JOIN public.train_timetable_vehicle_mappings vm
 ON vm.source_template_id=m.id AND vm.timetable_id=tm.timetable_id
 AND vm.vehicle_type='N700S系' AND vm.mapping_level='official_service_vehicle_plan'
 AND vm.actual_vehicle_confirmed=false
)
INSERT INTO public.published_train_number_evidence
 (edition,line_key,calendar_urn,direction_urn,train_number,
  source_template_id,official_source_url,verification_scope)
SELECT '2611',c.line_key,c.calendar_urn,c.direction_urn,
 c.official_number,c.id,c.source_url,'train_number_only'
FROM checked c
WHERE (SELECT count(*) FROM checked)=79
 AND (SELECT count(DISTINCT id) FROM checked)=79
 AND (SELECT count(*) FROM official)=40
ON CONFLICT DO NOTHING;
COMMIT;
