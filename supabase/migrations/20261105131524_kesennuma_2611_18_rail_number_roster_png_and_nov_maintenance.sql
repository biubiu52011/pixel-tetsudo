-- JR East 2026-11 (edition 2611) Kesennuma line RAIL ONLY.
-- Rail Maeyachi<->Yanagitsu D services: 18 exact numbered services
-- over 2 calendars = 36 source-backed timetable templates.
-- K-numbered services on the same old "Kesennuma" SQL namespace are
-- BRT, not rail and never train PNG. Keep those records untouched.
-- Nov 4-6 maintenance: 2927D / 2930D rail SEGMENT only cancelled;
-- 929D / 928D entire train cancelled. No substitute bus or taxi.
-- Sources:
-- https://timetables.jreast.co.jp/2611/timetable-v/267d1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/267d2.html
-- https://timetables.jreast.co.jp/2611/timetable-v/267u1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/267u2.html
-- https://www.jreast.co.jp/suspend/
-- https://www.jreast.co.jp/train/local/kiha110.html
BEGIN;
SELECT pg_advisory_xact_lock(2611267);
CREATE TABLE IF NOT EXISTS public.published_kesennuma_2611_rail_roster(
 edition text NOT NULL CHECK(edition='2611'),
 line_key text NOT NULL CHECK(line_key='Kesennuma'),
 train_number text NOT NULL CHECK(train_number ~ '^[0-9]+D$'),
 calendar_urn text NOT NULL CHECK(calendar_urn IN(
 'odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
 direction_urn text NOT NULL CHECK(direction_urn IN(
 'odpt.RailDirection:Outbound','odpt.RailDirection:Inbound')),
 train_type_urn text NOT NULL DEFAULT 'odpt.TrainType:JR-East.Local'
   CHECK(train_type_urn='odpt.TrainType:JR-East.Local'),
 from_station text NOT NULL,
 to_station text NOT NULL,
 origin_departure_clock text NOT NULL,
 vehicle_model text NOT NULL CHECK(vehicle_model='キハ110系'),
 png_reference text NOT NULL,
 official_source_url text NOT NULL,
 vehicle_family_source_url text NOT NULL,
 stop_clock_status text NOT NULL
   CHECK(stop_clock_status='official_2611_origin_departure_only'),
 reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 PRIMARY KEY(edition,line_key,train_number,calendar_urn,direction_urn),
 CHECK((direction_urn='odpt.RailDirection:Outbound' AND
    from_station='Maeyachi' AND to_station='Yanagitsu') OR
   (direction_urn='odpt.RailDirection:Inbound' AND
    from_station='Yanagitsu' AND to_station='Maeyachi'))
);
ALTER TABLE public.published_kesennuma_2611_rail_roster ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_kesennuma_2611_rail_roster IS
 '2026-11 JR East D-numbered RAIL Maeyachi-Yanagitsu only. All 18 numbers plus 36 origin departures verified against current overview, not entire intermediate clocks. KiHa110 PNG is a fleet FAMILY illustration, actual trainset unknown. K suffix belongs to separate BRT.';
CREATE TABLE IF NOT EXISTS public.published_kesennuma_2611_rail_interruptions(
 edition text NOT NULL DEFAULT '2611' CHECK(edition='2611'),
 line_key text NOT NULL DEFAULT 'Kesennuma' CHECK(line_key='Kesennuma'),
 service_date date NOT NULL,
 train_number text NOT NULL,
 interruption_scope text NOT NULL CHECK(interruption_scope IN(
 'rail_segment_Maeyachi_Yanagitsu','entire_train')),
 affected_from text NOT NULL DEFAULT 'Maeyachi',
 affected_to text NOT NULL DEFAULT 'Yanagitsu',
 substitute_mode text NOT NULL DEFAULT 'none' CHECK(substitute_mode='none'),
 official_source_url text NOT NULL,
 PRIMARY KEY(edition,line_key,service_date,train_number)
);

ALTER TABLE public.published_kesennuma_2611_rail_interruptions ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_kesennuma_2611_rail_interruptions IS
 '2026-11-04,05,06 JR scheduled daytime maintenance. Four D railway services unavailable on Maeyachi–Yanagitsu; BRT remains separate and unaffected.';
CREATE TEMP TABLE _kesennuma2611_official_origins(
 train_number text PRIMARY KEY, dir text NOT NULL,first_clock text NOT NULL)
 ON COMMIT DROP;
INSERT INTO _kesennuma2611_official_origins VALUES
('921D','Outbound','06:16'),
('923D','Outbound','07:33'),
('925D','Outbound','09:03'),
('2927D','Outbound','10:59'),
('929D','Outbound','13:00'),
('2931D','Outbound','15:56'),
('933D','Outbound','16:57'),
('935D','Outbound','18:00'),
('2937D','Outbound','20:27'),
('922D','Inbound','06:46'),
('924D','Inbound','08:06'),
('2926D','Inbound','09:39'),
('928D','Inbound','11:30'),
('2930D','Inbound','13:30'),
('932D','Inbound','16:26'),
('934D','Inbound','17:28'),
('2936D','Inbound','19:04'),
('2938D','Inbound','20:59');
DO $validate$
DECLARE found integer;
BEGIN
 SELECT count(*) INTO found FROM public.manual_timetable_templates t
 JOIN _kesennuma2611_official_origins o ON o.train_number=t.train_number AND
   t.direction_urn='odpt.RailDirection:'||o.dir
 JOIN public.manual_timetable_template_stops s
   ON s.template_id=t.id AND s.stop_sequence=0
 WHERE t.line_key='Kesennuma' AND t.train_number~'D$'
   AND t.calendar_urn IN ('odpt.Calendar:Weekday',
     'odpt.Calendar:SaturdayHoliday')
   AND t.railway_urn='odpt.Railway:JR-East.Kesennuma'
   AND t.train_type_urn='odpt.TrainType:JR-East.Local'
   AND s.departure_clock=o.first_clock
   AND s.departure_station_urn='odpt.Station:JR-East.'||
     CASE WHEN o.dir='Inbound' THEN 'Yanagitsu' ELSE 'Maeyachi' END
   AND (SELECT count(*) FROM public.manual_timetable_template_stops x
       WHERE x.template_id=t.id)=6
   AND NOT EXISTS (SELECT 1 FROM public.manual_timetable_template_stops st
       WHERE st.template_id=t.id AND
       coalesce(st.arrival_station_urn,st.departure_station_urn) NOT IN (
       'odpt.Station:JR-East.Maeyachi','odpt.Station:JR-East.Wabuchi',
       'odpt.Station:JR-East.Nonodake','odpt.Station:JR-East.Rikuzen-Toyosato',
       'odpt.Station:JR-East.Mitakedo','odpt.Station:JR-East.Yanagitsu'));
 IF found<>36 THEN RAISE EXCEPTION
  '2611 Kesennuma official rail origin/route verification expected 36, found %',found;
 END IF;
 IF (SELECT count(*) FROM _kesennuma2611_official_origins)<>18
 THEN RAISE EXCEPTION 'Expected exact 18 rail D numbered trips'; END IF;
END $validate$;
WITH c(calendar) AS (VALUES('Weekday'),('SaturdayHoliday'))
INSERT INTO public.published_kesennuma_2611_rail_roster
(edition,line_key,train_number,calendar_urn,direction_urn,train_type_urn,
 from_station,to_station,origin_departure_clock,vehicle_model,
 png_reference,official_source_url,vehicle_family_source_url,stop_clock_status)
SELECT '2611','Kesennuma',o.train_number,
 'odpt.Calendar:'||c.calendar,'odpt.RailDirection:'||o.dir,
 'odpt.TrainType:JR-East.Local',
 CASE WHEN o.dir='Inbound' THEN 'Yanagitsu' ELSE 'Maeyachi' END,
 CASE WHEN o.dir='Inbound' THEN 'Maeyachi' ELSE 'Yanagitsu' END,
 o.first_clock,'キハ110系',
 '../images/列车/JR東日本/JR東日本_キハ110系.png',
 'https://timetables.jreast.co.jp/2611/timetable-v/267'||
 CASE WHEN o.dir='Inbound' THEN 'u' ELSE 'd' END||
 CASE WHEN c.calendar='Weekday' THEN '1' ELSE '2' END||'.html',
 'https://www.jreast.co.jp/train/local/kiha110.html',
 'official_2611_origin_departure_only'
FROM _kesennuma2611_official_origins o CROSS JOIN c
ON CONFLICT DO NOTHING;

INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
 png_reference,source_url)
VALUES
('2611','Kesennuma','maeyachi_yanagitsu_rail',921,935,'D','キハ110系',
 '../images/列车/JR東日本/JR東日本_キハ110系.png',
 'https://www.jreast.co.jp/train/local/kiha110.html'),
('2611','Kesennuma','maeyachi_yanagitsu_rail',2926,2938,'D','キハ110系',
 '../images/列车/JR東日本/JR東日本_キハ110系.png',
 'https://www.jreast.co.jp/train/local/kiha110.html')
ON CONFLICT DO NOTHING;

INSERT INTO public.published_kesennuma_2611_rail_interruptions(
 edition,line_key,service_date,train_number,interruption_scope,
 affected_from,affected_to,substitute_mode,official_source_url)
SELECT '2611','Kesennuma',d.day,n.train_number,n.scope,
 'Maeyachi','Yanagitsu','none','https://www.jreast.co.jp/suspend/'
FROM (VALUES('2026-11-04'::date),('2026-11-05'::date),
 ('2026-11-06'::date)) d(day)
CROSS JOIN (VALUES
 ('2927D','rail_segment_Maeyachi_Yanagitsu'),
 ('2930D','rail_segment_Maeyachi_Yanagitsu'),
 ('928D','entire_train'),
 ('929D','entire_train')) n(train_number,scope)
ON CONFLICT DO NOTHING;

INSERT INTO public.published_train_number_evidence
(edition,line_key,calendar_urn,direction_urn,train_number,
 source_template_id,official_source_url,verification_scope)
SELECT '2611','Kesennuma',r.calendar_urn,r.direction_urn,r.train_number,
 t.id,r.official_source_url,'train_number_only'
FROM public.published_kesennuma_2611_rail_roster r
JOIN public.manual_timetable_templates t ON
 t.line_key='Kesennuma' AND t.train_number=r.train_number
 AND t.calendar_urn=r.calendar_urn AND t.direction_urn=r.direction_urn
ON CONFLICT DO NOTHING;
DO $post$
BEGIN
 IF (SELECT count(*) FROM public.published_kesennuma_2611_rail_roster)<>36
  OR (SELECT count(distinct train_number)
      FROM public.published_kesennuma_2611_rail_roster)<>18
  OR (SELECT count(*) FROM public.published_kesennuma_2611_rail_interruptions)<>12
  OR (SELECT count(*) FROM public.published_train_number_evidence
      WHERE line_key='Kesennuma' AND edition='2611')<>36
 THEN RAISE EXCEPTION 'Kesennuma 2611 rail roster/evidence/day-exclusion count mismatch'; END IF;
END $post$;
COMMIT;