-- JR-East 2611 Komii (Koumi) official rail number roster.
-- 51 exact published numbers, 102 weekday+holiday SQL templates.
-- Six extra old holiday-only SQL numbers stay historical and are not
-- admitted to the 2611 publication-derived position estimate.
-- https://timetables.jreast.co.jp/2611/timetable-v/228d1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/228d2.html
-- https://timetables.jreast.co.jp/2611/timetable-v/228u1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/228u2.html
-- 2026-11-05 JR service advisory: Oct 27 rockfall, Koumi–Nobeyama
-- suspended until verified restoration; no substitute bus.
-- All 3 HIGH RAIL services cancelled through Nov 9 despite printed run days.
-- Nov 17-19 Kobuchizawa–Koumi midday construction: specified
-- trains are segment-suspended or wholly cancelled.
-- Planned model picture is NEVER confirmed carset or GPS.
BEGIN;
SELECT pg_advisory_xact_lock(2611228);
CREATE TABLE IF NOT EXISTS public.published_komii_2611_number_roster(
 edition text NOT NULL CHECK(edition='2611'),
 line_key text NOT NULL CHECK(line_key='Komii'),
 train_number text NOT NULL CHECK(train_number ~ '^[0-9]+D$'),
 calendar_urn text NOT NULL CHECK(calendar_urn IN ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
 direction_urn text NOT NULL CHECK(direction_urn IN ('odpt.RailDirection:Inbound','odpt.RailDirection:Outbound')),
 train_type_urn text NOT NULL CHECK(train_type_urn IN ('odpt.TrainType:JR-East.Local','odpt.TrainType:JR-East.Rapid')),
 is_high_rail boolean NOT NULL,
 planned_vehicle_candidates text[] NOT NULL,
 fleet_model text,
 png_reference text,
 source_url text NOT NULL,
 service_source_url text NOT NULL,
 scheduled_dates date[] NOT NULL DEFAULT '{}'::date[],
 stop_clock_status text NOT NULL CHECK(stop_clock_status IN('published_number_route_only','highrail_endpoint_verified')),
 reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 PRIMARY KEY(edition,line_key,train_number,calendar_urn,direction_urn),
 CHECK((is_high_rail AND fleet_model='キハ100・110系（HIGH RAIL 1375）'
 AND png_reference IS NOT NULL AND cardinality(scheduled_dates)=19
 AND train_type_urn='odpt.TrainType:JR-East.Rapid')
 OR(NOT is_high_rail AND fleet_model IS NULL AND png_reference IS NULL
 AND cardinality(scheduled_dates)=0 AND train_type_urn='odpt.TrainType:JR-East.Local'))
);
ALTER TABLE public.published_komii_2611_number_roster ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_komii_2611_number_roster IS '2611 published 51 Komii train numbers x 2 calendars. Regular local KiHa110/KiHaE200 not distinguishable per number so NO PNG. HIGH RAIL PNG reference only. A published train is not proof of operation during rockfall.';
CREATE TABLE IF NOT EXISTS public.published_komii_2611_rail_disruptions(
 disruption_id text PRIMARY KEY,edition text NOT NULL CHECK(edition='2611'),
 line_key text NOT NULL CHECK(line_key='Komii'),
 segment_from text NOT NULL,segment_to text NOT NULL,
 started_on date NOT NULL,ended_on date,reported_on date NOT NULL,
 service_status text NOT NULL,source_url text NOT NULL,
 replacement_transport text NOT NULL DEFAULT 'none' CHECK(replacement_transport='none'),
 CHECK(ended_on IS NULL OR ended_on>=started_on)
);
ALTER TABLE public.published_komii_2611_rail_disruptions ENABLE ROW LEVEL SECURITY;
INSERT INTO public.published_komii_2611_rail_disruptions
(disruption_id,edition,line_key,segment_from,segment_to,started_on,ended_on,reported_on,service_status,source_url)
VALUES('2026_10_27_rockfall','2611','Komii','Koumi','Nobeyama','2026-10-27',NULL,'2026-11-05','suspended_until_verified_restoration',
'https://traininfo.jreast.co.jp/train_info/line.aspx?gid=1&lineid=koumiline')
ON CONFLICT (disruption_id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.published_komii_2611_maintenance(
 service_date date NOT NULL,train_number text NOT NULL,
 operation text NOT NULL CHECK(operation IN('suspend_kobuchizawa_koumi_keep_other_section','cancel_whole_train')),
 segment_from text NOT NULL DEFAULT 'Kobuchizawa',
 segment_to text NOT NULL DEFAULT 'Koumi',
 source_url text NOT NULL,
 PRIMARY KEY(service_date,train_number)
);
ALTER TABLE public.published_komii_2611_maintenance ENABLE ROW LEVEL SECURITY;
CREATE TEMP TABLE _komii2611_names(n text PRIMARY KEY,dir text,type text) ON COMMIT DROP;
INSERT INTO _komii2611_names VALUES
('220D','Inbound','Local'),
('120D','Inbound','Local'),
('222D','Inbound','Local'),
('224D','Inbound','Local'),
('124D','Inbound','Local'),
('126D','Inbound','Local'),
('226D','Inbound','Local'),
('128D','Inbound','Local'),
('130D','Inbound','Local'),
('132D','Inbound','Local'),
('134D','Inbound','Local'),
('228D','Inbound','Local'),
('230D','Inbound','Local'),
('136D','Inbound','Local'),
('232D','Inbound','Local'),
('8222D','Inbound','Rapid'),
('234D','Inbound','Local'),
('138D','Inbound','Local'),
('236D','Inbound','Local'),
('140D','Inbound','Local'),
('238D','Inbound','Local'),
('142D','Inbound','Local'),
('240D','Inbound','Local'),
('144D','Inbound','Local'),
('146D','Inbound','Local'),
('148D','Inbound','Local'),
('121D','Outbound','Local'),
('123D','Outbound','Local'),
('125D','Outbound','Local'),
('127D','Outbound','Local'),
('129D','Outbound','Local'),
('221D','Outbound','Local'),
('131D','Outbound','Local'),
('223D','Outbound','Local'),
('135D','Outbound','Local'),
('225D','Outbound','Local'),
('8221D','Outbound','Rapid'),
('137D','Outbound','Local'),
('139D','Outbound','Local'),
('227D','Outbound','Local'),
('141D','Outbound','Local'),
('229D','Outbound','Local'),
('143D','Outbound','Local'),
('231D','Outbound','Local'),
('145D','Outbound','Local'),
('233D','Outbound','Local'),
('147D','Outbound','Local'),
('235D','Outbound','Local'),
('8223D','Outbound','Rapid'),
('237D','Outbound','Local'),
('239D','Outbound','Local');
DO $before$
DECLARE good int;
BEGIN
 IF (SELECT count(*) FROM _komii2611_names)<>51
 OR (SELECT count(*) FROM _komii2611_names WHERE dir='Inbound')<>26
 OR (SELECT count(*) FROM _komii2611_names WHERE dir='Outbound')<>25
 OR (SELECT count(*) FROM _komii2611_names WHERE type='Rapid')<>3
 THEN RAISE EXCEPTION 'Official 2611 list must be 26 inbound,25 outbound,3 HIGH RAIL';END IF;
 SELECT count(*) INTO good
 FROM _komii2611_names n CROSS JOIN (VALUES('Weekday'),('SaturdayHoliday')) c(cal)
 JOIN public.manual_timetable_templates src ON
 src.line_key='Komii' AND src.train_number=n.n
 AND src.calendar_urn='odpt.Calendar:'||c.cal
 AND src.direction_urn='odpt.RailDirection:'||n.dir
 AND src.train_type_urn='odpt.TrainType:JR-East.'||n.type
 AND src.railway_urn='odpt.Railway:JR-East.Komii'
 WHERE src.vehicle_type_label=CASE WHEN n.type='Rapid'
 THEN 'キハ100・110系（HIGH RAIL 1375）' ELSE 'キハ110系（小海線） / キハE200形' END
 AND (SELECT count(*) FROM manual_timetable_template_stops st WHERE st.template_id=src.id)>=5;
 IF good<>102 THEN RAISE EXCEPTION 'Expected 102 unique source templates; got %',good; END IF;
END $before$;
WITH cal(c) AS (VALUES('Weekday'),('SaturdayHoliday'))
INSERT INTO public.published_komii_2611_number_roster
(edition,line_key,train_number,calendar_urn,direction_urn,train_type_urn,
 is_high_rail,planned_vehicle_candidates,fleet_model,png_reference,
 source_url,service_source_url,scheduled_dates,stop_clock_status)
SELECT '2611','Komii',n.n,'odpt.Calendar:'||cal.c,
 'odpt.RailDirection:'||n.dir,'odpt.TrainType:JR-East.'||n.type,
 n.type='Rapid',
 CASE WHEN n.type='Rapid' THEN ARRAY['キハ100・110系（HIGH RAIL 1375）']
 ELSE ARRAY['キハ110系（小海線）','キハE200形'] END,
 CASE WHEN n.type='Rapid' THEN 'キハ100・110系（HIGH RAIL 1375）' ELSE NULL END,
 CASE WHEN n.type='Rapid' THEN '../images/列车/JR東日本/JR東日本_キハ100・110系_HIGH_RAIL_1375.png' ELSE NULL END,
 'https://timetables.jreast.co.jp/2611/timetable-v/228'||
 CASE WHEN n.dir='Inbound' THEN 'u' ELSE 'd' END||
 CASE WHEN cal.c='Weekday' THEN '1' ELSE '2' END||'.html',
 CASE WHEN n.type='Rapid' THEN 'https://www.jreast.co.jp/train/fun/highrail1375.html'
 ELSE 'https://www.jreast.co.jp/train/local/kiha_e200.html' END,
 CASE WHEN n.type='Rapid' THEN ARRAY['2026-11-01'::date,'2026-11-02'::date,'2026-11-03'::date,'2026-11-06'::date,'2026-11-07'::date,'2026-11-08'::date,'2026-11-09'::date,'2026-11-13'::date,'2026-11-14'::date,'2026-11-15'::date,'2026-11-16'::date,'2026-11-20'::date,'2026-11-21'::date,'2026-11-22'::date,'2026-11-23'::date,'2026-11-27'::date,'2026-11-28'::date,'2026-11-29'::date,'2026-11-30'::date] ELSE '{}'::date[] END,
 CASE WHEN n.type='Rapid' THEN 'highrail_endpoint_verified'
 ELSE 'published_number_route_only' END
FROM _komii2611_names n CROSS JOIN cal
ON CONFLICT DO NOTHING;
INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,png_reference,source_url)
VALUES('2611','Komii','highrail1375_official',8221,8223,'D',
'キハ100・110系（HIGH RAIL 1375）',
'../images/列车/JR東日本/JR東日本_キハ100・110系_HIGH_RAIL_1375.png',
'https://www.jreast.co.jp/train/fun/highrail1375.html') ON CONFLICT DO NOTHING;
INSERT INTO public.published_komii_2611_maintenance
(service_date,train_number,operation,source_url)
SELECT d.dt,n.num,n.op,
'https://timetables.jreast.co.jp/2611/timetable-v/228'||
 CASE WHEN substring(n.num FROM '^[0-9]+')::integer%2=0 THEN 'u1' ELSE 'd1' END||'.html'
FROM (VALUES('2026-11-17'::date),('2026-11-18'::date),('2026-11-19'::date)) d(dt)
CROSS JOIN(VALUES
('225D','suspend_kobuchizawa_koumi_keep_other_section'),
('226D','suspend_kobuchizawa_koumi_keep_other_section'),
('229D','suspend_kobuchizawa_koumi_keep_other_section'),
('230D','suspend_kobuchizawa_koumi_keep_other_section'),
('227D','cancel_whole_train'),('228D','cancel_whole_train')
)n(num,op)
ON CONFLICT DO NOTHING;
INSERT INTO public.published_train_number_evidence
(edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,official_source_url,verification_scope)
SELECT '2611','Komii',r.calendar_urn,r.direction_urn,r.train_number,
src.id,r.source_url,'train_number_only'
FROM public.published_komii_2611_number_roster r
JOIN public.manual_timetable_templates src ON
src.line_key='Komii' AND src.train_number=r.train_number
AND src.calendar_urn=r.calendar_urn AND src.direction_urn=r.direction_urn
ON CONFLICT DO NOTHING;
DO $after$
BEGIN
 IF (SELECT count(*) FROM published_komii_2611_number_roster)<>102
 OR (SELECT count(distinct train_number) FROM published_komii_2611_number_roster)<>51
 OR (SELECT count(*) FROM published_komii_2611_number_roster WHERE is_high_rail)<>6
 OR (SELECT count(*) FROM published_komii_2611_maintenance)<>18
 OR (SELECT count(*) FROM published_train_number_evidence WHERE edition='2611' AND line_key='Komii')<>102
 THEN RAISE EXCEPTION 'Koumi 2611 roster, evidence or maintenance count mismatch'; END IF;
END $after$;
COMMIT;