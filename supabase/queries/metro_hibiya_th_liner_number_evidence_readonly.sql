-- 日比谷线 THライナー 14 条日历／番号记录的官方停站时刻复核。
-- 来源：https://www.tobu.co.jp/railway/th/timetable/
-- 车型：https://www.tobu.co.jp/corporation/rail/vehicles/index.html/
-- 2026-11-26 审计；官方表列服务号，不直接列 ODPT 番号。
-- 以日历、方向、车种、至少五站时刻对应旧 SQL 名册；上行使用到达时刻，
-- 下行使用发车时刻。保留完整 A/B 番号，禁止用冲突数字生成纯号段。
WITH expected(cal,number,service_no,clocks) AS (
 VALUES
 ('Weekday','A643T',2,ARRAY['07:07','07:11','07:18','07:27','07:44']),
 ('Weekday','A845T',4,ARRAY['09:08','09:13','09:19','09:28','09:46']),
 ('Weekday','B1743T',1,ARRAY['17:02','17:06','17:14','17:21','17:25']),
 ('Weekday','B1847T',3,ARRAY['18:02','18:06','18:14','18:21','18:25']),
 ('Weekday','B1845T',5,ARRAY['19:02','19:06','19:14','19:21','19:25']),
 ('Weekday','B1941T',7,ARRAY['20:02','20:06','20:14','20:21','20:25']),
 ('Weekday','B2043T',9,ARRAY['21:02','21:06','21:14','21:21','21:25']),
 ('SaturdayHoliday','A845T',2,ARRAY['09:07','09:11','09:17','09:26','09:43']),
 ('SaturdayHoliday','A947T',4,ARRAY['10:17','10:21','10:27','10:36','10:53']),
 ('SaturdayHoliday','B1645T',1,ARRAY['16:02','16:06','16:14','16:21','16:25']),
 ('SaturdayHoliday','B1743T',3,ARRAY['17:02','17:06','17:14','17:21','17:25']),
 ('SaturdayHoliday','B1841T',5,ARRAY['18:02','18:06','18:14','18:21','18:25']),
 ('SaturdayHoliday','B1847T',7,ARRAY['19:02','19:06','19:14','19:21','19:25']),
 ('SaturdayHoliday','B1945T',9,ARRAY['20:02','20:06','20:14','20:21','20:25'])
), checkpoints AS (
 SELECT e.*,k.ordinality,k.station
 FROM expected e CROSS JOIN LATERAL unnest(CASE WHEN left(e.number,1)='A'
 THEN ARRAY['Ueno','Akihabara','Kayabacho','Ginza','Ebisu']
 ELSE ARRAY['Kasumigaseki','Ginza','Kayabacho','Akihabara','Ueno'] END)
 WITH ORDINALITY k(station,ordinality)
), candidates AS (
 SELECT m.id,m.train_number,m.calendar_urn
 FROM public.manual_timetable_templates m
 JOIN public.train_timetable_source_resolution r ON r.source_template_id=m.id
 WHERE m.line_key='Hibiya' AND m.train_type_urn='odpt.TrainType:TokyoMetro.TH-LINER'
 AND r.mapping_level='official_service_vehicle_plan' AND r.vehicle_type='東武70090型'
), matched AS (
 SELECT c.cal,c.number,c.service_no,m.id, count(*) FILTER(WHERE
 CASE WHEN left(c.number,1)='A' THEN s.arrival_clock ELSE s.departure_clock END
 = c.clocks[c.ordinality::int]) matched_stations
 FROM checkpoints c JOIN candidates m ON m.train_number=c.number AND m.calendar_urn='odpt.Calendar:'||c.cal
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 AND regexp_replace(coalesce(s.departure_station_urn,s.arrival_station_urn),'^.*\.','')=c.station
 GROUP BY 1,2,3,4
)
SELECT e.cal,e.number,e.service_no,
 (SELECT count(*) FROM matched m WHERE m.cal=e.cal AND m.number=e.number AND matched_stations=5) verified_templates,
 regexp_replace(e.number,'^[AB]','') numeric_suffix,
 (SELECT string_agg(DISTINCT t.train_number||':'||t.train_type_urn,',') FROM public.manual_timetable_templates t
 WHERE t.line_key='Hibiya' AND regexp_replace(t.train_number,'^[AB]','')=regexp_replace(e.number,'^[AB]','')
 AND t.train_type_urn IS DISTINCT FROM 'odpt.TrainType:TokyoMetro.TH-LINER') other_service_conflicts,
 (SELECT count(*) FROM public.vehicle_image_assets a WHERE a.image_path='images/列车/東武鉄道/東武鉄道_70090型.png'
 AND a.asset_scope='generic' AND a.asset_status='available' AND a.file_format_status='native_png') eligible_png
FROM expected e ORDER BY e.cal,e.service_no;
