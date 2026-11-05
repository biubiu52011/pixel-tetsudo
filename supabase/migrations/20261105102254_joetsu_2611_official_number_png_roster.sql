-- Official JR East 2026-11 Joetsu conventional train-number inventory.
-- https://timetables.jreast.co.jp/2611/timetable-v/296d1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/296d2.html
-- https://timetables.jreast.co.jp/2611/timetable-v/296u1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/296u2.html
-- NUMBER ONLY: these rows do NOT invent station clocks or actual rolling stock.
BEGIN;
CREATE TABLE IF NOT EXISTS public.published_joetsu_2611_number_roster(
 edition text NOT NULL CHECK(edition='2611'),
 line_key text NOT NULL CHECK(line_key='Joetsu'),
 train_number text NOT NULL,calendar_urn text NOT NULL,direction_urn text NOT NULL,
 train_type_urn text NOT NULL,service_name text NOT NULL DEFAULT '',
 vehicle_model text NOT NULL,png_reference text NOT NULL,
 segment_key text NOT NULL CHECK(segment_key IN ('north','south')),
 official_source_url text NOT NULL,operating_dates date[] NOT NULL DEFAULT '{}',
 reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 stop_clock_status text NOT NULL DEFAULT 'number_only'
 CHECK(stop_clock_status IN ('number_only','partial_official_stops')),
 PRIMARY KEY(edition,line_key,calendar_urn,direction_urn,train_number)
);
ALTER TABLE public.published_joetsu_2611_number_roster ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_joetsu_2611_number_roster IS '2026-11 JR East published numbers and a vehicle-series illustration, not train-specific stop-clock or actual formation confirmation';
CREATE TABLE IF NOT EXISTS public.published_train_png_number_ranges(
 edition text NOT NULL,line_key text NOT NULL,segment_key text NOT NULL,
 min_number integer NOT NULL,max_number integer NOT NULL,suffix text NOT NULL,
 vehicle_model text NOT NULL,png_reference text NOT NULL,source_url text NOT NULL,
 requires_exact_roster boolean NOT NULL DEFAULT true CHECK(requires_exact_roster),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 PRIMARY KEY(edition,line_key,segment_key,min_number,max_number,suffix),
 CHECK(min_number<=max_number)
);
ALTER TABLE public.published_train_png_number_ranges ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_train_png_number_ranges IS 'PNG numeric intervals require exact source/segment/calendar roster membership; NOT physical trainset identification';
INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url)
VALUES
('2611','Joetsu','north',1720,1752,'M','E129系','../images/列车/JR東日本/JR東日本_E129系.png','https://timetables.jreast.co.jp/2611/timetable-v/296d1.html'),
('2611','Joetsu','north',8124,9783,'D','キハ40・48形（越乃Shu＊Kura）','../images/列车/JR東日本/JR東日本_キハ40・48形_越乃Shu＊Kura.png','https://timetables.jreast.co.jp/2611/timetable-v/296d2.html')
ON CONFLICT DO NOTHING;
WITH nums(number,dir) AS (VALUES
('1721M','Outbound'),
('1723M','Outbound'),
('1725M','Outbound'),
('1727M','Outbound'),
('1729M','Outbound'),
('1731M','Outbound'),
('1735M','Outbound'),
('1737M','Outbound'),
('1739M','Outbound'),
('1741M','Outbound'),
('1743M','Outbound'),
('1745M','Outbound'),
('1747M','Outbound'),
('1749M','Outbound'),
('1751M','Outbound'),
('1720M','Inbound'),
('1722M','Inbound'),
('1724M','Inbound'),
('1726M','Inbound'),
('1728M','Inbound'),
('1732M','Inbound'),
('1734M','Inbound'),
('1736M','Inbound'),
('1738M','Inbound'),
('1740M','Inbound'),
('1742M','Inbound'),
('1744M','Inbound'),
('1746M','Inbound'),
('1748M','Inbound'),
('1750M','Inbound'),
('1752M','Inbound')
),cal(calendar) AS (VALUES ('Weekday'),('SaturdayHoliday'))
INSERT INTO public.published_joetsu_2611_number_roster
(edition,line_key,train_number,calendar_urn,direction_urn,train_type_urn,
 service_name,vehicle_model,png_reference,segment_key,official_source_url)
SELECT '2611','Joetsu',nums.number,'odpt.Calendar:'||cal.calendar,
 'odpt.RailDirection:'||nums.dir,'odpt.TrainType:JR-East.Local','',
 'E129系','../images/列车/JR東日本/JR東日本_E129系.png','north',
 'https://timetables.jreast.co.jp/2611/timetable-v/296'||
 (CASE WHEN nums.dir='Inbound' THEN 'u' ELSE 'd' END)||
 (CASE WHEN cal.calendar='Weekday' THEN '1' ELSE '2' END)||'.html'
FROM nums CROSS JOIN cal ON CONFLICT DO NOTHING;
WITH named(number,dir,service_name,days) AS (VALUES
('9780D','Inbound','あかねShu＊Kura',ARRAY['2026-11-01','2026-11-02','2026-11-03']::date[]),
('9783D','Outbound','あかねShu＊Kura',ARRAY['2026-11-01','2026-11-02','2026-11-03']::date[]),
('9762D','Inbound','ゆざわShu＊Kura',ARRAY['2026-11-06','2026-11-09']::date[]),
('9765D','Outbound','ゆざわShu＊Kura',ARRAY['2026-11-06','2026-11-09']::date[]),
('9781D','Outbound','摂田屋Shu＊Kura',ARRAY['2026-11-07','2026-11-08']::date[]),
('9782D','Inbound','摂田屋Shu＊Kura',ARRAY['2026-11-07','2026-11-08']::date[]),
('8124D','Inbound','越乃Shu＊Kura',ARRAY['2026-11-20','2026-11-21','2026-11-27','2026-11-28','2026-11-29']::date[]),
('8133D','Outbound','越乃Shu＊Kura',ARRAY['2026-11-20','2026-11-21','2026-11-27','2026-11-28','2026-11-29']::date[])
),dated AS (
 SELECT n.number,n.dir,n.service_name,x.day,
 CASE WHEN extract(isodow from x.day) IN (6,7)
   OR x.day IN ('2026-11-03'::date,'2026-11-23'::date)
 THEN 'SaturdayHoliday' ELSE 'Weekday' END AS calendar
 FROM named n CROSS JOIN LATERAL unnest(n.days) x(day)
)
INSERT INTO public.published_joetsu_2611_number_roster
(edition,line_key,train_number,calendar_urn,direction_urn,train_type_urn,
 service_name,vehicle_model,png_reference,segment_key,official_source_url,operating_dates)
SELECT '2611','Joetsu',d.number,'odpt.Calendar:'||d.calendar,
'odpt.RailDirection:'||d.dir,'odpt.TrainType:JR-East.Rapid',d.service_name,
'キハ40・48形（越乃Shu＊Kura）',
'../images/列车/JR東日本/JR東日本_キハ40・48形_越乃Shu＊Kura.png','north',
'https://timetables.jreast.co.jp/2611/timetable-v/296'||
(CASE WHEN d.dir='Inbound' THEN 'u' ELSE 'd' END)||
(CASE WHEN d.calendar='Weekday' THEN '1' ELSE '2' END)||'.html',
array_agg(d.day ORDER BY d.day)
FROM dated d GROUP BY d.number,d.dir,d.service_name,d.calendar
ON CONFLICT DO NOTHING;
COMMIT;