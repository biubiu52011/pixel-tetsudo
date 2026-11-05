-- 2026-11 奥羽本線 (OuMain) / 山形線 (Yamagata): source-scope audit.
-- 1075 historical SQL templates, NOT 1075 verified November services.
-- Preserve source_template_id (same train number may have multiple segments).
-- Shinkansen/limited express/resort/Oga through services are not local 701/E721.
-- https://timetables.jreast.co.jp/2611/timetable-v/249d1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/258d1.html
-- https://www.jreast.co.jp/train/local/gv_e400.html
-- https://www.jreast.co.jp/press/2024/sendai/20250220_s01.pdf
BEGIN;
SELECT pg_advisory_xact_lock(2611249);
CREATE TABLE IF NOT EXISTS public.published_oumain_2611_source_scope(
 edition text NOT NULL DEFAULT '2611' CHECK(edition='2611'),
 line_key text NOT NULL CHECK(line_key IN ('OuMain','Yamagata')),
 source_template_id bigint PRIMARY KEY REFERENCES public.manual_timetable_templates(id),
 calendar_urn text NOT NULL,
 direction_urn text NOT NULL,
 train_number text NOT NULL,
 segment_key text NOT NULL,
 source_stop_keys text[] NOT NULL,
 model_candidates text[] NOT NULL DEFAULT '{}'::text[],
 service_type_override text CHECK(service_type_override IN ('Rapid','LimitedExpress')),
 source_clock_status text NOT NULL DEFAULT 'historical_not_2611_verified'
  CHECK(source_clock_status='historical_not_2611_verified'),
 number_source_status text NOT NULL DEFAULT 'historical_source_only'
  CHECK(number_source_status='historical_source_only'),
 reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 png_reference text CHECK(png_reference IS NULL)
);
ALTER TABLE public.published_oumain_2611_source_scope ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS published_oumain_2611_scope_line_calendar_idx
 ON public.published_oumain_2611_source_scope(line_key,calendar_urn);
COMMENT ON TABLE public.published_oumain_2611_source_scope IS
'1075 historical SQL source-segments (776 OuMain+299 Yamagata). No official November daily clocks, trainset identity or vehicle PNG verified. Not a new timetable generator.';
WITH src AS(
 SELECT t.id,t.line_key,t.calendar_urn,t.direction_urn,t.train_number,
  t.vehicle_type_label,
  ARRAY(SELECT split_part(coalesce(s.departure_station_urn,s.arrival_station_urn),'.',3)
   FROM public.manual_timetable_template_stops s WHERE s.template_id=t.id
   ORDER BY s.stop_sequence) stops
 FROM public.manual_timetable_templates t
 WHERE t.line_key IN('OuMain','Yamagata')
  AND t.railway_urn='odpt.Railway:JR-East.'||t.line_key
), scoped AS(
 SELECT *,
 CASE
 WHEN cardinality(stops)<2 OR stops[1]=stops[cardinality(stops)]
  THEN 'insufficient_source_stops'
 WHEN line_key='Yamagata' AND (vehicle_type_label='E8系'
  OR train_number ~ '^1[0-9]{2}M$'
  OR train_number ~ '^[689][0-9]{3}M$')
  THEN 'yamagata_shinkansen_shared'
 WHEN line_key='OuMain' AND train_number ~ '^(3[0-9]{3}|5[0-9]{3})M$'
  AND stops[1] IN('Omagari','Akita')
  THEN 'akita_shinkansen_shared'
 WHEN line_key='OuMain' AND train_number ~ '^(85|86)[0-9]{2}D$'
  THEN 'gono_resort_through'
 WHEN line_key='OuMain' AND train_number ~ '^11[234][0-9]M$'
  AND stops[1] IN('Oiwake','Akita')
  AND stops[cardinality(stops)] IN('Oiwake','Akita')
  THEN 'oga_accum_through'
 WHEN line_key='OuMain' AND train_number ~ '^20[0-9]{2}M$'
  THEN 'tsugaru_limited_express_candidate'
 WHEN line_key='OuMain' AND train_number ~ '^1[0-9]{2}M$'
  AND (stops[1]='Shinjo' OR stops[cardinality(stops)]='Fukushima')
  THEN 'yamagata_shinkansen_shared'
 WHEN line_key='Yamagata' THEN 'yamagata_regional_mixed_stock'
 WHEN line_key='OuMain' AND train_number LIKE '%D'
  THEN 'regional_diesel_or_special'
 ELSE 'regional_electric_legacy' END segment_key
 FROM src
)
INSERT INTO public.published_oumain_2611_source_scope(
 edition,line_key,source_template_id,calendar_urn,direction_urn,
 train_number,segment_key,source_stop_keys,model_candidates,service_type_override)
SELECT '2611',line_key,id,calendar_urn,direction_urn,train_number,segment_key,stops,
 CASE segment_key
 WHEN 'yamagata_regional_mixed_stock'
   THEN ARRAY['701系5500番台','719系5000番台','E723系5000番台']::text[]
 WHEN 'oga_accum_through' THEN ARRAY['EV-E801系']::text[]
 WHEN 'tsugaru_limited_express_candidate' THEN ARRAY['E751系']::text[]
 WHEN 'regional_electric_legacy' THEN ARRAY['701系']::text[]
 WHEN 'regional_diesel_or_special' THEN
  CASE WHEN (stops[1]='Shinjo' AND stops[cardinality(stops)]='Mamurogawa')
        OR (stops[1]='Mamurogawa' AND stops[cardinality(stops)]='Shinjo')
    THEN ARRAY['キハ110系']::text[]
    ELSE ARRAY['GV-E400系','キハ110系']::text[] END
 ELSE '{}'::text[] END,
 CASE WHEN line_key='OuMain' AND train_number IN('3427M','3445D','3449D','3623M')
   THEN 'Rapid'
 WHEN segment_key='tsugaru_limited_express_candidate' THEN 'LimitedExpress'
 ELSE NULL END
FROM scoped ON CONFLICT(source_template_id) DO NOTHING;
DO $check$
BEGIN
 IF (SELECT count(*) FROM public.published_oumain_2611_source_scope)<>1075
 OR (SELECT count(*) FROM public.published_oumain_2611_source_scope
     WHERE line_key='OuMain')<>776
 OR (SELECT count(*) FROM public.published_oumain_2611_source_scope
     WHERE line_key='Yamagata')<>299
 OR EXISTS(SELECT 1 FROM public.published_oumain_2611_source_scope p
 JOIN public.manual_timetable_templates t ON t.id=p.source_template_id
 WHERE p.train_number<>t.train_number OR p.line_key<>t.line_key
 OR p.calendar_urn<>t.calendar_urn OR p.direction_urn<>t.direction_urn)
 THEN RAISE EXCEPTION 'OuMain/Yamagata source evidence changed';END IF;
END $check$;
COMMIT;
