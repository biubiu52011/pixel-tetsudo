-- Osaka Higashi November 2026: Mahoroba 7092M and Mahoroba 92 9024M.
-- Both operate Saturdays/holidays; original SQL's terminal H is an importer
-- CALENDAR suffix, not an actual train number suffix.
-- This is evidence for Osaka -> Shin-Osaka (two listed stops) ONLY.
-- It does not invent running positions or times through the Shin-Osaka-
-- Nara no-stop corridor; previous 1091M belongs to an OsakaLoop itinerary.
-- Official JR-West sources:
-- https://timetable.jr-odekake.net/train-timetable/279101?date=20261101
-- https://timetable.jr-odekake.net/train-timetable/275461?date=20261101
-- https://www.jr-odekake.net/railroad/mahorobalimitedexpress/
-- No source authorizes Mahoroba's specific An'nei or Yukyu formation or a
-- generic 683 PNG in place of either distinct special livery.
BEGIN;
SELECT pg_advisory_xact_lock(26110812);
CREATE TABLE IF NOT EXISTS public.published_jrwest_osaka_higashi_2611_special_segments (
 source_template_id bigint PRIMARY KEY REFERENCES public.manual_timetable_templates(id) ON DELETE CASCADE,
 edition text NOT NULL DEFAULT '2611' CHECK(edition='2611'),
 line_key text NOT NULL DEFAULT 'OsakaHigashi' CHECK(line_key='OsakaHigashi'),
 railway_urn text NOT NULL DEFAULT 'odpt.Railway:JR-West.OsakaHigashi' CHECK(railway_urn='odpt.Railway:JR-West.OsakaHigashi'),
 source_train_number text NOT NULL CHECK(source_train_number IN('7092MH','9024MH')),
 published_train_number text NOT NULL CHECK(published_train_number IN('7092M','9024M')),
 calendar_urn text NOT NULL DEFAULT 'odpt.Calendar:SaturdayHoliday' CHECK(calendar_urn='odpt.Calendar:SaturdayHoliday'),
 direction_urn text NOT NULL DEFAULT 'odpt.RailDirection:Outbound' CHECK(direction_urn='odpt.RailDirection:Outbound'),
 source_train_type_urn text NOT NULL DEFAULT 'odpt.TrainType:JR-West.Local' CHECK(source_train_type_urn='odpt.TrainType:JR-West.Local'),
 public_train_type_urn text NOT NULL DEFAULT 'odpt.TrainType:JR-West.LimitedExpress' CHECK(public_train_type_urn='odpt.TrainType:JR-West.LimitedExpress'),
 service_name text NOT NULL CHECK(service_name IN('まほろば','まほろば92号')),
 source_stop_keys text[] NOT NULL DEFAULT ARRAY['Osaka','Shin-Osaka']::text[] CHECK(source_stop_keys=ARRAY['Osaka','Shin-Osaka']::text[]),
 source_stop_count integer NOT NULL DEFAULT 2 CHECK(source_stop_count=2),
 source_stops_md5 text NOT NULL CHECK(source_stops_md5 ~ '^[0-9a-f]{32}$'),
 origin_departure_clock text NOT NULL CHECK(origin_departure_clock IN('09:58','14:15')),
 second_arrival_clock text NOT NULL CHECK(second_arrival_clock IN('10:03','14:20')),
 second_departure_clock text NOT NULL CHECK(second_departure_clock IN('10:04','14:21')),
 official_source_url text NOT NULL CHECK(official_source_url LIKE 'https://timetable.jr-odekake.net/train-timetable/%'),
 model_family text NOT NULL DEFAULT '683系' CHECK(model_family='683系'),
 car_count integer NOT NULL DEFAULT 3 CHECK(car_count=3),
 segment_scope text NOT NULL DEFAULT 'osaka_shin_osaka_only' CHECK(segment_scope='osaka_shin_osaka_only'),
 timetable_validity text NOT NULL DEFAULT 'date_verified_segment_only' CHECK(timetable_validity='date_verified_segment_only'),
 valid_from date NOT NULL DEFAULT DATE '2026-11-01' CHECK(valid_from=DATE '2026-11-01'),
 valid_to date NOT NULL DEFAULT DATE '2026-11-30' CHECK(valid_to=DATE '2026-11-30'),
 reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 authorizes_png boolean NOT NULL DEFAULT false CHECK(NOT authorizes_png),
 candidate_png_paths text[] NOT NULL DEFAULT ARRAY[]::text[] CHECK(candidate_png_paths=ARRAY[]::text[]),
 CHECK(source_train_number=published_train_number||'H'),
 CHECK((source_train_number='7092MH' AND published_train_number='7092M'
  AND service_name='まほろば' AND origin_departure_clock='09:58'
  AND second_arrival_clock='10:03' AND second_departure_clock='10:04')
  OR (source_train_number='9024MH' AND published_train_number='9024M'
  AND service_name='まほろば92号' AND origin_departure_clock='14:15'
  AND second_arrival_clock='14:20' AND second_departure_clock='14:21'))
);
ALTER TABLE public.published_jrwest_osaka_higashi_2611_special_segments ENABLE ROW LEVEL SECURITY;
WITH fingerprints AS (
 SELECT m.id,m.train_number,m.calendar_urn,m.direction_urn,m.train_type_urn,m.railway_urn,
   m.line_key,m.source_path,m.source_revision_date,m.source_occurrence,
   COUNT(*)::integer n,
   ARRAY_AGG(SPLIT_PART(COALESCE(s.departure_station_urn,s.arrival_station_urn),'.',4)
     ORDER BY s.stop_sequence) keys,
   MD5(STRING_AGG(CONCAT_WS('|',s.stop_sequence,
     COALESCE(s.departure_station_urn,s.arrival_station_urn,''),
     COALESCE(s.arrival_clock,'∅'),COALESCE(s.departure_clock,'∅')),
     E'\n' ORDER BY s.stop_sequence)) stops_md5,
   (ARRAY_AGG(s.departure_clock ORDER BY s.stop_sequence))[1] dep,
   (ARRAY_AGG(s.arrival_clock ORDER BY s.stop_sequence))[2] arr,
   (ARRAY_AGG(s.departure_clock ORDER BY s.stop_sequence))[2] onward
 FROM public.manual_timetable_templates m
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key='OsakaHigashi' AND m.train_number IN('7092MH','9024MH')
 GROUP BY m.id
), selected AS (
 SELECT * FROM fingerprints
 WHERE line_key='OsakaHigashi' AND railway_urn='odpt.Railway:JR-West.OsakaHigashi'
  AND source_path='data/timetables/OsakaHigashi-manual.js'
  AND source_revision_date IS NULL AND source_occurrence=0 AND n=2
  AND calendar_urn='odpt.Calendar:SaturdayHoliday'
  AND direction_urn='odpt.RailDirection:Outbound'
  AND train_type_urn='odpt.TrainType:JR-West.Local'
  AND keys=ARRAY['Osaka','Shin-Osaka']::text[]
)
INSERT INTO public.published_jrwest_osaka_higashi_2611_special_segments (
source_template_id,source_train_number,published_train_number,calendar_urn,
direction_urn,source_train_type_urn,service_name,source_stops_md5,
origin_departure_clock,second_arrival_clock,second_departure_clock,official_source_url)
SELECT id,train_number,REGEXP_REPLACE(train_number,'H$',''),
 calendar_urn,direction_urn,train_type_urn,
 CASE WHEN train_number='7092MH' THEN 'まほろば' ELSE 'まほろば92号' END,
 stops_md5,dep,arr,onward,
 CASE WHEN train_number='7092MH'
  THEN 'https://timetable.jr-odekake.net/train-timetable/279101?date=20261101'
  ELSE 'https://timetable.jr-odekake.net/train-timetable/275461?date=20261101' END
