-- Osaka Higashi (Osaka -- Kyuhoji, with through-rapid Nara): 2026-11.
-- Historic 379 source templates: 94 single-station Shin-Osaka fragments
-- already quarantined by train-runs; 282 source-only ordinary/through rapid
-- multi-stop rows, three other obsolete / unsupported M segments.
-- Official crosscheck: https://timetable.jr-odekake.net/line-timetable/2310?day=4&month=11&year=2026
-- https://timetable.jr-odekake.net/line-timetable/2311?day=4&month=11&year=2026
-- Official October/November train pages are used to check selected original
-- stop clocks, not to import an unlicensed complete published timetable.
-- 2023+ regular 221 family for Local and Direct Rapid is a FLEET REFERENCE,
-- never specific consist or permission to choose a gallery PNG.
BEGIN;
SELECT pg_advisory_xact_lock(26110721);
CREATE TABLE IF NOT EXISTS public.published_jrwest_osaka_higashi_2611_source_fleet (
 source_template_id bigint PRIMARY KEY REFERENCES public.manual_timetable_templates(id) ON DELETE CASCADE,
 edition text NOT NULL DEFAULT '2611' CHECK(edition='2611'),
 line_key text NOT NULL DEFAULT 'OsakaHigashi' CHECK(line_key='OsakaHigashi'),
 railway_urn text NOT NULL DEFAULT 'odpt.Railway:JR-West.OsakaHigashi'
  CHECK(railway_urn='odpt.Railway:JR-West.OsakaHigashi'),
 source_train_number text NOT NULL,
 historical_public_number text NOT NULL CHECK(historical_public_number ~ '^([0-9]{4}S|21[0-9]{2}M)$'),
 calendar_urn text NOT NULL CHECK(calendar_urn IN('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
 direction_urn text NOT NULL CHECK(direction_urn IN('odpt.RailDirection:Inbound','odpt.RailDirection:Outbound')),
 source_train_type_urn text NOT NULL DEFAULT 'odpt.TrainType:JR-West.Local'
    CHECK(source_train_type_urn='odpt.TrainType:JR-West.Local'),
 public_train_type text NOT NULL CHECK(public_train_type IN('Local','DirectRapid')),
 public_train_type_label text NOT NULL CHECK(public_train_type_label IN('普通','直通快速')),
 source_stop_count integer NOT NULL CHECK(source_stop_count IN(8,9,15)),
 source_stop_keys text[] NOT NULL CHECK(cardinality(source_stop_keys)=source_stop_count),
 source_stops_md5 text NOT NULL CHECK(source_stops_md5 ~ '^[0-9a-f]{32}$'),
 candidate_models text[] NOT NULL DEFAULT ARRAY['221系']::text[]
    CHECK(candidate_models=ARRAY['221系']::text[]),
 candidate_png_paths text[] NOT NULL DEFAULT ARRAY[]::text[]
    CHECK(candidate_png_paths=ARRAY[]::text[]),
 source_path text NOT NULL DEFAULT 'data/timetables/OsakaHigashi-manual.js'
    CHECK(source_path='data/timetables/OsakaHigashi-manual.js'),
 official_route_url text NOT NULL DEFAULT 'https://www.train-guide.westjr.co.jp/osakahigashi.html',
 rolling_stock_source_url text NOT NULL DEFAULT 'https://www.westjr.co.jp/fan/paper/local/',
 timetable_validity text NOT NULL DEFAULT 'undated_not_current_verified'
    CHECK(timetable_validity='undated_not_current_verified'),
 reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
 number_date_verified boolean NOT NULL DEFAULT false CHECK(NOT number_date_verified),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 authorizes_png boolean NOT NULL DEFAULT false CHECK(NOT authorizes_png),
 CHECK ((public_train_type='Local' AND public_train_type_label='普通'
   AND historical_public_number ~ '^[0-9]{4}S
 OR (public_train_type='DirectRapid' AND public_train_type_label='直通快速'
   AND historical_public_number ~ '^21[0-9]{2}M$' AND source_stop_count IN(8,9))),
 CHECK ((calendar_urn='odpt.Calendar:Weekday' AND source_train_number=historical_public_number)
 OR (calendar_urn='odpt.Calendar:SaturdayHoliday' AND source_train_number=historical_public_number||'H'))
);
ALTER TABLE public.published_jrwest_osaka_higashi_2611_source_fleet ENABLE ROW LEVEL SECURITY;

WITH original AS (
 SELECT m.id,m.train_number,m.calendar_urn,m.direction_urn,m.train_type_urn,
  count(*)::integer n,
  array_agg(split_part(coalesce(s.departure_station_urn,s.arrival_station_urn),'.',4)
    ORDER BY s.stop_sequence) keys,
  md5(string_agg(concat_ws('|',s.stop_sequence,
    coalesce(s.departure_station_urn,s.arrival_station_urn,''),
    coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),
    E'\n' ORDER BY s.stop_sequence)) hash
 FROM public.manual_timetable_templates m
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key='OsakaHigashi'
 AND m.railway_urn='odpt.Railway:JR-West.OsakaHigashi'
 AND m.source_path='data/timetables/OsakaHigashi-manual.js'
 AND m.source_occurrence=0 AND m.source_revision_date IS NULL
 AND m.vehicle_type_label IS NULL
 AND m.train_type_urn='odpt.TrainType:JR-West.Local'
 AND m.calendar_urn IN('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
 GROUP BY m.id
), selected AS(
 SELECT *,regexp_replace(train_number,'H$','') public_number
 FROM original WHERE
  (n IN(8,15) AND train_number ~ '^[0-9]{4}SH?
  OR (n IN(8,9) AND train_number ~ '^21[0-9]{2}MH?$')
)
INSERT INTO public.published_jrwest_osaka_higashi_2611_source_fleet
(source_template_id,source_train_number,historical_public_number,calendar_urn,
 direction_urn,source_train_type_urn,public_train_type,public_train_type_label,
 source_stop_count,source_stop_keys,source_stops_md5)
SELECT id,train_number,public_number,calendar_urn,direction_urn,train_type_urn,
 CASE WHEN public_number LIKE '%S' THEN 'Local' ELSE 'DirectRapid' END,
 CASE WHEN public_number LIKE '%S' THEN '普通' ELSE '直通快速' END,
 n,keys,hash FROM selected
ON CONFLICT(source_template_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.published_jrwest_osaka_higashi_2611_verified_source_clocks (
 source_template_id bigint PRIMARY KEY REFERENCES public.published_jrwest_osaka_higashi_2611_source_fleet(source_template_id) ON DELETE CASCADE,
 source_train_number text NOT NULL,
 published_train_number text NOT NULL,
 calendar_urn text NOT NULL,
 official_public_type text NOT NULL CHECK(official_public_type IN('Local','DirectRapid')),
 source_stop_count integer NOT NULL CHECK(source_stop_count IN(8,9,15)),
 source_stops_md5 text NOT NULL CHECK(source_stops_md5~'^[0-9a-f]{32}$'),
 official_source_url text NOT NULL CHECK(official_source_url LIKE 'https://timetable.jr-odekake.net/train-timetable/%'),
 observed_calendar_example_date date NOT NULL CHECK(observed_calendar_example_date BETWEEN date '2026-10-01' AND date '2026-11-30'),
 edition text NOT NULL DEFAULT '2611' CHECK(edition='2611'),
 valid_from date NOT NULL DEFAULT date '2026-11-01' CHECK(valid_from=date '2026-11-01'),
 valid_to date NOT NULL DEFAULT date '2026-11-30' CHECK(valid_to=date '2026-11-30'),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 authorizes_png boolean NOT NULL DEFAULT false CHECK(NOT authorizes_png),
 CHECK((source_train_number=published_train_number AND calendar_urn='odpt.Calendar:Weekday')
    OR (source_train_number=published_train_number||'H' AND calendar_urn='odpt.Calendar:SaturdayHoliday'))
);
ALTER TABLE public.published_jrwest_osaka_higashi_2611_verified_source_clocks ENABLE ROW LEVEL SECURITY;

WITH e(source_number,cal,public_number,public_type,stops,hash,source_url,observed) AS(VALUES
 ('2402S','Weekday','2402S','Local',15,'39fa1bae5813575c6add068672bffb55','https://timetable.jr-odekake.net/train-timetable/242121?date=20261023',date '2026-10-23'),
 ('2402SH','SaturdayHoliday','2402S','Local',15,'21806c63d131dc042a25f4c8a370f1fb','https://timetable.jr-odekake.net/train-timetable/242131?date=20261024',date '2026-10-24'),
 ('2101M','Weekday','2101M','DirectRapid',8,'a60413fc173fe8278139e39bee961fc6','https://timetable.jr-odekake.net/train-timetable/243201?date=20261028',date '2026-10-28'),
 ('2101MH','SaturdayHoliday','2101M','DirectRapid',8,'3961fb8206af5c52f57ff5c568c9a47f','https://timetable.jr-odekake.net/train-timetable/243211?date=20261031',date '2026-10-31'),
 ('2110M','Weekday','2110M','DirectRapid',9,'a01d2bb8fe4612072d3696d5f0ee3846','https://timetable.jr-odekake.net/train-timetable/323591?date=20261104',date '2026-11-04'),
 ('2110MH','SaturdayHoliday','2110M','DirectRapid',9,'3d10b876bdfe4305b0a77d24bce1baa2','https://timetable.jr-odekake.net/train-timetable/323441?date=20261017',date '2026-10-17')
)
INSERT INTO public.published_jrwest_osaka_higashi_2611_verified_source_clocks
(source_template_id,source_train_number,published_train_number,calendar_urn,
 official_public_type,source_stop_count,source_stops_md5,
 official_source_url,observed_calendar_example_date)
SELECT p.source_template_id,p.source_train_number,e.public_number,p.calendar_urn,
 e.public_type,e.stops,e.hash,e.source_url,e.observed
FROM public.published_jrwest_osaka_higashi_2611_source_fleet p
JOIN e ON p.source_train_number=e.source_number
  AND p.calendar_urn='odpt.Calendar:'||e.cal
  AND p.source_stop_count=e.stops AND p.source_stops_md5=e.hash
  AND p.historical_public_number=e.public_number
  AND p.public_train_type=e.public_type
ON CONFLICT (source_template_id) DO NOTHING;

CREATE OR REPLACE VIEW public.published_jrwest_osaka_higashi_2611_clock_evidence
WITH (security_invoker=true) AS
SELECT p.source_template_id,p.source_train_number,p.published_train_number,p.calendar_urn,
 p.official_public_type,p.source_stop_count,p.official_source_url,
 p.observed_calendar_example_date,p.valid_from,p.valid_to,p.actual_vehicle_confirmed,p.authorizes_png,
 (m.id IS NOT NULL AND m.line_key='OsakaHigashi'
  AND m.railway_urn='odpt.Railway:JR-West.OsakaHigashi'
  AND m.source_path='data/timetables/OsakaHigashi-manual.js'
  AND m.source_occurrence=0 AND m.source_revision_date IS NULL
  AND m.train_number=p.source_train_number AND m.calendar_urn=p.calendar_urn
  AND f.source_train_number=p.source_train_number
  AND f.historical_public_number=p.published_train_number
  AND f.public_train_type=p.official_public_type
  AND f.source_stops_md5=p.source_stops_md5
  AND o.stop_count=p.source_stop_count AND o.stop_hash=p.source_stops_md5
 ) AS verified_source_match
FROM public.published_jrwest_osaka_higashi_2611_verified_source_clocks p
LEFT JOIN public.published_jrwest_osaka_higashi_2611_source_fleet f ON f.source_template_id=p.source_template_id
LEFT JOIN public.manual_timetable_templates m ON m.id=p.source_template_id
LEFT JOIN LATERAL (
 SELECT count(*)::integer stop_count,md5(string_agg(concat_ws('|',s.stop_sequence,
    coalesce(s.departure_station_urn,s.arrival_station_urn,''),
    coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),E'\n' ORDER BY s.stop_sequence)) stop_hash
 FROM public.manual_timetable_template_stops s WHERE s.template_id=p.source_template_id
) o ON true;

DO $audit$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='OsakaHigashi')<>379
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_source_fleet)<>282
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_source_fleet WHERE public_train_type='Local')<>266
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_source_fleet WHERE public_train_type='DirectRapid')<>16
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_source_fleet WHERE calendar_urn='odpt.Calendar:Weekday')<>142
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_source_fleet WHERE calendar_urn='odpt.Calendar:SaturdayHoliday')<>140
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_verified_source_clocks)<>6
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_clock_evidence WHERE verified_source_match)<>6
 OR EXISTS(SELECT 1 FROM public.published_jrwest_osaka_higashi_2611_source_fleet
    WHERE actual_vehicle_confirmed OR authorizes_png OR cardinality(candidate_png_paths)<>0)
 THEN RAISE EXCEPTION 'Osaka Higashi 2611 source evidence mismatch: investigate before publication'; END IF;
