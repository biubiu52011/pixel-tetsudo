-- JR-West Sagano corridor (Sanin Main Kyoto–Sonobe), November 2026.
-- Existing SaninMain templates have compound internal identifiers and span the
-- entire Sanin Main Line. This is a source-only audit, NOT a new timetable.
-- The 2217M train changes public number to 2133M at Sonobe, while continuing
-- as Local; never label Kyoto–Fukuchiyama entirely as 2217M.
-- Sources: https://www.train-guide.westjr.co.jp/sagano.html
--          https://timetable.jr-odekake.net/line-timetable/2393?day=1&month=11&year=2026
--          https://timetable.jr-odekake.net/train-timetable/19971?date=20261027
--          https://timetable.jr-odekake.net/train-timetable/22831?date=20261024
--          https://timetable.jr-odekake.net/train-timetable/22821?date=20261113
-- No republishing of official complete timetables; original manual stops stay immutable.
BEGIN;
SELECT pg_advisory_xact_lock(26110719);

CREATE TABLE IF NOT EXISTS public.published_jrwest_sagano_2611_source_fleet (
 source_template_id bigint PRIMARY KEY REFERENCES public.manual_timetable_templates(id) ON DELETE CASCADE,
 edition text NOT NULL DEFAULT '2611' CHECK(edition='2611'),
 line_key text NOT NULL DEFAULT 'SaninMain' CHECK(line_key='SaninMain'),
 railway_urn text NOT NULL DEFAULT 'odpt.Railway:JR-West.SaninMain' CHECK(railway_urn='odpt.Railway:JR-West.SaninMain'),
 source_train_number text NOT NULL,
 historical_public_number text NOT NULL CHECK(historical_public_number ~ '^[0-9]{3,4}[MDK]$'),
 calendar_urn text NOT NULL CHECK(calendar_urn IN ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
 direction_urn text NOT NULL CHECK(direction_urn IN ('odpt.RailDirection:Inbound','odpt.RailDirection:Outbound')),
 train_type_urn text NOT NULL,
 corridor_scope text NOT NULL CHECK(corridor_scope IN ('kyoto_sonobe_full','kyoto_short_turn','sonobe_north_only')),
 source_stop_keys text[] NOT NULL CHECK(cardinality(source_stop_keys)>=2),
 source_stop_count integer NOT NULL CHECK(source_stop_count>=2),
 source_stops_md5 text NOT NULL CHECK(source_stops_md5 ~ '^[0-9a-f]{32}$'),
 candidate_models text[] NOT NULL,
 candidate_png_paths text[] NOT NULL DEFAULT ARRAY[]::text[] CHECK(candidate_png_paths=ARRAY[]::text[]),
 source_path text NOT NULL DEFAULT 'data/timetables/SaninMain-manual.js' CHECK(source_path='data/timetables/SaninMain-manual.js'),
 source_route_url text NOT NULL DEFAULT 'https://www.train-guide.westjr.co.jp/sagano.html',
 fleet_reference_url text NOT NULL DEFAULT 'https://www.westjr.co.jp/fan/paper/local/',
 timetable_validity text NOT NULL DEFAULT 'undated_source_not_date_verified' CHECK(timetable_validity='undated_source_not_date_verified'),
 reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
 number_date_verified boolean NOT NULL DEFAULT false CHECK(NOT number_date_verified),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 authorizes_png boolean NOT NULL DEFAULT false CHECK(NOT authorizes_png),
 CHECK ((corridor_scope='sonobe_north_only' AND candidate_models=ARRAY[]::text[])
   OR (corridor_scope<>'sonobe_north_only' AND train_type_urn IN('odpt.TrainType:JR-West.Local','odpt.TrainType:JR-West.Rapid')
       AND candidate_models=ARRAY['221系','223系']::text[])
   OR (corridor_scope<>'sonobe_north_only' AND train_type_urn='odpt.TrainType:JR-West.LimitedExpress'
       AND ((right(historical_public_number,1)='M' AND candidate_models=ARRAY['287系','289系']::text[])
         OR (right(historical_public_number,1)<>'M' AND candidate_models=ARRAY[]::text[]))))
);
ALTER TABLE public.published_jrwest_sagano_2611_source_fleet ENABLE ROW LEVEL SECURITY;

WITH origin AS (
 SELECT m.id,m.train_number,m.calendar_urn,m.direction_urn,m.train_type_urn,m.railway_urn,m.source_path,
  array_agg(split_part(coalesce(s.departure_station_urn,s.arrival_station_urn),'.',4)
    ORDER BY s.stop_sequence) stop_keys,
  count(*)::integer stop_count,
  md5(string_agg(concat_ws('|',s.stop_sequence,
      coalesce(s.departure_station_urn,s.arrival_station_urn,''),
      coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),
    E'\n' ORDER BY s.stop_sequence)) stops_hash
 FROM public.manual_timetable_templates m
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key='SaninMain'
   AND m.railway_urn='odpt.Railway:JR-West.SaninMain'
   AND m.source_path='data/timetables/SaninMain-manual.js'
   AND m.source_occurrence=0 AND m.source_revision_date IS NULL
   AND m.vehicle_type_label IS NULL
   AND m.calendar_urn IN ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
   AND m.train_number ~ '^700[0-9]{3}-[0-9]+-[0-9]{3,4}[MDK]$'
 GROUP BY m.id
), selected AS (
 SELECT *,
  CASE WHEN 'Kyoto'=ANY(stop_keys) AND 'Sonobe'=ANY(stop_keys) THEN 'kyoto_sonobe_full'
       WHEN 'Kyoto'=ANY(stop_keys) THEN 'kyoto_short_turn'
       ELSE 'sonobe_north_only' END AS scope
 FROM origin WHERE 'Kyoto'=ANY(stop_keys) OR 'Sonobe'=ANY(stop_keys)
)
INSERT INTO public.published_jrwest_sagano_2611_source_fleet
(source_template_id,source_train_number,historical_public_number,calendar_urn,direction_urn,
 train_type_urn,corridor_scope,source_stop_keys,source_stop_count,source_stops_md5,candidate_models)
SELECT id,train_number,substring(train_number FROM '([0-9]{3,4}[MDK])$'),
 calendar_urn,direction_urn,train_type_urn,scope,stop_keys,stop_count,stops_hash,
 CASE WHEN scope='sonobe_north_only' THEN ARRAY[]::text[]
 WHEN train_type_urn IN('odpt.TrainType:JR-West.Local','odpt.TrainType:JR-West.Rapid')
    THEN ARRAY['221系','223系']::text[]
 WHEN train_type_urn='odpt.TrainType:JR-West.LimitedExpress' AND train_number LIKE '%M'
    THEN ARRAY['287系','289系']::text[]
 ELSE ARRAY[]::text[] END
FROM selected ON CONFLICT (source_template_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.published_jrwest_sagano_2611_verified_source_clocks (
 source_template_id bigint PRIMARY KEY REFERENCES public.published_jrwest_sagano_2611_source_fleet(source_template_id) ON DELETE CASCADE,
 calendar_urn text NOT NULL CHECK(calendar_urn IN('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
 source_train_number text NOT NULL,
 published_train_number text NOT NULL CHECK(published_train_number ~ '^[0-9]{3,4}[MDK]$'),
 source_stop_count integer NOT NULL CHECK(source_stop_count IN(11,16,23)),
 source_stops_md5 text NOT NULL CHECK(source_stops_md5 ~ '^[0-9a-f]{32}$'),
 official_source_url text NOT NULL CHECK(official_source_url LIKE 'https://timetable.jr-odekake.net/train-timetable/%'),
 valid_from date NOT NULL DEFAULT date '2026-11-01',
 valid_to date NOT NULL DEFAULT date '2026-11-30',
 continuation_number text NULL CHECK(continuation_number IS NULL OR continuation_number='2133M'),
 continuation_station text NULL CHECK(continuation_station IS NULL OR continuation_station='Sonobe'),
 reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 authorizes_png boolean NOT NULL DEFAULT false CHECK(NOT authorizes_png),
 CHECK ((published_train_number='2217M' AND continuation_number='2133M' AND continuation_station='Sonobe' AND source_stop_count=23)
     OR (published_train_number<>'2217M' AND continuation_number IS NULL AND continuation_station IS NULL)),
 CHECK(valid_from=date '2026-11-01' AND valid_to=date '2026-11-30')
);
ALTER TABLE public.published_jrwest_sagano_2611_verified_source_clocks ENABLE ROW LEVEL SECURITY;

WITH evidence(train_number,calendar,public_number,stops,hash,source_url,continue_number,continue_station) AS (VALUES
 ('700100-205400-221M','Weekday','221M',16,'1b3f03bde108d6f6642fdb93131e3f5e','https://timetable.jr-odekake.net/train-timetable/20101?date=20261019',NULL,NULL),
 ('700100-205400-221M','SaturdayHoliday','221M',16,'1b3f03bde108d6f6642fdb93131e3f5e','https://timetable.jr-odekake.net/train-timetable/20101?date=20261019',NULL,NULL),
 ('700100-204100-2217M','Weekday','2217M',23,'e7e529aedb0e061874c602cb647d545b','https://timetable.jr-odekake.net/train-timetable/19971?date=20261027','2133M','Sonobe'),
 ('700100-204100-2217M','SaturdayHoliday','2217M',23,'e7e529aedb0e061874c602cb647d545b','https://timetable.jr-odekake.net/train-timetable/19971?date=20261027','2133M','Sonobe'),
 ('700100-233100-237M','SaturdayHoliday','237M',16,'f5f8527064aed87ca3b950eac8ba489a','https://timetable.jr-odekake.net/train-timetable/22831?date=20261024',NULL,NULL),
 ('700100-1223700-5001M','Weekday','5001M',11,'fa85ed01d5af02bc6f85c2d95544e16f','https://timetable.jr-odekake.net/train-timetable/114481?date=20261027',NULL,NULL)
), matched AS (
 SELECT f.source_template_id, f.calendar_urn,f.source_train_number, e.public_number,e.stops,e.hash,e.source_url,e.continue_number,e.continue_station
 FROM public.published_jrwest_sagano_2611_source_fleet f
 JOIN evidence e ON f.source_train_number=e.train_number
   AND f.calendar_urn='odpt.Calendar:'||e.calendar
   AND f.source_stop_count=e.stops AND f.source_stops_md5=e.hash
)
INSERT INTO public.published_jrwest_sagano_2611_verified_source_clocks
(source_template_id,calendar_urn,source_train_number,published_train_number,
 source_stop_count,source_stops_md5,official_source_url,continuation_number,continuation_station)
SELECT source_template_id,calendar_urn,source_train_number,public_number,
 stops,hash,source_url,continue_number,continue_station
FROM matched ON CONFLICT (source_template_id) DO NOTHING;

CREATE OR REPLACE VIEW public.published_jrwest_sagano_2611_clock_evidence
WITH (security_invoker=true) AS
SELECT p.source_template_id,p.calendar_urn,p.source_train_number,p.published_train_number,
 p.source_stop_count,p.official_source_url,p.valid_from,p.valid_to,
 p.continuation_number,p.continuation_station,p.actual_vehicle_confirmed,p.authorizes_png,
 (m.id IS NOT NULL AND m.source_occurrence=0 AND m.source_revision_date IS NULL
   AND m.line_key='SaninMain' AND m.railway_urn='odpt.Railway:JR-West.SaninMain'
   AND m.train_number=p.source_train_number AND m.calendar_urn=p.calendar_urn
   AND o.stop_count=p.source_stop_count AND o.stop_hash=p.source_stops_md5
   AND p.published_train_number=substring(p.source_train_number FROM '([0-9]{3,4}[MDK])$')) AS verified_source_match
FROM public.published_jrwest_sagano_2611_verified_source_clocks p
LEFT JOIN public.manual_timetable_templates m ON m.id=p.source_template_id
LEFT JOIN LATERAL (
 SELECT count(*)::integer stop_count,md5(string_agg(concat_ws('|',s.stop_sequence,
   coalesce(s.departure_station_urn,s.arrival_station_urn,''),
   coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),E'\n' ORDER BY s.stop_sequence)) stop_hash
 FROM public.manual_timetable_template_stops s WHERE s.template_id=p.source_template_id
) o ON true;

DO $check$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='SaninMain')<>53
 OR (SELECT count(*) FROM public.published_jrwest_sagano_2611_source_fleet)<>23
 OR (SELECT count(*) FROM public.published_jrwest_sagano_2611_source_fleet WHERE corridor_scope='kyoto_sonobe_full')<>16
 OR (SELECT count(*) FROM public.published_jrwest_sagano_2611_source_fleet WHERE corridor_scope='kyoto_short_turn')<>4
 OR (SELECT count(*) FROM public.published_jrwest_sagano_2611_source_fleet WHERE corridor_scope='sonobe_north_only')<>3
 OR (SELECT count(*) FROM public.published_jrwest_sagano_2611_verified_source_clocks)<>6
 OR (SELECT count(*) FROM public.published_jrwest_sagano_2611_clock_evidence WHERE verified_source_match)<>6
 OR (SELECT count(*) FROM public.published_jrwest_sagano_2611_verified_source_clocks WHERE continuation_number='2133M')<>2
 OR EXISTS (SELECT 1 FROM public.published_jrwest_sagano_2611_source_fleet
   WHERE actual_vehicle_confirmed OR authorizes_png OR cardinality(candidate_png_paths)<>0)
 THEN RAISE EXCEPTION 'Sagano 2611 source scope or clock evidence changed; inspect before mapping'; END IF;
END $check$;
COMMIT;