FROM selected
ON CONFLICT (source_template_id) DO NOTHING;

CREATE OR REPLACE VIEW public.published_jrwest_osaka_higashi_2611_special_clock_evidence
 WITH(security_invoker=true) AS
SELECT p.*,
 (m.id IS NOT NULL AND m.line_key='OsakaHigashi'
  AND m.railway_urn=p.railway_urn
  AND m.train_number=p.source_train_number
  AND m.calendar_urn=p.calendar_urn
  AND m.direction_urn=p.direction_urn
  AND m.train_type_urn=p.source_train_type_urn
  AND m.source_path='data/timetables/OsakaHigashi-manual.js'
  AND m.source_occurrence=0 AND m.source_revision_date IS NULL
  AND aggregate_stops.n=p.source_stop_count
  AND aggregate_stops.keys=p.source_stop_keys
  AND aggregate_stops.hash=p.source_stops_md5
  AND aggregate_stops.dep=p.origin_departure_clock
  AND aggregate_stops.arr=p.second_arrival_clock
  AND aggregate_stops.onward=p.second_departure_clock
 ) AS verified_source_match
FROM public.published_jrwest_osaka_higashi_2611_special_segments p
LEFT JOIN public.manual_timetable_templates m ON m.id=p.source_template_id
LEFT JOIN LATERAL (
 SELECT COUNT(*)::integer n,
  ARRAY_AGG(SPLIT_PART(COALESCE(s.departure_station_urn,s.arrival_station_urn),'.',4)
    ORDER BY s.stop_sequence) keys,
  MD5(STRING_AGG(CONCAT_WS('|',s.stop_sequence,
    COALESCE(s.departure_station_urn,s.arrival_station_urn,''),
    COALESCE(s.arrival_clock,'∅'),COALESCE(s.departure_clock,'∅')),
    E'\n' ORDER BY s.stop_sequence)) hash,
  (ARRAY_AGG(s.departure_clock ORDER BY s.stop_sequence))[1] dep,
  (ARRAY_AGG(s.arrival_clock ORDER BY s.stop_sequence))[2] arr,
  (ARRAY_AGG(s.departure_clock ORDER BY s.stop_sequence))[2] onward
 FROM public.manual_timetable_template_stops s
 WHERE s.template_id=p.source_template_id
) aggregate_stops ON TRUE;

DO $audit$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_jrwest_osaka_higashi_2611_special_segments)<>2
 OR (SELECT COUNT(*) FROM public.published_jrwest_osaka_higashi_2611_special_clock_evidence WHERE verified_source_match)<>2
 OR (SELECT COUNT(DISTINCT published_train_number) FROM public.published_jrwest_osaka_higashi_2611_special_segments)<>2
 OR EXISTS(SELECT 1 FROM public.published_jrwest_osaka_higashi_2611_special_segments
     WHERE authorizes_png OR actual_vehicle_confirmed OR cardinality(candidate_png_paths)>0)
 OR EXISTS(SELECT 1 FROM public.published_jrwest_osaka_higashi_2611_special_segments
     WHERE published_train_number='1091M')
 THEN RAISE EXCEPTION 'Osaka Higashi Mahoroba 2611 two-stop source proof mismatch'; END IF;
END $audit$;
COMMIT;