END $audit$;
COMMIT;
 AND source_stop_count IN(8,15))
 OR (public_train_type='DirectRapid' AND public_train_type_label='直通快速'
   AND historical_public_number ~ '^21[0-9]{2}M$' AND source_stop_count IN(8,9))),
 CHECK ((calendar_urn='odpt.Calendar:Weekday' AND source_train_number=historical_public_number)
 OR (calendar_urn='odpt.Calendar:SaturdayHoliday' AND source_train_number=historical_public_number||'H'))
);
ALTER TABLE public.published_jrwest_osaka_higashi_2611_source_fleet ENABLE ROW LEVEL SECURITY;

WITH original AS (
 SELECT m.id,m.train_number,m.calendar_urn,m.direction_urn,m.train_type_urn,
  count(*)::integer n,
  array_agg(split_part(coalesce(s.departure_station_urn,s.arrival_station_urn),'.',4)
    ORDER BY s.stop_sequence) keys,
  md5(string_agg(concat_ws('|',s.stop_sequence,
    coalesce(s.departure_station_urn,s.arrival_station_urn,''),
    coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),
    E'\n' ORDER BY s.stop_sequence)) hash
 FROM public.manual_timetable_templates m
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key='OsakaHigashi'
 AND m.railway_urn='odpt.Railway:JR-West.OsakaHigashi'
 AND m.source_path='data/timetables/OsakaHigashi-manual.js'
 AND m.source_occurrence=0 AND m.source_revision_date IS NULL
 AND m.vehicle_type_label IS NULL
 AND m.train_type_urn='odpt.TrainType:JR-West.Local'
 AND m.calendar_urn IN('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
 GROUP BY m.id
), selected AS(
 SELECT *,regexp_replace(train_number,'H$','') public_number
 FROM original WHERE
  (n=15 AND train_number ~ '^[0-9]{4}SH?$')
  OR (n IN(8,9) AND train_number ~ '^21[0-9]{2}MH?$')
)
INSERT INTO public.published_jrwest_osaka_higashi_2611_source_fleet
(source_template_id,source_train_number,historical_public_number,calendar_urn,
 direction_urn,source_train_type_urn,public_train_type,public_train_type_label,
 source_stop_count,source_stop_keys,source_stops_md5)
SELECT id,train_number,public_number,calendar_urn,direction_urn,train_type_urn,
 CASE WHEN public_number LIKE '%S' THEN 'Local' ELSE 'DirectRapid' END,
 CASE WHEN public_number LIKE '%S' THEN '普通' ELSE '直通快速' END,
 n,keys,hash FROM selected
ON CONFLICT(source_template_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.published_jrwest_osaka_higashi_2611_verified_source_clocks (
 source_template_id bigint PRIMARY KEY REFERENCES public.published_jrwest_osaka_higashi_2611_source_fleet(source_template_id) ON DELETE CASCADE,
 source_train_number text NOT NULL,
 published_train_number text NOT NULL,
 calendar_urn text NOT NULL,
 official_public_type text NOT NULL CHECK(official_public_type IN('Local','DirectRapid')),
 source_stop_count integer NOT NULL CHECK(source_stop_count IN(8,9,15)),
 source_stops_md5 text NOT NULL CHECK(source_stops_md5~'^[0-9a-f]{32}$'),
 official_source_url text NOT NULL CHECK(official_source_url LIKE 'https://timetable.jr-odekake.net/train-timetable/%'),
 observed_calendar_example_date date NOT NULL CHECK(observed_calendar_example_date BETWEEN date '2026-10-01' AND date '2026-11-30'),
 edition text NOT NULL DEFAULT '2611' CHECK(edition='2611'),
 valid_from date NOT NULL DEFAULT date '2026-11-01' CHECK(valid_from=date '2026-11-01'),
 valid_to date NOT NULL DEFAULT date '2026-11-30' CHECK(valid_to=date '2026-11-30'),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 authorizes_png boolean NOT NULL DEFAULT false CHECK(NOT authorizes_png),
 CHECK((source_train_number=published_train_number AND calendar_urn='odpt.Calendar:Weekday')
    OR (source_train_number=published_train_number||'H' AND calendar_urn='odpt.Calendar:SaturdayHoliday'))
);
ALTER TABLE public.published_jrwest_osaka_higashi_2611_verified_source_clocks ENABLE ROW LEVEL SECURITY;

WITH e(source_number,cal,public_number,public_type,stops,hash,source_url,observed) AS(VALUES
 ('2402S','Weekday','2402S','Local',15,'39fa1bae5813575c6add068672bffb55','https://timetable.jr-odekake.net/train-timetable/242121?date=20261023',date '2026-10-23'),
 ('2402SH','SaturdayHoliday','2402S','Local',15,'21806c63d131dc042a25f4c8a370f1fb','https://timetable.jr-odekake.net/train-timetable/242131?date=20261024',date '2026-10-24'),
 ('2101M','Weekday','2101M','DirectRapid',8,'a60413fc173fe8278139e39bee961fc6','https://timetable.jr-odekake.net/train-timetable/243201?date=20261028',date '2026-10-28'),
 ('2101MH','SaturdayHoliday','2101M','DirectRapid',8,'3961fb8206af5c52f57ff5c568c9a47f','https://timetable.jr-odekake.net/train-timetable/243211?date=20261031',date '2026-10-31'),
 ('2110M','Weekday','2110M','DirectRapid',9,'a01d2bb8fe4612072d3696d5f0ee3846','https://timetable.jr-odekake.net/train-timetable/323591?date=20261104',date '2026-11-04'),
 ('2110MH','SaturdayHoliday','2110M','DirectRapid',9,'3d10b876bdfe4305b0a77d24bce1baa2','https://timetable.jr-odekake.net/train-timetable/323441?date=20261017',date '2026-10-17')
)
INSERT INTO public.published_jrwest_osaka_higashi_2611_verified_source_clocks
(source_template_id,source_train_number,published_train_number,calendar_urn,
 official_public_type,source_stop_count,source_stops_md5,
 official_source_url,observed_calendar_example_date)
SELECT p.source_template_id,p.source_train_number,e.public_number,p.calendar_urn,
 e.public_type,e.stops,e.hash,e.source_url,e.observed
FROM public.published_jrwest_osaka_higashi_2611_source_fleet p
JOIN e ON p.source_train_number=e.source_number
  AND p.calendar_urn='odpt.Calendar:'||e.cal
  AND p.source_stop_count=e.stops AND p.source_stops_md5=e.hash
  AND p.historical_public_number=e.public_number
  AND p.public_train_type=e.public_type
ON CONFLICT (source_template_id) DO NOTHING;

CREATE OR REPLACE VIEW public.published_jrwest_osaka_higashi_2611_clock_evidence
WITH (security_invoker=true) AS
SELECT p.source_template_id,p.source_train_number,p.published_train_number,p.calendar_urn,
 p.official_public_type,p.source_stop_count,p.official_source_url,
 p.observed_calendar_example_date,p.valid_from,p.valid_to,p.actual_vehicle_confirmed,p.authorizes_png,
 (m.id IS NOT NULL AND m.line_key='OsakaHigashi'
  AND m.railway_urn='odpt.Railway:JR-West.OsakaHigashi'
  AND m.source_path='data/timetables/OsakaHigashi-manual.js'
  AND m.source_occurrence=0 AND m.source_revision_date IS NULL
  AND m.train_number=p.source_train_number AND m.calendar_urn=p.calendar_urn
  AND f.source_train_number=p.source_train_number
  AND f.historical_public_number=p.published_train_number
  AND f.public_train_type=p.official_public_type
  AND f.source_stops_md5=p.source_stops_md5
  AND o.stop_count=p.source_stop_count AND o.stop_hash=p.source_stops_md5
 ) AS verified_source_match
FROM public.published_jrwest_osaka_higashi_2611_verified_source_clocks p
LEFT JOIN public.published_jrwest_osaka_higashi_2611_source_fleet f ON f.source_template_id=p.source_template_id
LEFT JOIN public.manual_timetable_templates m ON m.id=p.source_template_id
LEFT JOIN LATERAL (
 SELECT count(*)::integer stop_count,md5(string_agg(concat_ws('|',s.stop_sequence,
    coalesce(s.departure_station_urn,s.arrival_station_urn,''),
    coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),E'\n' ORDER BY s.stop_sequence)) stop_hash
 FROM public.manual_timetable_template_stops s WHERE s.template_id=p.source_template_id
) o ON true;

DO $audit$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='OsakaHigashi')<>379
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_source_fleet)<>282
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_source_fleet WHERE public_train_type='Local')<>266
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_source_fleet WHERE public_train_type='DirectRapid')<>16
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_source_fleet WHERE calendar_urn='odpt.Calendar:Weekday')<>142
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_source_fleet WHERE calendar_urn='odpt.Calendar:SaturdayHoliday')<>140
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_verified_source_clocks)<>6
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_clock_evidence WHERE verified_source_match)<>6
 OR EXISTS(SELECT 1 FROM public.published_jrwest_osaka_higashi_2611_source_fleet
    WHERE actual_vehicle_confirmed OR authorizes_png OR cardinality(candidate_png_paths)<>0)
 THEN RAISE EXCEPTION 'Osaka Higashi 2611 source evidence mismatch: investigate before publication'; END IF;
