-- Fukuchiyama (JR Takarazuka) source-only fleet coverage, November 2026.
-- Historical Osaka-Amagasaki-Shinoyamaguchi template clocks are NOT
-- verified for 2026-11. 26 single-station fragments are intentionally
-- excluded; no physical formation, numbered train or PNG is certified.
-- Fleet references: JR West rolling-stock library and JCOMM's 2025 JR-West
-- vehicle inventory (JR Takarazuka / Fukuchiyama corridor).
BEGIN;
SELECT pg_advisory_xact_lock(26110817);

CREATE TABLE IF NOT EXISTS public.published_jrwest_fukuchiyama_2611_source_fleet (
 source_template_id bigint PRIMARY KEY REFERENCES public.manual_timetable_templates(id) ON DELETE CASCADE,
 edition text NOT NULL DEFAULT '2611' CHECK (edition='2611'),
 line_key text NOT NULL DEFAULT 'Fukuchiyama' CHECK (line_key='Fukuchiyama'),
 source_train_number text NOT NULL,
 calendar_urn text NOT NULL CHECK (calendar_urn IN ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
 direction_urn text NOT NULL CHECK (direction_urn IN ('odpt.RailDirection:Inbound','odpt.RailDirection:Outbound')),
 train_type_urn text NOT NULL CHECK (train_type_urn IN (
  'odpt.TrainType:JR-West.Local','odpt.TrainType:JR-West.Rapid',
  'odpt.TrainType:JR-West.SectionRapid')),
 source_stop_keys text[] NOT NULL CHECK (cardinality(source_stop_keys)>=2),
 source_stop_count integer NOT NULL CHECK (source_stop_count>=2),
 source_timed_stop_count integer NOT NULL CHECK (source_timed_stop_count>=2),
 candidate_models text[] NOT NULL
  DEFAULT ARRAY['207系','321系','223系6000番台','225系6000番台']::text[]
  CHECK (candidate_models=ARRAY['207系','321系','223系6000番台','225系6000番台']::text[]),
 candidate_png_paths text[] NOT NULL DEFAULT ARRAY[]::text[]
  CHECK (candidate_png_paths=ARRAY[]::text[]),
 fleet_reference_url text NOT NULL DEFAULT
  'https://www.jcomm.co.jp/assets/pdf/transit/price/media_guide/2025/mg_77-82_2025.pdf',
 source_path text NOT NULL DEFAULT 'data/timetables/Fukuchiyama-manual.js'
  CHECK (source_path='data/timetables/Fukuchiyama-manual.js'),
 timetable_validity text NOT NULL DEFAULT 'undated_not_current_verified'
  CHECK (timetable_validity='undated_not_current_verified'),
 number_date_verified boolean NOT NULL DEFAULT false CHECK (NOT number_date_verified),
 reference_only boolean NOT NULL DEFAULT true CHECK (reference_only),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK (NOT actual_vehicle_confirmed),
 authorizes_png boolean NOT NULL DEFAULT false CHECK (NOT authorizes_png)
);
ALTER TABLE public.published_jrwest_fukuchiyama_2611_source_fleet ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_jrwest_fukuchiyama_2611_source_fleet IS
'357 historic, two-or-more-timed-stop Fukuchiyama SQL template references. The 4-model list is corridor-wide possible stock, NOT train-level allocation, exact 2026-11 working, or license to select a PNG. 26 incomplete fragments stay excluded.';

WITH scoped AS (
 SELECT m.id,m.train_number,m.calendar_urn,m.direction_urn,m.train_type_urn,
  m.source_path,
  array_agg(split_part(coalesce(s.departure_station_urn,s.arrival_station_urn),'.',4)
    ORDER BY s.stop_sequence) AS stop_keys,
  count(s.template_id)::integer AS stop_count,
  count(*) FILTER (WHERE s.arrival_clock IS NOT NULL OR s.departure_clock IS NOT NULL)::integer AS timed_stop_count
 FROM public.manual_timetable_templates m
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key='Fukuchiyama'
  AND m.railway_urn='odpt.Railway:JR-West.Fukuchiyama'
  AND m.source_path='data/timetables/Fukuchiyama-manual.js'
  AND m.source_occurrence=0 AND m.source_revision_date IS NULL
  AND m.vehicle_type_label IS NULL
  AND m.calendar_urn IN('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
  AND m.direction_urn IN('odpt.RailDirection:Inbound','odpt.RailDirection:Outbound')
  AND m.train_type_urn IN('odpt.TrainType:JR-West.Local',
    'odpt.TrainType:JR-West.Rapid','odpt.TrainType:JR-West.SectionRapid')
 GROUP BY m.id
)
INSERT INTO public.published_jrwest_fukuchiyama_2611_source_fleet
(source_template_id,source_train_number,calendar_urn,direction_urn,train_type_urn,
 source_stop_keys,source_stop_count,source_timed_stop_count,source_path)
SELECT id,train_number,calendar_urn,direction_urn,train_type_urn,
 stop_keys,stop_count,timed_stop_count,source_path
FROM scoped WHERE stop_count>=2 AND timed_stop_count>=2
 ON CONFLICT(source_template_id) DO NOTHING;

DO $check$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates
      WHERE line_key='Fukuchiyama')<>383
    OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet)<>357
    OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet
      WHERE calendar_urn='odpt.Calendar:Weekday')<>173
    OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet
      WHERE calendar_urn='odpt.Calendar:SaturdayHoliday')<>184
    OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet
      WHERE array_length(candidate_png_paths,1) IS NOT NULL
        OR actual_vehicle_confirmed OR authorizes_png OR number_date_verified)>0
 THEN RAISE EXCEPTION 'Fukuchiyama 2611 historical source fleet changed; audit required';
 END IF;
END $check$;
COMMIT;