-- 2026-11-09 JR-West JR Tozai / Gakkentoshi: source-verified corridor links.
-- Does not manufacture stop times, train runs, actual 207/321 vehicle,
-- NK/Y2 visual identity, or a complete published 2611 line timetable.
BEGIN;
LOCK TABLE public.evidence_sources IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.operation_family_rules IN SHARE ROW EXCLUSIVE MODE;

-- Official route-wide presence of 207 and 321; strictly a multiple-model fleet.
INSERT INTO public.evidence_sources(id,source_key,source_url,source_type,evidence_grade,notes)
SELECT (SELECT coalesce(max(id),0)+1 FROM public.evidence_sources),
  'official-jrwest-tozai-207-321-fleet-202611',
  'https://www.jr-odekake.net/railroad/service/train-woman.html',
  'official','B',
  'JR-West identifies 207 and 321 series across JR Tozai and Gakkentoshi; route fleet only. No train or variant allocation, no formation, no specific PNG.'
WHERE NOT EXISTS (SELECT 1 FROM public.evidence_sources
  WHERE source_key='official-jrwest-tozai-207-321-fleet-202611');

WITH source AS (
 SELECT id FROM public.evidence_sources
 WHERE source_key='official-jrwest-tozai-207-321-fleet-202611'
), desired AS (
 SELECT * FROM (VALUES
  ('JRTozai','PLAN:OFFICIAL-JRW-TOZAI-207-321-202611'),
  ('Gakkentoshi','PLAN:OFFICIAL-JRW-GAKKENTOSHI-207-321-202611')
 ) AS x(line_key,code)
), pending AS (
 SELECT d.*,row_number() over(order by d.line_key) rn
 FROM desired d WHERE NOT EXISTS (
   SELECT 1 FROM public.operation_family_rules o
   WHERE o.operator='JR-West' AND o.network_key=d.line_key
     AND o.code_pattern=d.code AND o.effective_from=date '2026-11-01'
     AND o.calendar_type=''
 )
)
INSERT INTO public.operation_family_rules
  (id,operator,network_key,code_pattern,effective_from,effective_to,
   exact_vehicle_type,vehicle_candidates,calendar_type,source_id,notes,plan_scope)
SELECT (SELECT coalesce(max(id),0) FROM public.operation_family_rules)+p.rn,
 'JR-West',p.line_key,p.code,date '2026-11-01',NULL,
 NULL,ARRAY['JR西日本207系','JR西日本321系']::text[],'',s.id,
 'JR-West official multi-model corridor fleet; NOT a verified train model or formation.',
 jsonb_build_object('lineIds',jsonb_build_array(p.line_key),'planOnly',true,
   'trainTypes',jsonb_build_array('Local','Rapid','SectionRapid'),
   'fleetCompleteness','partial','evidenceScope','route_fleet_presence_not_each_train',
   'actualVehicleConfirmed',false,'authorizesPNG',false)
FROM pending p CROSS JOIN source s;

