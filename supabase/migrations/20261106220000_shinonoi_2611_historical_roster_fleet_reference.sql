-- Shinonoi JR-East November 2026: source-scoped vehicle REFERENCES,
-- not November stop-clock certification or an actual daily carset.
-- 116u1/u2/d1/d2 is the shared Chuo/Shinonoi printed timetable.
-- The 52 pre-existing official 383 Shinano plans remain authoritative.
BEGIN;
SELECT pg_advisory_xact_lock(2611116);
CREATE TABLE IF NOT EXISTS public.published_shinonoi_2611_fleet_scope (
 edition text NOT NULL CHECK (edition='2611'),
 line_key text NOT NULL CHECK (line_key='Shinonoi'),
 source_template_id bigint PRIMARY KEY
  REFERENCES public.manual_timetable_templates(id),
 calendar_urn text NOT NULL,
 direction_urn text NOT NULL,
 train_number text NOT NULL,
 train_type_urn text NOT NULL,
 fleet_role text NOT NULL CHECK (fleet_role IN (
   'mixed_local','rapid_211_reference','shinano_383')),
 candidate_models text[] NOT NULL,
 illustration_model text NOT NULL,
 number_evidence_scope text NOT NULL CHECK (number_evidence_scope IN (
   'historical_source_only','existing_official_service_vehicle_plan')),
 source_url text NOT NULL,
 reference_only boolean NOT NULL DEFAULT true CHECK (reference_only),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false
  CHECK (NOT actual_vehicle_confirmed)
);
ALTER TABLE public.published_shinonoi_2611_fleet_scope
 ENABLE ROW LEVEL SECURITY;
WITH historical AS (
 SELECT t.id,t.line_key,t.calendar_urn,t.direction_urn,t.train_number,
  t.train_type_urn,m.source_template_id AS existing_plan_id,
  m.vehicle_type AS existing_vehicle_type,
  m.mapping_level AS existing_mapping_level,
  m.actual_vehicle_confirmed AS existing_actual_confirmed,
  CASE WHEN t.train_type_urn='odpt.TrainType:JR-East.LimitedExpress'
    THEN 'shinano_383'
  WHEN t.train_type_urn='odpt.TrainType:JR-East.Rapid'
    THEN 'rapid_211_reference'
  ELSE 'mixed_local' END AS role
 FROM public.manual_timetable_templates t
 LEFT JOIN public.train_timetable_vehicle_mappings m
   ON m.source_template_id=t.id
 WHERE t.line_key='Shinonoi'
   AND t.railway_urn='odpt.Railway:JR-East.Shinonoi'
   AND t.calendar_urn IN (
    'odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
   AND t.direction_urn IN (
    'odpt.RailDirection:Inbound','odpt.RailDirection:Outbound')
   AND t.train_type_urn IN (
    'odpt.TrainType:JR-East.Local',
    'odpt.TrainType:JR-East.Rapid',
    'odpt.TrainType:JR-East.LimitedExpress')
   AND t.train_number ~ '^[0-9]{2,4}M$'
)
INSERT INTO public.published_shinonoi_2611_fleet_scope (
 edition,line_key,source_template_id,calendar_urn,direction_urn,
 train_number,train_type_urn,fleet_role,candidate_models,
 illustration_model,number_evidence_scope,source_url)
SELECT '2611','Shinonoi',h.id,h.calendar_urn,h.direction_urn,
 h.train_number,h.train_type_urn,h.role,
 CASE WHEN h.role='shinano_383' THEN ARRAY['383系']::text[]
      WHEN h.role='rapid_211_reference'
        THEN ARRAY['211系（長野地区）']::text[]
      ELSE ARRAY['211系（長野地区）','E127系100番台']::text[] END,
 CASE WHEN h.role='shinano_383' THEN '383系'
      ELSE '211系（長野地区）' END,
 CASE WHEN h.role='shinano_383'
   THEN 'existing_official_service_vehicle_plan'
   ELSE 'historical_source_only' END,
 'https://timetables.jreast.co.jp/2611/timetable-v/116' ||
  CASE WHEN h.direction_urn='odpt.RailDirection:Inbound'
    THEN 'u' ELSE 'd' END ||
  CASE WHEN h.calendar_urn='odpt.Calendar:Weekday'
    THEN '1' ELSE '2' END || '.html'
FROM historical h
WHERE h.role<>'shinano_383'
 OR (h.existing_plan_id=h.id
   AND h.existing_vehicle_type='383系'
   AND h.existing_mapping_level='official_service_vehicle_plan'
   AND h.existing_actual_confirmed=false)
ON CONFLICT (source_template_id) DO UPDATE SET
 calendar_urn=EXCLUDED.calendar_urn,
 direction_urn=EXCLUDED.direction_urn,
 train_number=EXCLUDED.train_number,
 train_type_urn=EXCLUDED.train_type_urn,
 fleet_role=EXCLUDED.fleet_role,
 candidate_models=EXCLUDED.candidate_models,
 illustration_model=EXCLUDED.illustration_model,
 number_evidence_scope=EXCLUDED.number_evidence_scope,
 source_url=EXCLUDED.source_url;
-- Repair only the 52 already officially mapped Shinano labels. Never
-- rewrite old source clocks, canonical IDs, or the 52 source mappings.
UPDATE public.manual_timetable_templates t
 SET vehicle_type_label='383系'
FROM public.published_shinonoi_2611_fleet_scope s
WHERE s.source_template_id=t.id
 AND s.fleet_role='shinano_383'
 AND t.vehicle_type_label IS DISTINCT FROM '383系';
DO $check$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates
      WHERE line_key='Shinonoi')<>288
 OR (SELECT count(*) FROM public.published_shinonoi_2611_fleet_scope)<>288
 OR (SELECT count(*) FROM public.published_shinonoi_2611_fleet_scope
      WHERE fleet_role='mixed_local')<>228
 OR (SELECT count(*) FROM public.published_shinonoi_2611_fleet_scope
      WHERE fleet_role='rapid_211_reference')<>8
 OR (SELECT count(*) FROM public.published_shinonoi_2611_fleet_scope
      WHERE fleet_role='shinano_383')<>52
 OR (SELECT count(*) FROM public.published_shinonoi_2611_fleet_scope
      WHERE calendar_urn='odpt.Calendar:Weekday')<>144
 OR (SELECT count(*) FROM public.published_shinonoi_2611_fleet_scope
      WHERE calendar_urn='odpt.Calendar:SaturdayHoliday')<>144
 OR EXISTS (SELECT 1 FROM public.published_shinonoi_2611_fleet_scope
      WHERE NOT reference_only OR actual_vehicle_confirmed)
 THEN RAISE EXCEPTION 'Shinonoi 2611 scope/vehicle reference mismatch'; END IF;
END $check$;
COMMIT;