END $audit$;
COMMIT;
)
  OR (n IN(8,9) AND train_number ~ '^21[0-9]{2}MH?$')
)
INSERT INTO public.published_jrwest_osaka_higashi_2611_source_fleet
(source_template_id,source_train_number,historical_public_number,calendar_urn,
 direction_urn,source_train_type_urn,public_train_type,public_train_type_label,
 source_stop_count,source_stop_keys,source_stops_md5)
SELECT id,train_number,public_number,calendar_urn,direction_urn,train_type_urn,
 CASE WHEN public_number LIKE '%S' THEN 'Local' ELSE 'DirectRapid' END,
 CASE WHEN public_number LIKE '%S' THEN '普通' ELSE '直通快速' END,
 n,keys,hash FROM selected
ON CONFLICT(source_template_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.published_jrwest_osaka_higashi_2611_verified_source_clocks (
 source_template_id bigint PRIMARY KEY REFERENCES public.published_jrwest_osaka_higashi_2611_source_fleet(source_template_id) ON DELETE CASCADE,
 source_train_number text NOT NULL,
 published_train_number text NOT NULL,
 calendar_urn text NOT NULL,
 official_public_type text NOT NULL CHECK(official_public_type IN('Local','DirectRapid')),
 source_stop_count integer NOT NULL CHECK(source_stop_count IN(8,9,15)),
 source_stops_md5 text NOT NULL CHECK(source_stops_md5~'^[0-9a-f]{32}$'),
 official_source_url text NOT NULL CHECK(official_source_url LIKE 'https://timetable.jr-odekake.net/train-timetable/%'),
 observed_calendar_example_date date NOT NULL CHECK(observed_calendar_example_date BETWEEN date '2026-10-01' AND date '2026-11-30'),
 edition text NOT NULL DEFAULT '2611' CHECK(edition='2611'),
 valid_from date NOT NULL DEFAULT date '2026-11-01' CHECK(valid_from=date '2026-11-01'),
 valid_to date NOT NULL DEFAULT date '2026-11-30' CHECK(valid_to=date '2026-11-30'),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 authorizes_png boolean NOT NULL DEFAULT false CHECK(NOT authorizes_png),
 CHECK((source_train_number=published_train_number AND calendar_urn='odpt.Calendar:Weekday')
    OR (source_train_number=published_train_number||'H' AND calendar_urn='odpt.Calendar:SaturdayHoliday'))
);
ALTER TABLE public.published_jrwest_osaka_higashi_2611_verified_source_clocks ENABLE ROW LEVEL SECURITY;

WITH e(source_number,cal,public_number,public_type,stops,hash,source_url,observed) AS(VALUES
 ('2402S','Weekday','2402S','Local',15,'39fa1bae5813575c6add068672bffb55','https://timetable.jr-odekake.net/train-timetable/242121?date=20261023',date '2026-10-23'),
 ('2402SH','SaturdayHoliday','2402S','Local',15,'21806c63d131dc042a25f4c8a370f1fb','https://timetable.jr-odekake.net/train-timetable/242131?date=20261024',date '2026-10-24'),
 ('2101M','Weekday','2101M','DirectRapid',8,'a60413fc173fe8278139e39bee961fc6','https://timetable.jr-odekake.net/train-timetable/243201?date=20261028',date '2026-10-28'),
 ('2101MH','SaturdayHoliday','2101M','DirectRapid',8,'3961fb8206af5c52f57ff5c568c9a47f','https://timetable.jr-odekake.net/train-timetable/243211?date=20261031',date '2026-10-31'),
 ('2110M','Weekday','2110M','DirectRapid',9,'a01d2bb8fe4612072d3696d5f0ee3846','https://timetable.jr-odekake.net/train-timetable/323591?date=20261104',date '2026-11-04'),
 ('2110MH','SaturdayHoliday','2110M','DirectRapid',9,'3d10b876bdfe4305b0a77d24bce1baa2','https://timetable.jr-odekake.net/train-timetable/323441?date=20261017',date '2026-10-17')
)
INSERT INTO public.published_jrwest_osaka_higashi_2611_verified_source_clocks
(source_template_id,source_train_number,published_train_number,calendar_urn,
 official_public_type,source_stop_count,source_stops_md5,
 official_source_url,observed_calendar_example_date)
SELECT p.source_template_id,p.source_train_number,e.public_number,p.calendar_urn,
 e.public_type,e.stops,e.hash,e.source_url,e.observed
FROM public.published_jrwest_osaka_higashi_2611_source_fleet p
JOIN e ON p.source_train_number=e.source_number
  AND p.calendar_urn='odpt.Calendar:'||e.cal
  AND p.source_stop_count=e.stops AND p.source_stops_md5=e.hash
  AND p.historical_public_number=e.public_number
  AND p.public_train_type=e.public_type
ON CONFLICT (source_template_id) DO NOTHING;

CREATE OR REPLACE VIEW public.published_jrwest_osaka_higashi_2611_clock_evidence
WITH (security_invoker=true) AS
SELECT p.source_template_id,p.source_train_number,p.published_train_number,p.calendar_urn,
 p.official_public_type,p.source_stop_count,p.official_source_url,
 p.observed_calendar_example_date,p.valid_from,p.valid_to,p.actual_vehicle_confirmed,p.authorizes_png,
 (m.id IS NOT NULL AND m.line_key='OsakaHigashi'
  AND m.railway_urn='odpt.Railway:JR-West.OsakaHigashi'
  AND m.source_path='data/timetables/OsakaHigashi-manual.js'
  AND m.source_occurrence=0 AND m.source_revision_date IS NULL
  AND m.train_number=p.source_train_number AND m.calendar_urn=p.calendar_urn
  AND f.source_train_number=p.source_train_number
  AND f.historical_public_number=p.published_train_number
  AND f.public_train_type=p.official_public_type
  AND f.source_stops_md5=p.source_stops_md5
  AND o.stop_count=p.source_stop_count AND o.stop_hash=p.source_stops_md5
 ) AS verified_source_match
FROM public.published_jrwest_osaka_higashi_2611_verified_source_clocks p
LEFT JOIN public.published_jrwest_osaka_higashi_2611_source_fleet f ON f.source_template_id=p.source_template_id
LEFT JOIN public.manual_timetable_templates m ON m.id=p.source_template_id
LEFT JOIN LATERAL (
 SELECT count(*)::integer stop_count,md5(string_agg(concat_ws('|',s.stop_sequence,
    coalesce(s.departure_station_urn,s.arrival_station_urn,''),
    coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),E'\n' ORDER BY s.stop_sequence)) stop_hash
 FROM public.manual_timetable_template_stops s WHERE s.template_id=p.source_template_id
) o ON true;

DO $audit$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='OsakaHigashi')<>379
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_source_fleet)<>282
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_source_fleet WHERE public_train_type='Local')<>266
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_source_fleet WHERE public_train_type='DirectRapid')<>16
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_source_fleet WHERE calendar_urn='odpt.Calendar:Weekday')<>142
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_source_fleet WHERE calendar_urn='odpt.Calendar:SaturdayHoliday')<>140
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_verified_source_clocks)<>6
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_clock_evidence WHERE verified_source_match)<>6
 OR EXISTS(SELECT 1 FROM public.published_jrwest_osaka_higashi_2611_source_fleet
    WHERE actual_vehicle_confirmed OR authorizes_png OR cardinality(candidate_png_paths)<>0)
 THEN RAISE EXCEPTION 'Osaka Higashi 2611 source evidence mismatch: investigate before publication'; END IF;
