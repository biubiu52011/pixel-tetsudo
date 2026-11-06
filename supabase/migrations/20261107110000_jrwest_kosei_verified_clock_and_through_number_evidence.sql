-- JR-West 2611: validated ORIGINAL Kosei source clocks, and separated
-- official through-service train-number references for Kyoto/Kobe/Kosei.
-- No timetable is copied into this migration. Eight old local SOURCE
-- records were independently compared station-by-station to the
-- 2026-11 issue pages; only checksums and provenance are persisted.
-- Caveat: JR timetable pages prohibit reproducing their complete tables.
-- The train-number-chain references have NO stop-clock or PNG authority.
BEGIN;
SELECT pg_advisory_xact_lock(26110711);
CREATE TABLE IF NOT EXISTS public.published_jrwest_kosei_2611_verified_source_clocks(
 source_template_id bigint PRIMARY KEY REFERENCES public.manual_timetable_templates(id) ON DELETE CASCADE,
 edition text NOT NULL DEFAULT '2611' CHECK(edition='2611'),
 line_key text NOT NULL DEFAULT 'Kosei' CHECK(line_key='Kosei'),
 source_train_number text NOT NULL CHECK(source_train_number ~ '^180[2468]MH?$'),
 published_train_number text NOT NULL CHECK(published_train_number ~ '^180[2468]M$'),
 calendar_urn text NOT NULL CHECK(calendar_urn IN ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
 direction_urn text NOT NULL DEFAULT 'odpt.RailDirection:Outbound' CHECK(direction_urn='odpt.RailDirection:Outbound'),
 stop_count integer NOT NULL DEFAULT 18 CHECK(stop_count=18),
 source_stops_md5 text NOT NULL CHECK(source_stops_md5 ~ '^[a-f0-9]{32}$'),
 official_source_url text NOT NULL CHECK(official_source_url LIKE 'https://timetable.jr-odekake.net/train-timetable/%'),
 official_issue text NOT NULL DEFAULT '2026-11' CHECK(official_issue='2026-11'),
 valid_from date NOT NULL DEFAULT DATE '2026-11-01' CHECK(valid_from=DATE '2026-11-01'),
 valid_to date NOT NULL DEFAULT DATE '2026-11-30' CHECK(valid_to=DATE '2026-11-30'),
 source_clock_verification text NOT NULL DEFAULT 'original_18_stops_compared_with_official'
    CHECK(source_clock_verification='original_18_stops_compared_with_official'),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 authorizes_png boolean NOT NULL DEFAULT false CHECK(NOT authorizes_png),
 UNIQUE(edition,calendar_urn,published_train_number),
 CHECK ((calendar_urn='odpt.Calendar:Weekday' AND source_train_number=published_train_number)
   OR (calendar_urn='odpt.Calendar:SaturdayHoliday' AND source_train_number=published_train_number||'H'))
);
ALTER TABLE public.published_jrwest_kosei_2611_verified_source_clocks ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_jrwest_kosei_2611_verified_source_clocks IS
'8 original full-stop 2026-11 Kosei locals validated against JR-West: source clock checksum only, M is public number and MH is an internal holiday marker; no vehicle formation or PNG proof.';
WITH v(source_train_number,daykind,hash,official_id,query_day) AS (VALUES
('1802M','Weekday','342a34ea099c46bd807ac3be32ddc04b','322261','20261023'),
('1802MH','SaturdayHoliday','342a34ea099c46bd807ac3be32ddc04b','322421','20261031'),
('1804M','Weekday','c9a68d9d017ef85ab3fc3a71a0f88cca','15881','20261104'),
('1804MH','SaturdayHoliday','e62ee3438c828fd4d4283aa94eafe752','15891','20261101'),
('1806M','Weekday','87258fe27f530047b175a6a9076abb6b','15941','20261104'),
('1806MH','SaturdayHoliday','f5306e4437c987b915324df3cf6132dd','15951','20261018'),
('1808M','Weekday','365f27c3b22992a487f453a121606d1a','322441','20261023'),
('1808MH','SaturdayHoliday','a78e1bd3aaa3063b83602439deeab735','322451','20261024')
), verified AS (
 SELECT m.id,m.train_number,m.calendar_urn,m.direction_urn,
        md5(string_agg(concat_ws('|',s.stop_sequence,
          coalesce(s.departure_station_urn,s.arrival_station_urn,''),
          coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),
          E'\n' ORDER BY s.stop_sequence)) actual_hash,
        count(*) stop_count
 FROM public.manual_timetable_templates m
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key='Kosei' AND m.railway_urn='odpt.Railway:JR-West.Kosei'
   AND m.source_path='data/timetables/Kosei-manual.js'
   AND m.source_occurrence=0 AND m.source_revision_date IS NULL
   AND m.train_type_urn='odpt.TrainType:JR-West.Local'
   AND m.direction_urn='odpt.RailDirection:Outbound'
 GROUP BY m.id,m.train_number,m.calendar_urn,m.direction_urn
)
INSERT INTO public.published_jrwest_kosei_2611_verified_source_clocks
 (source_template_id,source_train_number,published_train_number,calendar_urn,
  source_stops_md5,official_source_url)
SELECT s.id,v.source_train_number,regexp_replace(v.source_train_number,'H$',''),
  s.calendar_urn,v.hash,
  'https://timetable.jr-odekake.net/train-timetable/'||v.official_id||'?date='||v.query_day
FROM v JOIN verified s ON s.train_number=v.source_train_number
 AND s.calendar_urn='odpt.Calendar:'||v.daykind
 AND s.actual_hash=v.hash AND s.stop_count=18
ON CONFLICT (source_template_id) DO NOTHING;

-- Read-only evidence gate: alterations to ANY original stop, clock,
-- calendar, or number invalidate confirmation before the Edge owner reads it.
CREATE OR REPLACE VIEW public.published_jrwest_kosei_2611_clock_evidence
WITH (security_invoker=true) AS
SELECT p.source_template_id,p.source_train_number,p.published_train_number,
 p.calendar_urn,p.direction_urn,p.official_source_url,p.valid_from,p.valid_to,
 p.actual_vehicle_confirmed,p.authorizes_png,
 (s.id IS NOT NULL
  AND s.train_number=p.source_train_number
  AND s.calendar_urn=p.calendar_urn
  AND s.direction_urn=p.direction_urn
  AND s.source_path='data/timetables/Kosei-manual.js'
  AND s.source_revision_date IS NULL
  AND x.stop_count=p.stop_count AND x.actual_hash=p.source_stops_md5) AS verified_source_match
FROM public.published_jrwest_kosei_2611_verified_source_clocks p
LEFT JOIN public.manual_timetable_templates s ON s.id=p.source_template_id
LEFT JOIN LATERAL (
 SELECT count(*)::integer stop_count,
 md5(string_agg(concat_ws('|',st.stop_sequence,
   coalesce(st.departure_station_urn,st.arrival_station_urn,''),
   coalesce(st.arrival_clock,'∅'),coalesce(st.departure_clock,'∅')),
   E'\n' ORDER BY st.stop_sequence)) actual_hash
 FROM public.manual_timetable_template_stops st WHERE st.template_id=p.source_template_id
) x ON true;

-- Separate public train-number evidence; NOT a source of phantom positions.
-- Official service 3107M changes to 3507M at Omiimazu.
-- The same 3507M continues via Kyoto/Osaka/Kobe to Aboshi.
-- 3479M is a Biwako-Kyoto-Kobe-Sanyo through train; do not deduce
-- any legacy composite source-ID identity from these public numbers.
CREATE TABLE IF NOT EXISTS public.published_jrwest_2611_crossline_number_reference(
 line_key text NOT NULL CHECK(line_key IN ('Kosei','TokaidoKansai','SanyoMain')),
 published_train_number text NOT NULL CHECK(published_train_number ~ '^[0-9]{4}M$'),
 calendar_scope text NOT NULL CHECK(calendar_scope IN ('daily','saturday_holiday')),
 train_type text NOT NULL CHECK(train_type IN ('SpecialRapid','LimitedExpress')),
 segment_from text NOT NULL,segment_to text NOT NULL,
 continuous_service_key text NOT NULL,
 official_source_url text NOT NULL CHECK(official_source_url LIKE 'https://timetable.jr-odekake.net/train-timetable/%'),
 observed_date date NOT NULL CHECK(observed_date BETWEEN DATE '2026-11-01' AND DATE '2026-11-30'),
 timetable_issue text NOT NULL DEFAULT '2026-11' CHECK(timetable_issue='2026-11'),
 number_date_verified boolean NOT NULL DEFAULT true CHECK(number_date_verified),
 stop_clocks_verified boolean NOT NULL DEFAULT false CHECK(NOT stop_clocks_verified),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 authorizes_png boolean NOT NULL DEFAULT false CHECK(NOT authorizes_png),
 authorizes_position boolean NOT NULL DEFAULT false CHECK(NOT authorizes_position),
 PRIMARY KEY(line_key,published_train_number,calendar_scope)
);
ALTER TABLE public.published_jrwest_2611_crossline_number_reference ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_jrwest_2611_crossline_number_reference IS
'8 verified JR-West 2611 number/line segment references, non-positional, no vehicle PNG; 3107M -> 3507M changes number at Omiimazu; no guessed chain via close times.';
WITH v(line_key,published_train_number,calendar_scope,train_type,
 segment_from,segment_to,continuous_service_key,official_id,query_day) AS (VALUES
('TokaidoKansai','3479M','saturday_holiday','SpecialRapid','Kyoto','Kobe','biwako-himeji-3479','208221','20261107'),
('SanyoMain','3479M','saturday_holiday','SpecialRapid','Hyougo','Himeji','biwako-himeji-3479','208221','20261107'),
('Kosei','3107M','daily','SpecialRapid','Omi-Shiotsu','Oumiimazu','tsuruga-aboshi-3107-3507','145282','20261107'),
('Kosei','3507M','saturday_holiday','SpecialRapid','Oumiimazu','Yamashina','tsuruga-aboshi-3107-3507','145282','20261107'),
('TokaidoKansai','3507M','saturday_holiday','SpecialRapid','Kyoto','Kobe','tsuruga-aboshi-3107-3507','145282','20261107'),
('SanyoMain','3507M','saturday_holiday','SpecialRapid','Hyougo','Amiboshi','tsuruga-aboshi-3107-3507','145282','20261107'),
('Kosei','4006M','daily','LimitedExpress','Tsuruga','Kyoto','thunderbird-6','258161','20261103'),
('TokaidoKansai','4006M','daily','LimitedExpress','Kyoto','Osaka','thunderbird-6','258161','20261103')
)
INSERT INTO public.published_jrwest_2611_crossline_number_reference
(line_key,published_train_number,calendar_scope,train_type,segment_from,
 segment_to,continuous_service_key,official_source_url,observed_date)
SELECT line_key,published_train_number,calendar_scope,train_type,segment_from,
 segment_to,continuous_service_key,
 'https://timetable.jr-odekake.net/train-timetable/'||official_id||'?date='||query_day,
 to_date(query_day,'YYYYMMDD') FROM v
ON CONFLICT (line_key,published_train_number,calendar_scope) DO NOTHING;
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_jrwest_kosei_2611_verified_source_clocks)<>8
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_clock_evidence
     WHERE verified_source_match)<>8
 OR (SELECT count(*) FROM public.published_jrwest_2611_crossline_number_reference)<>8
 THEN RAISE EXCEPTION 'JRWest 2611 Kosei clock proof or cross-line number evidence changed'; END IF;
END $verify$;
COMMIT;
