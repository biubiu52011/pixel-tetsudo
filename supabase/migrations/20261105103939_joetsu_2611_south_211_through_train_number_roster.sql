-- Joetsu 2611 southern (Takasaki–Shibukawa) 211 fleet reference.
-- Existing source templates for 520M–547M are through trains to/from
-- Agatsuma; do NOT invent separate JR Joetsu-only movements or stop times.
-- Official train numbers are in 238u1/u2/d1/d2; the 211 fleet is confirmed
-- for this region by JR East but not as a dated physical carset.
BEGIN;
INSERT INTO public.published_train_png_number_ranges(
 edition,line_key,segment_key,min_number,max_number,suffix,
 vehicle_model,png_reference,source_url)
VALUES('2611','Joetsu','south',520,758,'M','211系（高崎地区）',
 '../images/列车/JR東日本/JR東日本_211系_湘南色.png',
 'https://timetables.jreast.co.jp/2611/timetable-v/238d1.html')
ON CONFLICT DO NOTHING;
INSERT INTO public.published_joetsu_2611_number_roster(
 edition,line_key,train_number,calendar_urn,direction_urn,train_type_urn,
 service_name,vehicle_model,png_reference,segment_key,official_source_url)
SELECT '2611','Joetsu',m.train_number,m.calendar_urn,m.direction_urn,
 'odpt.TrainType:JR-East.Local','',
 '211系（高崎地区）',
 '../images/列车/JR東日本/JR東日本_211系_湘南色.png',
 'south','https://timetables.jreast.co.jp/2611/timetable-v/238'||
 CASE WHEN m.direction_urn='odpt.RailDirection:Inbound' THEN 'u' ELSE 'd' END||
 CASE WHEN m.calendar_urn='odpt.Calendar:Weekday' THEN '1' ELSE '2' END||'.html'
FROM public.manual_timetable_templates m
WHERE m.line_key='Joetsu' AND m.railway_urn='odpt.Railway:JR-East.Joetsu'
 AND m.train_type_urn='odpt.TrainType:JR-East.Local'
 AND m.train_number ~ '^5(2[0-9]|3[0-9]|4[0-7])M$'
 AND m.vehicle_type_label='211系（高崎地区）'
 AND m.calendar_urn IN ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
 AND EXISTS (SELECT 1 FROM public.manual_timetable_template_stops z
  WHERE z.template_id=m.id AND
  COALESCE(z.arrival_station_urn,z.departure_station_urn)
    LIKE 'odpt.Station:JR-East.Joetsu.%'
  GROUP BY z.template_id HAVING count(*)>=2)
ON CONFLICT DO NOTHING;
-- 720M/721M have official published numbers but no verified SQL
-- station-clock templates in this line; stay NUMBER_ONLY, no fake runs.
WITH n(train_number,direction_urn) AS (
 VALUES('720M','odpt.RailDirection:Inbound'),
       ('721M','odpt.RailDirection:Outbound')
), cal(calendar_urn) AS (
 VALUES('odpt.Calendar:Weekday'),('odpt.Calendar:SaturdayHoliday')
)
INSERT INTO public.published_joetsu_2611_number_roster(
 edition,line_key,train_number,calendar_urn,direction_urn,train_type_urn,
 service_name,vehicle_model,png_reference,segment_key,official_source_url)
SELECT '2611','Joetsu',n.train_number,c.calendar_urn,n.direction_urn,
 'odpt.TrainType:JR-East.Local','',
 '211系（高崎地区）','../images/列车/JR東日本/JR東日本_211系_湘南色.png',
 'south','https://timetables.jreast.co.jp/2611/timetable-v/238'||
 CASE WHEN n.direction_urn='odpt.RailDirection:Inbound' THEN 'u' ELSE 'd' END||
 CASE WHEN c.calendar_urn='odpt.Calendar:Weekday' THEN '1' ELSE '2' END||'.html'
FROM n CROSS JOIN cal c
ON CONFLICT DO NOTHING;
COMMIT;