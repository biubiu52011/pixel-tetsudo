-- Official JR East 2026 November Kamaishi numbered train + fleet proof.
-- Sources: 979d1,d2,u1,u2, JR East 2026-03-14 HB-E220 conversion,
-- 8621D/8622D train pages and official Hinabi (HB-E300) service calendar.
-- This roster does NOT certify historical source stop clocks or carsets.
BEGIN;
CREATE TABLE IF NOT EXISTS public.published_kamaishi_2611_number_roster (
 edition text NOT NULL CHECK (edition='2611'),
 line_key text NOT NULL CHECK (line_key='Kamaishi'),
 train_number text NOT NULL,
 calendar_urn text NOT NULL,
 direction_urn text NOT NULL,
 train_type_urn text NOT NULL,
 service_name text NOT NULL DEFAULT '',
 vehicle_model text NOT NULL,
 png_reference text NOT NULL,
 segment_key text NOT NULL CHECK (segment_key='full'),
 official_source_url text NOT NULL,
 vehicle_model_source_url text NOT NULL,
 operating_dates date[] NOT NULL DEFAULT '{}',
 reference_only boolean NOT NULL DEFAULT true CHECK (reference_only),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 stop_clock_status text NOT NULL DEFAULT 'number_only'
   CHECK(stop_clock_status IN ('number_only','full_official_segment')),
 PRIMARY KEY(edition,line_key,calendar_urn,direction_urn,train_number)
);
ALTER TABLE public.published_kamaishi_2611_number_roster ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_kamaishi_2611_number_roster IS
 '2026-11 JR East Kamaishi exact published train numbers, type, calendar and model illustration. NEVER actual carset, formation, realtime position or proof all historical stop clocks are current.';
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url)
VALUES
 ('2611','Kamaishi','full',650,672,'D','HB-E220系',
 '../images/列车/JR東日本/JR東日本_HB-E220系.png',
 'https://timetables.jreast.co.jp/2611/timetable-v/979d1.html'),
 ('2611','Kamaishi','full',1652,1669,'D','HB-E220系',
 '../images/列车/JR東日本/JR東日本_HB-E220系.png',
 'https://timetables.jreast.co.jp/2611/timetable-v/979u1.html'),
 ('2611','Kamaishi','full',3657,3666,'D','HB-E220系',
 '../images/列车/JR東日本/JR東日本_HB-E220系.png',
 'https://timetables.jreast.co.jp/2611/timetable-v/979d1.html'),
 ('2611','Kamaishi','full',5559,5562,'D','HB-E220系',
 '../images/列车/JR東日本/JR東日本_HB-E220系.png',
 'https://timetables.jreast.co.jp/2611/timetable-v/979d1.html'),
 ('2611','Kamaishi','full',8621,8622,'D','HB-E300系（ひなび）',
 '../images/列车/JR東日本/JR東日本_HB-E300系_ひなび_陽旅.png',
 'https://timetables.jreast.co.jp/2611/train/150/154901.html')
ON CONFLICT DO NOTHING;
WITH official (train_number,direction,train_type,service_name) AS (
VALUES
('651D','Outbound','Local',''),
('653D','Outbound','Local',''),
('655D','Outbound','Local',''),
('3657D','Outbound','Rapid','はまゆり'),
('5559D','Outbound','Rapid','はまゆり'),
('3659D','Outbound','Rapid','はまゆり'),
('661D','Outbound','Local',''),
('663D','Outbound','Local',''),
('3665D','Outbound','Rapid','はまゆり'),
('1667D','Outbound','Local',''),
('1669D','Outbound','Local',''),
('671D','Outbound','Local',''),
('1652D','Inbound','Local',''),
('1654D','Inbound','Local',''),
('656D','Inbound','Local',''),
('3658D','Inbound','Rapid','はまゆり'),
('660D','Inbound','Local',''),
('3662D','Inbound','Rapid','はまゆり'),
('5562D','Inbound','Rapid','はまゆり'),
('664D','Inbound','Local',''),
('3666D','Inbound','Rapid','はまゆり'),
('1668D','Inbound','Local',''),
('670D','Inbound','Local',''),
('672D','Inbound','Local','')
), calendars (calendar) AS (VALUES ('Weekday'),('SaturdayHoliday'))
INSERT INTO public.published_kamaishi_2611_number_roster
 (edition,line_key,train_number,calendar_urn,direction_urn,train_type_urn,
 service_name,vehicle_model,png_reference,segment_key,official_source_url,
 vehicle_model_source_url)
SELECT '2611','Kamaishi',o.train_number,'odpt.Calendar:'||c.calendar,
 'odpt.RailDirection:'||o.direction,'odpt.TrainType:JR-East.'||o.train_type,
 o.service_name,'HB-E220系',
 '../images/列车/JR東日本/JR東日本_HB-E220系.png','full',
 'https://timetables.jreast.co.jp/2611/timetable-v/979'||
 CASE WHEN o.direction='Inbound' THEN 'u' ELSE 'd' END||
 CASE WHEN c.calendar='Weekday' THEN '1' ELSE '2' END||'.html',
 'https://www.jreast.co.jp/press/2025/morioka/20251212_mr01.pdf'
FROM official o CROSS JOIN calendars c ON CONFLICT DO NOTHING;
WITH dated(day) AS (
 VALUES ('2026-11-07'::date),('2026-11-08'::date),
 ('2026-11-14'::date),('2026-11-15'::date),
 ('2026-11-21'::date),('2026-11-22'::date),('2026-11-23'::date)
), specials(train_number,direction,source_url) AS (
 VALUES ('8621D','Outbound','https://timetables.jreast.co.jp/2611/train/150/154901.html'),
        ('8622D','Inbound','https://timetables.jreast.co.jp/2611/train/150/154891.html')
)
INSERT INTO public.published_kamaishi_2611_number_roster
(edition,line_key,train_number,calendar_urn,direction_urn,train_type_urn,
service_name,vehicle_model,png_reference,segment_key,official_source_url,
vehicle_model_source_url,operating_dates)
SELECT '2611','Kamaishi',s.train_number,'odpt.Calendar:SaturdayHoliday',
'odpt.RailDirection:'||s.direction,'odpt.TrainType:JR-East.Rapid',
'ひなび 釜石','HB-E300系（ひなび）',
'../images/列车/JR東日本/JR東日本_HB-E300系_ひなび_陽旅.png',
'full',s.source_url,'https://www.jreast.co.jp/railway/joyful/hinabi.html',
(SELECT array_agg(day ORDER BY day) FROM dated)
FROM specials s ON CONFLICT DO NOTHING;
-- Verification is NUMBER + calendar + direction only, not stop time.
INSERT INTO public.published_train_number_evidence
(edition,line_key,calendar_urn,direction_urn,train_number,
source_template_id,official_source_url,verification_scope)
SELECT '2611','Kamaishi',r.calendar_urn,r.direction_urn,
r.train_number,t.id,r.official_source_url,'train_number_only'
FROM public.published_kamaishi_2611_number_roster r
JOIN public.manual_timetable_templates t
ON t.line_key='Kamaishi' AND t.calendar_urn=r.calendar_urn
 AND t.direction_urn=r.direction_urn AND t.train_number=r.train_number
ON CONFLICT DO NOTHING;
COMMIT;