-- 2026-11 JR-East 男鹿線, internal Oga. Source: 259u1/u2/d1/d2.
-- 29 official ordinary numbered services x 2 calendars = 58 official
-- identities, but legacy SQL has only 52 stop-timetable templates.
-- Missing SIX WEEKDAY SQL numbers must not be synthesized as positions.
-- 11/5 cancels six M-number trains. 1145M has changed stop clocks on
-- 11/20: preserve published number but do NOT project old SQL clock.
-- https://timetables.jreast.co.jp/2611/timetable-v/259u1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/259u2.html
-- https://timetables.jreast.co.jp/2611/timetable-v/259d1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/259d2.html
-- https://www.jreast.co.jp/train/local/ev_e801.html
BEGIN;
SELECT pg_advisory_xact_lock(2611259);
CREATE TABLE IF NOT EXISTS public.published_oga_2611_number_roster(
 edition text NOT NULL CHECK(edition='2611'),
 line_key text NOT NULL CHECK(line_key='Oga'),
 train_number text NOT NULL CHECK(train_number ~ '^11[234][0-9]M$'),
 calendar_urn text NOT NULL CHECK(calendar_urn IN
   ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
 direction_urn text NOT NULL CHECK(direction_urn IN
   ('odpt.RailDirection:Inbound','odpt.RailDirection:Outbound')),
 train_type_urn text NOT NULL CHECK(train_type_urn='odpt.TrainType:JR-East.Local'),
 source_template_id bigint,
 source_stop_keys text[] NOT NULL DEFAULT '{}'::text[],
 calendar_scope text NOT NULL CHECK(calendar_scope IN
   ('sql_rail_service','published_number_no_sql_source')),
 excluded_dates date[] NOT NULL DEFAULT '{}'::date[],
 clock_change_dates date[] NOT NULL DEFAULT '{}'::date[],
 vehicle_model text NOT NULL CHECK(vehicle_model='EV-E801系'),
 png_reference text NOT NULL
  CHECK(png_reference='../images/列车/JR東日本/JR東日本_EV-E801系.png'),
 official_source_url text NOT NULL,
 fleet_source_url text NOT NULL
  DEFAULT 'https://www.jreast.co.jp/train/local/ev_e801.html',
 stop_clock_status text NOT NULL DEFAULT 'historical_not_2611_verified'
  CHECK(stop_clock_status='historical_not_2611_verified'),
 reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 PRIMARY KEY(edition,line_key,calendar_urn,direction_urn,train_number),
 UNIQUE(edition,line_key,source_template_id),
 CHECK(
  (source_template_id IS NULL AND calendar_scope='published_number_no_sql_source'
   AND cardinality(source_stop_keys)=0)
  OR
  (source_template_id IS NOT NULL AND calendar_scope='sql_rail_service'
   AND cardinality(source_stop_keys)=9)
 )
);
ALTER TABLE public.published_oga_2611_number_roster ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_oga_2611_number_roster IS
'JR East 2611 29 public numbered E801 ordinary services in both calendars (58 records). 52 verified historical Oiwake-Oga SQL stop templates; 6 missing weekday SQL sources MUST NOT become invented positions. November 5 6 cancellations, November 20 1145M changed source clock.';
CREATE TEMP TABLE _oga_source ON COMMIT DROP AS
SELECT t.*,
 ARRAY(SELECT split_part(coalesce(s.departure_station_urn,s.arrival_station_urn),'.',3)
  FROM public.manual_timetable_template_stops s WHERE s.template_id=t.id
  ORDER BY s.stop_sequence) AS source_stops
FROM public.manual_timetable_templates t
WHERE t.line_key='Oga' AND
 t.railway_urn='odpt.Railway:JR-East.Oga';
DO $before$
BEGIN
 IF (SELECT count(*) FROM _oga_source)<>52 OR
   (SELECT count(*) FROM _oga_source WHERE calendar_urn='odpt.Calendar:Weekday')<>23 OR
   (SELECT count(*) FROM _oga_source WHERE calendar_urn='odpt.Calendar:SaturdayHoliday')<>29 OR
   EXISTS(SELECT 1 FROM _oga_source WHERE
    vehicle_type_label<>'EV-E801系（ACCUM）' OR
    train_type_urn<>'odpt.TrainType:JR-East.Local' OR
    source_occurrence<>0 OR
    cardinality(source_stops)<>9 OR
    train_number !~ '^11[234][0-9]M$' OR
    (substring(train_number FROM '^([0-9]+)')::int%2)
     <>CASE WHEN direction_urn='odpt.RailDirection:Inbound' THEN 0 ELSE 1 END)
 THEN RAISE EXCEPTION 'Oga source templates or standard train model changed: investigate';
 END IF;
END $before$;
WITH published_numbers AS (
 SELECT n.num AS train_number,
  CASE WHEN (substring(n.num FROM '^([0-9]+)')::int%2)=0
   THEN 'odpt.RailDirection:Inbound'
   ELSE 'odpt.RailDirection:Outbound' END AS direction_urn
 FROM unnest(ARRAY[
  '1120M','1122M','1124M','1126M','1128M','1130M','1132M',
  '1134M','1136M','1138M','1140M','1142M','1144M','1146M','1148M',
  '1123M','1125M','1127M','1129M','1131M','1133M','1135M',
  '1137M','1139M','1141M','1143M','1145M','1147M','1149M'
 ]::text[]) AS n(num)
),
calendar_numbers AS (
 SELECT p.*,c.cal
 FROM published_numbers p CROSS JOIN
  (VALUES('odpt.Calendar:Weekday'),('odpt.Calendar:SaturdayHoliday')) c(cal)
)
INSERT INTO public.published_oga_2611_number_roster(
 edition,line_key,train_number,calendar_urn,direction_urn,train_type_urn,
 source_template_id,source_stop_keys,calendar_scope,
 excluded_dates,clock_change_dates,vehicle_model,png_reference,
 official_source_url)
SELECT
 '2611','Oga',p.train_number,p.cal,p.direction_urn,
 'odpt.TrainType:JR-East.Local',t.id,
 COALESCE(t.source_stops,'{}'::text[]),
 CASE WHEN t.id IS NULL THEN 'published_number_no_sql_source'
  ELSE 'sql_rail_service' END,
 CASE WHEN p.train_number IN('1130M','1132M','1134M',
  '1131M','1133M','1135M')
 THEN ARRAY['2026-11-05']::date[] ELSE '{}'::date[] END,
 CASE WHEN p.train_number='1145M'
 THEN ARRAY['2026-11-20']::date[] ELSE '{}'::date[] END,
 'EV-E801系',
 '../images/列车/JR東日本/JR東日本_EV-E801系.png',
 'https://timetables.jreast.co.jp/2611/timetable-v/259'||
 CASE WHEN p.direction_urn='odpt.RailDirection:Inbound'
  THEN 'u' ELSE 'd' END||
 CASE WHEN p.cal='odpt.Calendar:Weekday' THEN '1' ELSE '2' END||'.html'
FROM calendar_numbers p LEFT JOIN _oga_source t
 ON t.train_number=p.train_number AND t.calendar_urn=p.cal AND
 t.direction_urn=p.direction_urn
ON CONFLICT DO NOTHING;

INSERT INTO public.published_train_png_number_ranges(
 edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
 png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES('2611','Oga','oiwake_oga_regular_rail',1120,1149,'M',
 'EV-E801系','../images/列车/JR東日本/JR東日本_EV-E801系.png',
 'https://timetables.jreast.co.jp/2611/timetable-v/259u1.html',
 true,false)
ON CONFLICT DO NOTHING;
INSERT INTO public.published_train_number_evidence(
 edition,line_key,calendar_urn,direction_urn,train_number,
 source_template_id,official_source_url,verification_scope)
SELECT edition,line_key,calendar_urn,direction_urn,train_number,
 source_template_id,official_source_url,'train_number_only'
FROM public.published_oga_2611_number_roster
WHERE source_template_id IS NOT NULL
ON CONFLICT DO NOTHING;
DO $after$
BEGIN
 IF (SELECT count(*) FROM public.published_oga_2611_number_roster)<>58 OR
   (SELECT count(*) FROM public.published_oga_2611_number_roster
     WHERE calendar_scope='published_number_no_sql_source')<>6 OR
   (SELECT count(*) FROM public.published_oga_2611_number_roster
     WHERE calendar_scope='sql_rail_service')<>52 OR
   (SELECT count(*) FROM public.published_oga_2611_number_roster
     WHERE calendar_urn='odpt.Calendar:Weekday' AND
     calendar_scope='published_number_no_sql_source' AND
     train_number IN('1130M','1132M','1134M','1131M','1133M','1135M'))<>6 OR
   (SELECT count(*) FROM public.published_oga_2611_number_roster
     WHERE cardinality(clock_change_dates)=1)<>2 OR
   (SELECT count(*) FROM public.published_train_number_evidence
     WHERE line_key='Oga' AND edition='2611')<>52 OR
   (SELECT count(*) FROM public.published_train_png_number_ranges
     WHERE line_key='Oga' AND edition='2611')<>1
 THEN RAISE EXCEPTION 'Oga 2611 number/source evidence did not match review';
 END IF;
END $after$;
COMMIT;