END $audit$;
COMMIT;
 AND source_stop_count IN(8,15))
 OR (public_train_type='DirectRapid' AND public_train_type_label='直通快速'
   AND historical_public_number ~ '^21[0-9]{2}M$' AND source_stop_count IN(8,9))),
 CHECK ((calendar_urn='odpt.Calendar:Weekday' AND source_train_number=historical_public_number)
 OR (calendar_urn='odpt.Calendar:SaturdayHoliday' AND source_train_number=historical_public_number||'H'))
);
ALTER TABLE public.published_jrwest_osaka_higashi_2611_source_fleet ENABLE ROW LEVEL SECURITY;

WITH original AS (
 SELECT m.id,m.train_number,m.calendar_urn,m.direction_urn,m.train_type_urn,
  count(*)::integer n,
  array_agg(split_part(coalesce(s.departure_station_urn,s.arrival_station_urn),'.',4)
    ORDER BY s.stop_sequence) keys,
  md5(string_agg(concat_ws('|',s.stop_sequence,
    coalesce(s.departure_station_urn,s.arrival_station_urn,''),
    coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),
    E'\n' ORDER BY s.stop_sequence)) hash
 FROM public.manual_timetable_templates m
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key='OsakaHigashi'
 AND m.railway_urn='odpt.Railway:JR-West.OsakaHigashi'
 AND m.source_path='data/timetables/OsakaHigashi-manual.js'
 AND m.source_occurrence=0 AND m.source_revision_date IS NULL
 AND m.vehicle_type_label IS NULL
 AND m.train_type_urn='odpt.TrainType:JR-West.Local'
 AND m.calendar_urn IN('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
 GROUP BY m.id
), selected AS(
 SELECT *,regexp_replace(train_number,'H$','') public_number
 FROM original WHERE
  (n=15 AND train_number ~ '^[0-9]{4}SH?$')
  OR (n IN(8,9) AND train_number ~ '^21[0-9]{2}MH?$')
)
INSERT INTO public.published_jrwest_osaka_higashi_2611_source_fleet
(source_template_id,source_train_number,historical_public_number,calendar_urn,
 direction_urn,source_train_type_urn,public_train_type,public_train_type_label,
 source_stop_count,source_stop_keys,source_stops_md5)
SELECT id,train_number,public_number,calendar_urn,direction_urn,train_type_urn,
 CASE WHEN public_number LIKE '%S' THEN 'Local' ELSE 'DirectRapid' END,
 CASE WHEN public_number LIKE '%S' THEN '普通' ELSE '直通快速' END,
 n,keys,hash FROM selected
ON CONFLICT(source_template_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.published_jrwest_osaka_higashi_2611_verified_source_clocks (
 source_template_id bigint PRIMARY KEY REFERENCES public.published_jrwest_osaka_higashi_2611_source_fleet(source_template_id) ON DELETE CASCADE,
 source_train_number text NOT NULL,
 published_train_number text NOT NULL,
 calendar_urn text NOT NULL,
 official_public_type text NOT NULL CHECK(official_public_type IN('Local','DirectRapid')),
 source_stop_count integer NOT NULL CHECK(source_stop_count IN(8,9,15)),
 source_stops_md5 text NOT NULL CHECK(source_stops_md5~'^[0-9a-f]{32}$'),
 official_source_url text NOT NULL CHECK(official_source_url LIKE 'https://timetable.jr-odekake.net/train-timetable/%'),
 observed_calendar_example_date date NOT NULL CHECK(observed_calendar_example_date BETWEEN date '2026-10-01' AND date '2026-11-30'),
 edition text NOT NULL DEFAULT '2611' CHECK(edition='2611'),
 valid_from date NOT NULL DEFAULT date '2026-11-01' CHECK(valid_from=date '2026-11-01'),
 valid_to date NOT NULL DEFAULT date '2026-11-30' CHECK(valid_to=date '2026-11-30'),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 authorizes_png boolean NOT NULL DEFAULT false CHECK(NOT authorizes_png),
 CHECK((source_train_number=published_train_number AND calendar_urn='odpt.Calendar:Weekday')
    OR (source_train_number=published_train_number||'H' AND calendar_urn='odpt.Calendar:SaturdayHoliday'))
);
ALTER TABLE public.published_jrwest_osaka_higashi_2611_verified_source_clocks ENABLE ROW LEVEL SECURITY;

WITH e(source_number,cal,public_number,public_type,stops,hash,source_url,observed) AS(VALUES
 ('2402S','Weekday','2402S','Local',15,'39fa1bae5813575c6add068672bffb55','https://timetable.jr-odekake.net/train-timetable/242121?date=20261023',date '2026-10-23'),
 ('2402SH','SaturdayHoliday','2402S','Local',15,'21806c63d131dc042a25f4c8a370f1fb','https://timetable.jr-odekake.net/train-timetable/242131?date=20261024',date '2026-10-24'),
 ('2101M','Weekday','2101M','DirectRapid',8,'a60413fc173fe8278139e39bee961fc6','https://timetable.jr-odekake.net/train-timetable/243201?date=20261028',date '2026-10-28'),
 ('2101MH','SaturdayHoliday','2101M','DirectRapid',8,'3961fb8206af5c52f57ff5c568c9a47f','https://timetable.jr-odekake.net/train-timetable/243211?date=20261031',date '2026-10-31'),
 ('2110M','Weekday','2110M','DirectRapid',9,'a01d2bb8fe4612072d3696d5f0ee3846','https://timetable.jr-odekake.net/train-timetable/323591?date=20261104',date '2026-11-04'),
 ('2110MH','SaturdayHoliday','2110M','DirectRapid',9,'3d10b876bdfe4305b0a77d24bce1baa2','https://timetable.jr-odekake.net/train-timetable/323441?date=20261017',date '2026-10-17')
)
INSERT INTO public.published_jrwest_osaka_higashi_2611_verified_source_clocks
(source_template_id,source_train_number,published_train_number,calendar_urn,
 official_public_type,source_stop_count,source_stops_md5,
 official_source_url,observed_calendar_example_date)
SELECT p.source_template_id,p.source_train_number,e.public_number,p.calendar_urn,
 e.public_type,e.stops,e.hash,e.source_url,e.observed
FROM public.published_jrwest_osaka_higashi_2611_source_fleet p
JOIN e ON p.source_train_number=e.source_number
  AND p.calendar_urn='odpt.Calendar:'||e.cal
  AND p.source_stop_count=e.stops AND p.source_stops_md5=e.hash
  AND p.historical_public_number=e.public_number
  AND p.public_train_type=e.public_type
ON CONFLICT (source_template_id) DO NOTHING;

CREATE OR REPLACE VIEW public.published_jrwest_osaka_higashi_2611_clock_evidence
WITH (security_invoker=true) AS
SELECT p.source_template_id,p.source_train_number,p.published_train_number,p.calendar_urn,
 p.official_public_type,p.source_stop_count,p.official_source_url,
 p.observed_calendar_example_date,p.valid_from,p.valid_to,p.actual_vehicle_confirmed,p.authorizes_png,
 (m.id IS NOT NULL AND m.line_key='OsakaHigashi'
  AND m.railway_urn='odpt.Railway:JR-West.OsakaHigashi'
  AND m.source_path='data/timetables/OsakaHigashi-manual.js'
  AND m.source_occurrence=0 AND m.source_revision_date IS NULL
  AND m.train_number=p.source_train_number AND m.calendar_urn=p.calendar_urn
  AND f.source_train_number=p.source_train_number
  AND f.historical_public_number=p.published_train_number
  AND f.public_train_type=p.official_public_type
  AND f.source_stops_md5=p.source_stops_md5
  AND o.stop_count=p.source_stop_count AND o.stop_hash=p.source_stops_md5
 ) AS verified_source_match
FROM public.published_jrwest_osaka_higashi_2611_verified_source_clocks p
LEFT JOIN public.published_jrwest_osaka_higashi_2611_source_fleet f ON f.source_template_id=p.source_template_id
LEFT JOIN public.manual_timetable_templates m ON m.id=p.source_template_id
LEFT JOIN LATERAL (
 SELECT count(*)::integer stop_count,md5(string_agg(concat_ws('|',s.stop_sequence,
    coalesce(s.departure_station_urn,s.arrival_station_urn,''),
    coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),E'\n' ORDER BY s.stop_sequence)) stop_hash
 FROM public.manual_timetable_template_stops s WHERE s.template_id=p.source_template_id
) o ON true;

DO $audit$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='OsakaHigashi')<>379
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_source_fleet)<>282
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_source_fleet WHERE public_train_type='Local')<>266
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_source_fleet WHERE public_train_type='DirectRapid')<>16
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_source_fleet WHERE calendar_urn='odpt.Calendar:Weekday')<>142
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_source_fleet WHERE calendar_urn='odpt.Calendar:SaturdayHoliday')<>140
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_verified_source_clocks)<>6
 OR (SELECT count(*) FROM public.published_jrwest_osaka_higashi_2611_clock_evidence WHERE verified_source_match)<>6
 OR EXISTS(SELECT 1 FROM public.published_jrwest_osaka_higashi_2611_source_fleet
    WHERE actual_vehicle_confirmed OR authorizes_png OR cardinality(candidate_png_paths)<>0)
 THEN RAISE EXCEPTION 'Osaka Higashi 2611 source evidence mismatch: investigate before publication'; END IF;
END $audit$;
COMMIT;
