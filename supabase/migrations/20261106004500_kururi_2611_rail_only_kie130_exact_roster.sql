-- JR East 久留里線 (Kururi) 2611 exact D-number/fleet PNG roster.
-- Timetable numbers are published for 40 trains, but the storm-closed
-- Kururi–KazusaKameyama rail section has replacement bus/taxi, NOT trains.
-- Official 2611: https://timetables.jreast.co.jp/2611/timetable-v/217d1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/217u1.html
-- Rail status: https://traininfo.jreast.co.jp/train_info/line.aspx?gid=1&lineid=kururiline
-- Fleet: https://www.jreast.co.jp/train/local/kiha_e130.html
-- Only actual OPEN RAIL segments are eligible for representative PNG;
-- old SQL stop clocks remain historical and are NOT 2611 verified clocks.
BEGIN;
SELECT pg_advisory_xact_lock(2611217);
CREATE TABLE IF NOT EXISTS public.published_kururi_2611_rail_vehicle_roster(
 edition text NOT NULL CHECK(edition='2611'),
 line_key text NOT NULL CHECK(line_key='Kururi'),
 train_number text NOT NULL CHECK(train_number ~ '^[0-9]+D$'),
 calendar_urn text NOT NULL CHECK(calendar_urn IN
  ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
 direction_urn text NOT NULL CHECK(direction_urn IN
  ('odpt.RailDirection:Inbound','odpt.RailDirection:Outbound')),
 train_type_urn text NOT NULL CHECK(train_type_urn='odpt.TrainType:JR-East.Local'),
 rail_scope text NOT NULL CHECK(rail_scope IN
  ('open_rail_only','trimmed_through_rail','closed_segment_only')),
 source_stop_keys text[] NOT NULL,
 rail_stop_keys text[] NOT NULL,
 fleet_model text,
 png_reference text,
 official_source_url text NOT NULL,
 fleet_source_url text NOT NULL,
 stop_clock_status text NOT NULL DEFAULT 'historical_not_2611_verified'
  CHECK(stop_clock_status='historical_not_2611_verified'),
 reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 PRIMARY KEY(edition,line_key,train_number,calendar_urn,direction_urn),
 CHECK (
  (rail_scope='closed_segment_only' AND cardinality(source_stop_keys)=4
   AND cardinality(rail_stop_keys)=0 AND fleet_model IS NULL AND png_reference IS NULL)
  OR
  (rail_scope IN('open_rail_only','trimmed_through_rail')
   AND cardinality(rail_stop_keys)=11
   AND cardinality(source_stop_keys)=
     CASE WHEN rail_scope='open_rail_only' THEN 11 ELSE 14 END
   AND fleet_model='キハE130形100番台'
   AND png_reference='../images/列车/JR東日本/JR東日本_キハE130系100番台.png'))
);
ALTER TABLE public.published_kururi_2611_rail_vehicle_roster ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_kururi_2611_rail_vehicle_roster IS
'JR East 2611 40 official numbers x 2 calendars. Open Kisarazu–Kururi rail: 34/day, closed-only 6/day; 11/day historical through rows cropped to 11 verified rail-side stations, with prior source stop clocks not re-certified as 2611. PNG is fleet illustration only.';
CREATE TEMP TABLE _kururi2611_numbers(n text PRIMARY KEY,dir text NOT NULL)
 ON COMMIT DROP;
INSERT INTO _kururi2611_numbers VALUES
 ('921D','Outbound'),('923D','Outbound'),('925D','Outbound'),
 ('927D','Outbound'),('929D','Outbound'),('931D','Outbound'),
 ('933D','Outbound'),('935D','Outbound'),('937D','Outbound'),
 ('939D','Outbound'),('941D','Outbound'),('2941D','Outbound'),
 ('943D','Outbound'),('2943D','Outbound'),('945D','Outbound'),
 ('947D','Outbound'),('949D','Outbound'),('2949D','Outbound'),
 ('951D','Outbound'),('953D','Outbound'),
 ('920D','Inbound'),('922D','Inbound'),('924D','Inbound'),
 ('926D','Inbound'),('928D','Inbound'),('930D','Inbound'),
 ('932D','Inbound'),('934D','Inbound'),('936D','Inbound'),
 ('938D','Inbound'),('940D','Inbound'),('942D','Inbound'),
 ('2944D','Inbound'),('944D','Inbound'),('2946D','Inbound'),
 ('946D','Inbound'),('948D','Inbound'),('950D','Inbound'),
 ('2952D','Inbound'),('952D','Inbound');
CREATE TEMP TABLE _kururi2611_source ON COMMIT DROP AS
WITH expected AS (
 SELECT
 ARRAY['Kisarazu','Gion','KazusaKiyokawa','HigashiKiyokawa',
 'Yokota','HigashiYokota','Makuta','Shimogori','Obitsu','Tawarada','Kururi']::text[] o,
 ARRAY['Kururi','Hirayama','KazusaMatsuoka','KazusaKameyama']::text[] c
), sourced AS (
 SELECT t.id,t.line_key,t.train_number,t.calendar_urn,t.direction_urn,t.train_type_urn,
 t.railway_urn,t.vehicle_type_label,n.dir,
 array_agg(split_part(coalesce(s.departure_station_urn,s.arrival_station_urn),'.',4)
  ORDER BY s.stop_sequence) raw_stops
 FROM public.manual_timetable_templates t
 JOIN _kururi2611_numbers n ON n.n=t.train_number
 JOIN public.manual_timetable_template_stops s ON s.template_id=t.id
 WHERE t.line_key='Kururi' AND t.railway_urn='odpt.Railway:JR-East.Kururi'
 GROUP BY t.id,n.dir
)
SELECT src.*, CASE
 WHEN src.dir='Outbound' THEN e.o ELSE
  ARRAY(SELECT v FROM unnest(e.o) WITH ORDINALITY AS x(v,i) ORDER BY i DESC)
 END AS expected_open,
 CASE WHEN src.dir='Outbound' THEN e.c ELSE
  ARRAY(SELECT v FROM unnest(e.c) WITH ORDINALITY AS x(v,i) ORDER BY i DESC)
 END AS expected_closed,
 CASE
 WHEN src.raw_stops=CASE WHEN src.dir='Outbound' THEN e.o ELSE
  ARRAY(SELECT v FROM unnest(e.o) WITH ORDINALITY AS x(v,i) ORDER BY i DESC) END
 THEN 'open_rail_only'
 WHEN src.raw_stops=CASE WHEN src.dir='Outbound' THEN e.o||e.c[2:4] ELSE
  ARRAY(SELECT v FROM unnest(e.c) WITH ORDINALITY AS x(v,i) ORDER BY i DESC)
  || ARRAY(SELECT v FROM unnest(e.o[1:10]) WITH ORDINALITY AS x(v,i) ORDER BY i DESC) END
 THEN 'trimmed_through_rail'
 WHEN src.raw_stops=CASE WHEN src.dir='Outbound' THEN e.c ELSE
  ARRAY(SELECT v FROM unnest(e.c) WITH ORDINALITY AS x(v,i) ORDER BY i DESC) END
 THEN 'closed_segment_only'
 ELSE 'unverified_route' END AS rail_scope
FROM sourced src CROSS JOIN expected e;
DO $verify$
BEGIN
 IF (SELECT count(*) FROM _kururi2611_numbers)<>40
 OR (SELECT count(*) FROM _kururi2611_numbers WHERE dir='Inbound')<>20
 OR (SELECT count(*) FROM _kururi2611_numbers WHERE dir='Outbound')<>20
 OR (SELECT count(*) FROM _kururi2611_source)<>80
 OR (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='Kururi')<>80
 OR (SELECT count(*) FROM _kururi2611_source WHERE rail_scope='open_rail_only')<>46
 OR (SELECT count(*) FROM _kururi2611_source WHERE rail_scope='trimmed_through_rail')<>22
 OR (SELECT count(*) FROM _kururi2611_source WHERE rail_scope='closed_segment_only')<>12
 OR EXISTS(SELECT 1 FROM _kururi2611_source src WHERE
 src.rail_scope='unverified_route' OR
 src.calendar_urn NOT IN('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday') OR
 src.direction_urn<>'odpt.RailDirection:'||src.dir OR
 src.train_type_urn<>'odpt.TrainType:JR-East.Local' OR
 src.vehicle_type_label<>'キハE130形100番台' OR
 (substring(src.train_number FROM '^[0-9]+')::int % 2)
   <>CASE WHEN src.dir='Inbound' THEN 0 ELSE 1 END)
 THEN RAISE EXCEPTION 'Kururi 2611 exact 40-number, 80-source, rail-route or calendar audit failed'; END IF;
END $verify$;
INSERT INTO public.published_kururi_2611_rail_vehicle_roster
(edition,line_key,train_number,calendar_urn,direction_urn,train_type_urn,
 rail_scope,source_stop_keys,rail_stop_keys,fleet_model,png_reference,
 official_source_url,fleet_source_url)
SELECT '2611','Kururi',t.train_number,t.calendar_urn,t.direction_urn,t.train_type_urn,
 t.rail_scope,t.raw_stops,
 CASE WHEN t.rail_scope='closed_segment_only' THEN '{}'::text[]
 ELSE t.expected_open END,
 CASE WHEN t.rail_scope='closed_segment_only' THEN NULL ELSE 'キハE130形100番台' END,
 CASE WHEN t.rail_scope='closed_segment_only' THEN NULL ELSE
 '../images/列车/JR東日本/JR東日本_キハE130系100番台.png' END,
 'https://timetables.jreast.co.jp/2611/timetable-v/217'||
 CASE WHEN t.dir='Outbound' THEN 'd' ELSE 'u' END||
 CASE WHEN t.calendar_urn='odpt.Calendar:Weekday' THEN '1' ELSE '2' END||'.html',
 'https://www.jreast.co.jp/train/local/kiha_e130.html'
FROM _kururi2611_source t ON CONFLICT DO NOTHING;
INSERT INTO public.published_train_png_number_ranges
(edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
 png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES('2611','Kururi','kisarazu_kururi_rail',920,953,'D',
 'キハE130形100番台',
 '../images/列车/JR東日本/JR東日本_キハE130系100番台.png',
 'https://timetables.jreast.co.jp/2611/timetable-v/217d1.html',
 true,false)
ON CONFLICT DO NOTHING;
INSERT INTO public.published_train_number_evidence
(edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,
 official_source_url,verification_scope)
SELECT '2611','Kururi',r.calendar_urn,r.direction_urn,r.train_number,t.id,
 r.official_source_url,'train_number_only'
FROM public.published_kururi_2611_rail_vehicle_roster r
JOIN public.manual_timetable_templates t ON
 t.line_key=r.line_key AND t.calendar_urn=r.calendar_urn AND
 t.train_number=r.train_number AND t.direction_urn=r.direction_urn
ON CONFLICT DO NOTHING;
DO $after$
BEGIN
 IF (SELECT count(*) FROM public.published_kururi_2611_rail_vehicle_roster)<>80
 OR (SELECT count(*) FROM public.published_kururi_2611_rail_vehicle_roster WHERE png_reference IS NOT NULL)<>68
 OR (SELECT count(*) FROM public.published_train_number_evidence WHERE edition='2611' AND line_key='Kururi')<>80
 THEN RAISE EXCEPTION 'Kururi 2611 saved roster and number evidence mismatch'; END IF;
END $after$;
COMMIT;
