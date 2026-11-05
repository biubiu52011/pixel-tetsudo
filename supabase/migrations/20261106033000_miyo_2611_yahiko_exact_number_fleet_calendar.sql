-- JR East 弥彦線 (internal Miyo), 2026-11 official 233u1/u2/d1/d2.
-- Never confuse public train numbers with operation numbers or specific cars.
-- Numbered SQL historical stop plans are NOT certified current clocks.
-- Sources: https://timetables.jreast.co.jp/2611/timetable-v/233d2.html
--          https://timetables.jreast.co.jp/2611/timetable-v/233u2.html
-- E129 fleet: https://www.jreast.co.jp/train/local/e129.html
-- もみじ海里: HB-E300 (海里) only Nov 2,9,16,23; 3 train-number
-- segments in each calendar, but no source-backed Miyo SQL stop templates.
-- Shu*Kura 9222D/9225D run on 10/24 ONLY: exclude in Nov.
BEGIN;
SELECT pg_advisory_xact_lock(2611233);
CREATE TABLE IF NOT EXISTS public.published_miyo_2611_number_roster(
 edition text NOT NULL CHECK(edition='2611'),
 line_key text NOT NULL CHECK(line_key='Miyo'),
 source_template_id bigint,
 source_occurrence smallint NOT NULL DEFAULT 0,
 train_number text NOT NULL CHECK(train_number~'^[0-9]+[MD]$'),
 calendar_urn text NOT NULL CHECK(calendar_urn IN
  ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
 direction_urn text NOT NULL CHECK(direction_urn IN
  ('odpt.RailDirection:Inbound','odpt.RailDirection:Outbound')),
 train_type_urn text NOT NULL,
 segment_key text NOT NULL CHECK(segment_key IN
  ('regular','seasonal_holiday','kiku','october_only','momiji_no_sql_source')),
 operating_dates date[] NOT NULL DEFAULT '{}'::date[],
 excluded_dates date[] NOT NULL DEFAULT '{}'::date[],
 source_stop_keys text[] NOT NULL DEFAULT '{}'::text[],
 vehicle_model text,
 png_reference text,
 service_name text,
 official_source_url text NOT NULL,
 fleet_source_url text,
 stop_clock_status text NOT NULL
  DEFAULT 'historical_not_2611_verified'
  CHECK(stop_clock_status='historical_not_2611_verified'),
 reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 PRIMARY KEY(edition,line_key,train_number,calendar_urn,direction_urn,segment_key,source_occurrence),
 CHECK(
   (segment_key='momiji_no_sql_source' AND source_template_id IS NULL
    AND cardinality(source_stop_keys)=0 AND vehicle_model='HB-E300系（海里）'
    AND png_reference='../images/列车/JR東日本/JR東日本_HB-E300系_海里.png')
   OR
   (segment_key='october_only' AND source_template_id IS NOT NULL
    AND vehicle_model IS NULL AND png_reference IS NULL)
   OR
   (segment_key IN('regular','seasonal_holiday','kiku') AND
    source_template_id IS NOT NULL AND cardinality(source_stop_keys)>=2
    AND vehicle_model='E129系' AND
    png_reference='../images/列车/JR東日本/JR東日本_E129系.png')
 )
);
ALTER TABLE public.published_miyo_2611_number_roster ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_miyo_2611_number_roster IS
'JR East Nov 2026 233 line: regular E129, 9 Kiku event days, monthly Monday Momiji HB-E300, expired Oct24 Shu*Kura. Momiji lacks SQL source and is NOT rendered as invented position.';

CREATE TEMP TABLE _miyo2611_source ON COMMIT DROP AS
SELECT t.*,
  ARRAY(SELECT split_part(coalesce(s.departure_station_urn,s.arrival_station_urn),'.',3)
    FROM public.manual_timetable_template_stops s
    WHERE s.template_id=t.id ORDER BY s.stop_sequence) AS raw_stops
FROM public.manual_timetable_templates t
WHERE t.line_key='Miyo' AND
  t.railway_urn='odpt.Railway:JR-East.Miyo';
DO $guard$
BEGIN
 IF (SELECT count(*) FROM _miyo2611_source)<>94 OR
   (SELECT count(*) FROM _miyo2611_source WHERE calendar_urn='odpt.Calendar:Weekday')<>40 OR
   (SELECT count(*) FROM _miyo2611_source WHERE calendar_urn='odpt.Calendar:SaturdayHoliday')<>54 OR
   (SELECT count(*) FROM _miyo2611_source WHERE train_number IN('9225D','9222D'))<>2 OR
   (SELECT count(*) FROM _miyo2611_source WHERE train_number='228M' AND
      calendar_urn='odpt.Calendar:SaturdayHoliday')<>2 OR
   EXISTS(SELECT 1 FROM _miyo2611_source WHERE
      (cardinality(raw_stops) NOT BETWEEN 2 AND 8) OR
      raw_stops @> ARRAY['']::text[] OR vehicle_type_label<>'E129系')
 THEN RAISE EXCEPTION 'Miyo 2611 old SQL source template shape changed; audit required'; END IF;
END $guard$;
WITH official AS (
 SELECT t.*,
 CASE
 WHEN train_number IN('9225D','9222D') THEN 'october_only'
 WHEN train_number IN('9235M','9234M','9228M','9241M',
                       '9281M','9282M','9284M') THEN 'kiku'
 WHEN train_number IN('8231M','8232M','8266M','8271M') THEN 'seasonal_holiday'
 ELSE 'regular' END AS scope
 FROM _miyo2611_source t
)
INSERT INTO public.published_miyo_2611_number_roster(
 edition,line_key,source_template_id,source_occurrence,train_number,calendar_urn,direction_urn,
 train_type_urn,segment_key,operating_dates,excluded_dates,source_stop_keys,
 vehicle_model,png_reference,service_name,official_source_url,fleet_source_url)
SELECT '2611','Miyo',t.id,t.source_occurrence,t.train_number,t.calendar_urn,t.direction_urn,
 t.train_type_urn,t.scope,
 CASE WHEN t.scope='kiku' THEN
  ARRAY['2026-11-01','2026-11-03','2026-11-07','2026-11-08',
        '2026-11-14','2026-11-15','2026-11-21','2026-11-22','2026-11-23']::date[]
 WHEN t.scope='october_only' THEN ARRAY['2026-10-24']::date[]
 WHEN t.train_number='228M' AND t.source_occurrence=1 THEN
  ARRAY['2026-11-01','2026-11-03','2026-11-07','2026-11-08',
        '2026-11-14','2026-11-15','2026-11-21','2026-11-22','2026-11-23']::date[]
 ELSE '{}'::date[] END,
 CASE
 WHEN t.train_number='228M' AND t.source_occurrence=0 AND
      t.calendar_urn='odpt.Calendar:SaturdayHoliday' THEN
  ARRAY['2026-11-01','2026-11-03','2026-11-07','2026-11-08',
        '2026-11-14','2026-11-15','2026-11-21','2026-11-22','2026-11-23']::date[]
 ELSE '{}'::date[] END,
 t.raw_stops,
 CASE WHEN t.scope='october_only' THEN NULL ELSE 'E129系' END,
 CASE WHEN t.scope='october_only' THEN NULL ELSE
  '../images/列车/JR東日本/JR東日本_E129系.png' END,
 CASE t.train_number
 WHEN '9281M' THEN '弥彦菊花秋絵巻1号'
 WHEN '9282M' THEN '弥彦菊花秋絵巻2号'
 WHEN '9284M' THEN '弥彦菊花秋絵巻4号'
 WHEN '9228M' THEN '弥彦菊まつり号'
 WHEN '9225D' THEN '弥彦Shu＊Kura（10月限定）'
 WHEN '9222D' THEN '弥彦Shu＊Kura（10月限定）'
 ELSE NULL END,
 'https://timetables.jreast.co.jp/2611/timetable-v/233'||
 CASE WHEN t.direction_urn='odpt.RailDirection:Inbound' THEN 'u' ELSE 'd' END||
 CASE WHEN t.calendar_urn='odpt.Calendar:Weekday' THEN '1' ELSE '2' END||'.html',
 'https://www.jreast.co.jp/train/local/e129.html'
FROM official t
ON CONFLICT DO NOTHING;
-- The same 3 momiji rail segment train numbers are on official weekday and
-- holiday pages; 11/2,9,16 use weekday and 11/23 (holiday) uses holiday.
-- Source stop clocks ARE NOT present in 94 manual SQL templates.
INSERT INTO public.published_miyo_2611_number_roster(
 edition,line_key,source_template_id,train_number,calendar_urn,direction_urn,
 train_type_urn,segment_key,operating_dates,vehicle_model,png_reference,
 service_name,official_source_url,fleet_source_url)
SELECT '2611','Miyo',NULL,m.train_number,c.calendar_urn,m.direction_urn,
 'odpt.TrainType:JR-East.Rapid','momiji_no_sql_source',
 ARRAY['2026-11-02','2026-11-09','2026-11-16','2026-11-23']::date[],
 'HB-E300系（海里）',
 '../images/列车/JR東日本/JR東日本_HB-E300系_海里.png',
 'もみじ海里',
 'https://timetables.jreast.co.jp/2611/timetable-v/233'||
 CASE WHEN m.direction_urn='odpt.RailDirection:Inbound' THEN 'u' ELSE 'd' END||
 CASE WHEN c.calendar_urn='odpt.Calendar:Weekday' THEN '1' ELSE '2' END||'.html',
 'https://www.jreast.co.jp/railway/joyful/kairi.html'
FROM (VALUES('9278D','odpt.RailDirection:Inbound'),
            ('9279D','odpt.RailDirection:Outbound'),
            ('9179D','odpt.RailDirection:Outbound')) AS m(train_number,direction_urn)
CROSS JOIN (VALUES ('odpt.Calendar:Weekday'),
                   ('odpt.Calendar:SaturdayHoliday')) AS c(calendar_urn)
ON CONFLICT DO NOTHING;
INSERT INTO public.published_train_png_number_ranges(
 edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
 png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
('2611','Miyo','miyo_e129_regular_seasonal',220,9284,'M','E129系',
 '../images/列车/JR東日本/JR東日本_E129系.png',
 'https://timetables.jreast.co.jp/2611/timetable-v/233u2.html',
 true,false),
('2611','Miyo','momiji_no_sql_source',9179,9279,'D','HB-E300系（海里）',
 '../images/列车/JR東日本/JR東日本_HB-E300系_海里.png',
 'https://timetables.jreast.co.jp/2611/timetable-v/233d1.html',
 true,false)
ON CONFLICT DO NOTHING;
INSERT INTO public.published_train_number_evidence(
 edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,
 official_source_url,verification_scope)
SELECT DISTINCT ON (calendar_urn,direction_urn,train_number)
 edition,line_key,calendar_urn,direction_urn,train_number,
 source_template_id,official_source_url,'train_number_only'
FROM public.published_miyo_2611_number_roster
WHERE segment_key NOT IN('october_only','momiji_no_sql_source')
ORDER BY calendar_urn,direction_urn,train_number,source_template_id
ON CONFLICT DO NOTHING;
DO $after$
BEGIN
 IF (SELECT count(*) FROM public.published_miyo_2611_number_roster)<>100 OR
   (SELECT count(*) FROM public.published_miyo_2611_number_roster WHERE source_template_id IS NULL)<>6 OR
   (SELECT count(*) FROM public.published_miyo_2611_number_roster WHERE segment_key='october_only')<>2 OR
   (SELECT count(*) FROM public.published_train_png_number_ranges WHERE edition='2611' AND line_key='Miyo')<>2 OR
   (SELECT count(*) FROM public.published_train_number_evidence WHERE edition='2611' AND line_key='Miyo')<>91
 THEN RAISE EXCEPTION 'Miyo 2611 row count or source-only Momiji exception changed'; END IF;
END $after$;
COMMIT;
