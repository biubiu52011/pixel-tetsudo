-- Kosei Line JR-West: historical source-only 179 ordinary/rapid rows.
-- The 180th source, 9017DH, is a seasonal D-suffix excursion and MUST
-- NOT masquerade as a November 2026 ordinary carset.
-- Historical weekend M+H suffix: H denotes the Saturday/holiday import
-- calendar. The source train number is NOT necessarily the 2611 public
-- train number; never convert the suffix into a carset identifier.
-- JR West current route: https://www.train-guide.westjr.co.jp/kosei.html
-- JR West 221/223/225 fleet: https://www.westjr.co.jp/fan/paper/local/
-- Current 2026 service evidence: https://timetable.jr-odekake.net/station-timetable/2635014001?date=20261107
-- Northern 521 candidates: https://train.mi-ktt.ne.jp/rosen/koseisen/
BEGIN;
SELECT pg_advisory_xact_lock(26110525);
CREATE TABLE IF NOT EXISTS public.published_jrwest_kosei_2611_source_fleet(
 source_template_id bigint PRIMARY KEY REFERENCES public.manual_timetable_templates(id) ON DELETE CASCADE,
 edition text NOT NULL DEFAULT '2611' CHECK(edition='2611'),
 line_key text NOT NULL DEFAULT 'Kosei' CHECK(line_key='Kosei'),
 railway_urn text NOT NULL DEFAULT 'odpt.Railway:JR-West.Kosei'
    CHECK(railway_urn='odpt.Railway:JR-West.Kosei'),
 source_train_number text NOT NULL CHECK(source_train_number ~ '^[0-9]{3,4}MH?$'),
 historical_public_number text NOT NULL CHECK(historical_public_number ~ '^[0-9]{3,4}M$'),
 calendar_urn text NOT NULL CHECK(calendar_urn IN('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
 direction_urn text NOT NULL CHECK(direction_urn IN('odpt.RailDirection:Inbound','odpt.RailDirection:Outbound')),
 train_type_urn text NOT NULL CHECK(train_type_urn IN
  ('odpt.TrainType:JR-West.Local','odpt.TrainType:JR-West.Rapid',
   'odpt.TrainType:JR-West.SpecialRapid')),
 corridor_segment text NOT NULL CHECK(corridor_segment IN('north_shuttle','other_local','rapid','special_rapid')),
 source_stop_keys text[] NOT NULL CHECK(cardinality(source_stop_keys)>=2),
 candidate_models text[] NOT NULL,
 candidate_png_paths text[] NOT NULL DEFAULT ARRAY[]::text[]
    CHECK(candidate_png_paths=ARRAY[]::text[]),
 source_path text NOT NULL CHECK(source_path='data/timetables/Kosei-manual.js'),
 source_fleet_url text NOT NULL,
 source_route_url text NOT NULL DEFAULT 'https://www.train-guide.westjr.co.jp/kosei.html'
    CHECK(source_route_url='https://www.train-guide.westjr.co.jp/kosei.html'),
 timetable_validity text NOT NULL DEFAULT 'undated_not_current_verified'
    CHECK(timetable_validity='undated_not_current_verified'),
 reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
 number_date_verified boolean NOT NULL DEFAULT false CHECK(NOT number_date_verified),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 authorizes_png boolean NOT NULL DEFAULT false CHECK(NOT authorizes_png),
 CHECK ((calendar_urn='odpt.Calendar:SaturdayHoliday'
     AND source_train_number=historical_public_number||'H')
 OR (calendar_urn='odpt.Calendar:Weekday'
     AND source_train_number=historical_public_number)),
 CHECK (
 (corridor_segment='north_shuttle' AND train_type_urn='odpt.TrainType:JR-West.Local'
    AND candidate_models=ARRAY['223系','225系','521系']::text[])
 OR
 (corridor_segment='other_local' AND train_type_urn='odpt.TrainType:JR-West.Local'
    AND candidate_models=ARRAY['221系','223系','225系']::text[])
 OR
 (corridor_segment='rapid' AND train_type_urn='odpt.TrainType:JR-West.Rapid'
    AND candidate_models=ARRAY['223系','225系']::text[])
 OR
 (corridor_segment='special_rapid' AND train_type_urn='odpt.TrainType:JR-West.SpecialRapid'
    AND candidate_models=ARRAY['223系','225系']::text[])
 ),
 UNIQUE(edition,line_key,calendar_urn,source_train_number)
);
ALTER TABLE public.published_jrwest_kosei_2611_source_fleet ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_jrwest_kosei_2611_source_fleet IS
'179 Kosei historical M/MH source train rows: 125 regular local 221/223/225, 16 north-only shuttle 223/225/521, 4 rapid 223/225, 34 special-rapid 223/225. No actual carset, dated 2611 train number, or authorized Kosei-specific PNG. Special excursion 9017DH excluded.';
WITH a AS (
 SELECT m.id,m.line_key,m.railway_urn,m.train_number,m.train_type_urn,
   m.calendar_urn,m.direction_urn,m.source_path,m.source_occurrence,
   m.source_revision_date,m.vehicle_type_label,
   ARRAY(SELECT split_part(coalesce(s.departure_station_urn,s.arrival_station_urn),'.',4)
     FROM public.manual_timetable_template_stops s WHERE s.template_id=m.id
     ORDER BY s.stop_sequence) stops
 FROM public.manual_timetable_templates m
 WHERE m.line_key='Kosei'
 AND m.railway_urn='odpt.Railway:JR-West.Kosei'
 AND m.source_path='data/timetables/Kosei-manual.js'
 AND m.source_occurrence=0
 AND m.source_revision_date IS NULL
 AND m.vehicle_type_label IS NULL
 AND m.train_number ~ '^[0-9]{3,4}MH?$'
 AND m.calendar_urn IN('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
 AND m.direction_urn IN('odpt.RailDirection:Inbound','odpt.RailDirection:Outbound')
 AND m.train_type_urn IN('odpt.TrainType:JR-West.Local',
  'odpt.TrainType:JR-West.Rapid','odpt.TrainType:JR-West.SpecialRapid')
),c AS (
 SELECT *,
 CASE WHEN train_type_urn='odpt.TrainType:JR-West.Local'
     AND stops[1] IN('Omi-Shiotsu','Nagahara-Kansai')
     AND stops[cardinality(stops)]='Oumiimazu'
   THEN 'north_shuttle'
 WHEN train_type_urn='odpt.TrainType:JR-West.Local'
   THEN 'other_local'
 WHEN train_type_urn='odpt.TrainType:JR-West.Rapid'
   THEN 'rapid'
 ELSE 'special_rapid' END AS segment
 FROM a WHERE cardinality(stops)>=2
 AND (
   (calendar_urn='odpt.Calendar:SaturdayHoliday' AND train_number LIKE '%MH')
   OR (calendar_urn='odpt.Calendar:Weekday' AND train_number NOT LIKE '%H')
 )
)
INSERT INTO public.published_jrwest_kosei_2611_source_fleet(
 source_template_id,edition,line_key,railway_urn,source_train_number,
 historical_public_number,calendar_urn,direction_urn,train_type_urn,
 corridor_segment,source_stop_keys,candidate_models,candidate_png_paths,
 source_path,source_fleet_url)
SELECT id,'2611','Kosei',railway_urn,train_number,
 regexp_replace(train_number,'H$',''),calendar_urn,direction_urn,train_type_urn,
 segment,stops,
 CASE segment
 WHEN 'north_shuttle' THEN ARRAY['223系','225系','521系']::text[]
 WHEN 'other_local' THEN ARRAY['221系','223系','225系']::text[]
 ELSE ARRAY['223系','225系']::text[] END,
 ARRAY[]::text[],source_path,
 CASE WHEN segment='north_shuttle' THEN
 'https://train.mi-ktt.ne.jp/rosen/koseisen/'
 ELSE 'https://www.westjr.co.jp/fan/paper/local/' END
FROM c
ON CONFLICT(source_template_id) DO NOTHING;
DO $validate$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates
     WHERE line_key='Kosei')<>180
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_source_fleet
     WHERE edition='2611')<>179
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_source_fleet
     WHERE corridor_segment='north_shuttle')<>16
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_source_fleet
     WHERE corridor_segment='other_local')<>125
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_source_fleet
     WHERE corridor_segment='rapid')<>4
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_source_fleet
     WHERE corridor_segment='special_rapid')<>34
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_source_fleet
     WHERE calendar_urn='odpt.Calendar:Weekday')<>90
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_source_fleet
     WHERE calendar_urn='odpt.Calendar:SaturdayHoliday')<>89
 OR EXISTS (SELECT 1 FROM public.published_jrwest_kosei_2611_source_fleet
     WHERE historical_public_number='9017D' OR source_train_number LIKE '%DH')
 THEN RAISE EXCEPTION 'Kosei historical 179-row proof changed: inspect source and special trains before mapping';
 END IF;
END $validate$;
COMMIT;