-- One row = one already-existing Gakkentoshi source template whose *number*
-- and *first recorded station clock* independently match an official 2026-11
-- train page documenting the traverse of JR Tozai. No inferred intermediate
-- stops are inserted and the identity remains a source-only reference.
CREATE TABLE IF NOT EXISTS public.published_jrwest_tozai_2611_source_links (
 source_template_id bigint PRIMARY KEY REFERENCES public.manual_timetable_templates(id),
 edition text NOT NULL DEFAULT '2611' CHECK (edition='2611'),
 source_line_key text NOT NULL DEFAULT 'Gakkentoshi' CHECK (source_line_key='Gakkentoshi'),
 verified_through_line_key text NOT NULL DEFAULT 'JRTozai' CHECK (verified_through_line_key='JRTozai'),
 calendar_urn text NOT NULL,
 source_train_number text NOT NULL,
 public_train_number text NOT NULL,
 previous_kyobashi_departure text NOT NULL,
 junction_station_urn text NOT NULL,
 junction_arrival_clock text NOT NULL,
 official_source_url text NOT NULL,
 verification_scope text NOT NULL DEFAULT 'official_number_and_boundary_clock_only'
   CHECK (verification_scope='official_number_and_boundary_clock_only'),
 timetable_completeness text NOT NULL DEFAULT 'partial_source_only'
   CHECK (timetable_completeness='partial_source_only'),
 vehicle_type text NULL CHECK (vehicle_type IS NULL),
 vehicle_png_path text NULL CHECK (vehicle_png_path IS NULL),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false
   CHECK (actual_vehicle_confirmed=false),
 verified_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.published_jrwest_tozai_2611_source_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.published_jrwest_tozai_2611_source_links FROM PUBLIC,anon,authenticated;
CREATE INDEX IF NOT EXISTS published_jrwest_tozai_2611_number_idx
 ON public.published_jrwest_tozai_2611_source_links(public_train_number,calendar_urn);

-- Holiday import suffix H is part of the source record, not the public number.
-- The external pages supply only the independently checked Kyobashi clock
-- and the existing source-template junction clock; no timetable is copied.
WITH verified(source_id,source_number,public_number,calendar,junction,arrival,kyobashi,official) AS (
 VALUES
 (41568::bigint,'4622C','4622C','odpt.Calendar:Weekday','Shigino','13:02','13:00',
   'https://timetable.jr-odekake.net/train-timetable/190231?date=20261029'),
 (41569::bigint,'4622CH','4622C','odpt.Calendar:SaturdayHoliday','Shigino','13:02','13:00',
   'https://timetable.jr-odekake.net/train-timetable/190231?date=20261029'),
 (41436::bigint,'4526M','4526M','odpt.Calendar:Weekday','Shigino','06:45','06:42',
   'https://timetable.jr-odekake.net/train-timetable/191551?date=20261027'),
 (41440::bigint,'5420M','5420M','odpt.Calendar:Weekday','Hanaten','07:03','06:59',
   'https://timetable.jr-odekake.net/train-timetable/70241?date=20261023'),
 (41441::bigint,'5420MH','5420M','odpt.Calendar:SaturdayHoliday','Hanaten','07:03','06:59',
   'https://timetable.jr-odekake.net/train-timetable/70951?date=20261101')
), checked AS (
 SELECT v.*,m.line_key,m.calendar_urn,m.train_number,st.arrival_clock,st.arrival_station_urn
 FROM verified v
 JOIN public.manual_timetable_templates m ON m.id=v.source_id
  AND m.line_key='Gakkentoshi' AND m.calendar_urn=v.calendar
  AND m.train_number=v.source_number
  AND m.source_path='data/timetables/Gakkentoshi-manual.js'
 JOIN public.manual_timetable_template_stops st ON st.template_id=m.id
  AND st.stop_sequence=0 AND st.arrival_clock=v.arrival
  AND st.arrival_station_urn='odpt.Station:JR-West.Gakkentoshi.'||v.junction
)
INSERT INTO public.published_jrwest_tozai_2611_source_links
 (source_template_id,calendar_urn,source_train_number,public_train_number,
  previous_kyobashi_departure,junction_station_urn,junction_arrival_clock,official_source_url)
SELECT source_id,calendar,source_number,public_number,kyobashi,
 arrival_station_urn,arrival,official FROM checked
ON CONFLICT (source_template_id) DO NOTHING;

DO $guard$
BEGIN
 IF (SELECT count(*) FROM public.published_jrwest_tozai_2611_source_links
     WHERE edition='2611')<>5 THEN
   RAISE EXCEPTION 'JR Tozai source links need exactly five independently matched source templates';
 END IF;
 IF (SELECT count(*) FROM public.operation_family_rules
     WHERE code_pattern LIKE 'PLAN:OFFICIAL-JRW-%-207-321-202611'
       AND operator='JR-West'
       AND exact_vehicle_type IS NULL
       AND vehicle_candidates=ARRAY['JR西日本207系','JR西日本321系']::text[]
       AND plan_scope @> '{"planOnly":true,"authorizesPNG":false,"actualVehicleConfirmed":false}'::jsonb)<>2 THEN
   RAISE EXCEPTION 'JR Tozai/Gakkentoshi fleet must be multi-model reference only';
 END IF;
 IF EXISTS (SELECT 1 FROM public.published_jrwest_tozai_2611_source_links
   WHERE vehicle_type IS NOT NULL OR vehicle_png_path IS NOT NULL
      OR actual_vehicle_confirmed OR timetable_completeness<>'partial_source_only') THEN
   RAISE EXCEPTION 'source-only JR Tozai links cannot claim vehicle or full timetable';
 END IF;
END $guard$;
COMMIT;
