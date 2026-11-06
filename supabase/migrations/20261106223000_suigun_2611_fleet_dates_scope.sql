-- Water-gun / Suigun JR East edition 2611: two separate source railways,
-- 0-subseries KiHa E130 only for ordinary trains; a dated Kazekko
-- excursion has NO approved dedicated image.
-- Official train-number and service-date tables:
-- https://timetables.jreast.co.jp/2611/timetable-v/243u1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/243u2.html
-- https://timetables.jreast.co.jp/2611/timetable-v/243d1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/243d2.html
-- https://www.jreast.co.jp/suspend/
-- https://www.jreast.co.jp/train/local/kiha_e130.html
BEGIN;
SELECT pg_advisory_xact_lock(2611243);
CREATE TABLE IF NOT EXISTS public.published_suigun_2611_fleet_scope (
 edition text NOT NULL CHECK (edition='2611'),
 line_key text NOT NULL CHECK (line_key IN ('Suigun','SuigunBranch')),
 source_template_id bigint PRIMARY KEY REFERENCES public.manual_timetable_templates(id),
 calendar_urn text NOT NULL,
 direction_urn text NOT NULL,
 train_number text NOT NULL,
 source_type_urn text NOT NULL,
 published_type_urn text NOT NULL,
 source_occurrence integer NOT NULL,
 fleet_role text NOT NULL CHECK(fleet_role IN ('kiha_e130_0_reference','kazekko_excursion_no_png')),
 candidate_models text[] NOT NULL,
 illustration_model text,
 png_reference text,
 operating_dates text[] NOT NULL DEFAULT '{}'::text[],
 excluded_dates text[] NOT NULL DEFAULT '{}'::text[],
 number_evidence_scope text NOT NULL,
 source_url text NOT NULL,
 reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 CHECK((fleet_role='kazekko_excursion_no_png' AND illustration_model IS NULL
  AND png_reference IS NULL AND cardinality(candidate_models)=0)
  OR (fleet_role='kiha_e130_0_reference' AND
   illustration_model='キハE130系0番台' AND
   png_reference='../images/列车/JR東日本/JR東日本_キハE130系0番台.png'
   AND candidate_models=ARRAY['キハE130系0番台']::text[]))
);
ALTER TABLE public.published_suigun_2611_fleet_scope ENABLE ROW LEVEL SECURITY;
WITH source AS (
 SELECT m.*,
 CASE WHEN m.line_key='Suigun' AND m.train_number IN('9821D','9822D')
  THEN 'kazekko_excursion_no_png' ELSE 'kiha_e130_0_reference' END AS role
 FROM public.manual_timetable_templates m
 WHERE m.line_key IN ('Suigun','SuigunBranch')
 AND m.railway_urn='odpt.Railway:JR-East.'||m.line_key
 AND m.calendar_urn IN('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
 AND m.direction_urn IN('odpt.RailDirection:Inbound','odpt.RailDirection:Outbound')
 AND m.train_type_urn='odpt.TrainType:JR-East.Local'
 AND m.train_number ~ '^[0-9]{3,4}D$'
 -- Old manual timetable contains duplicate, wrong-timed seasonal trains:
 -- 9821D actual Mito 09:40 -> Daigo 11:12 (occurrence=0).
 -- 9822D actual Daigo 16:14 -> Mito 17:46 (occurrence=1).
 -- 341D second holiday source is an obsolete, partial-time variation.
 AND NOT (m.line_key='Suigun' AND (
  (m.train_number='9821D' AND m.source_occurrence=1)
  OR (m.train_number='9822D' AND m.source_occurrence=0)
  OR (m.train_number='341D' AND m.calendar_urn='odpt.Calendar:SaturdayHoliday'
      AND m.source_occurrence=1)
 ))
)
INSERT INTO public.published_suigun_2611_fleet_scope(
 edition,line_key,source_template_id,calendar_urn,direction_urn,train_number,
 source_type_urn,published_type_urn,source_occurrence,fleet_role,
 candidate_models,illustration_model,png_reference,operating_dates,
 excluded_dates,number_evidence_scope,source_url)
SELECT '2611',line_key,id,calendar_urn,direction_urn,train_number,
 train_type_urn,
 CASE WHEN role='kazekko_excursion_no_png' THEN
   'odpt.TrainType:JR-East.Rapid' ELSE train_type_urn END,
 source_occurrence,role,
 CASE WHEN role='kazekko_excursion_no_png' THEN ARRAY[]::text[]
   ELSE ARRAY['キハE130系0番台']::text[] END,
 CASE WHEN role='kazekko_excursion_no_png' THEN NULL
   ELSE 'キハE130系0番台' END,
 CASE WHEN role='kazekko_excursion_no_png' THEN NULL
   ELSE '../images/列车/JR東日本/JR東日本_キハE130系0番台.png' END,
 CASE
  WHEN role='kazekko_excursion_no_png' THEN ARRAY['2026-11-14','2026-11-15']::text[]
  WHEN line_key='Suigun' AND train_number IN('8325D','8326D') THEN
    ARRAY['2026-11-01','2026-11-02','2026-11-03','2026-11-07','2026-11-08','2026-11-14','2026-11-15','2026-11-21','2026-11-22','2026-11-23','2026-11-26','2026-11-27','2026-11-28','2026-11-29','2026-11-30']::text[]
  WHEN line_key='Suigun' AND train_number='9324D' THEN
    ARRAY['2026-11-17','2026-11-18','2026-11-19']::text[]
  WHEN line_key='Suigun' AND train_number='9329D' AND source_occurrence=0 THEN
    ARRAY['2026-11-10','2026-11-11','2026-11-12']::text[]
  WHEN line_key='Suigun' AND train_number='9329D' AND source_occurrence=1 THEN
    ARRAY['2026-11-17','2026-11-18','2026-11-19']::text[]
  WHEN line_key='Suigun' AND train_number='9841D' THEN
    ARRAY['2026-11-21']::text[]
  ELSE ARRAY[]::text[] END,
 CASE WHEN line_key='Suigun' AND train_number='341D'
   AND calendar_urn='odpt.Calendar:SaturdayHoliday' THEN ARRAY['2026-11-22']::text[]
  ELSE ARRAY[]::text[] END,
 CASE WHEN role='kazekko_excursion_no_png' OR
   (line_key='Suigun' AND train_number IN('9324D','9329D','8325D','8326D','9841D'))
  THEN 'official-2611-number-and-dated-service'
  ELSE 'historical-source-number-with-2611-line-roster' END,
 CASE WHEN role='kazekko_excursion_no_png' THEN
   CASE WHEN direction_urn='odpt.RailDirection:Outbound'
    THEN 'https://timetables.jreast.co.jp/2611/train/185/188641.html'
    ELSE 'https://timetables.jreast.co.jp/2611/train/185/188651.html' END
 ELSE 'https://timetables.jreast.co.jp/2611/timetable-v/243'||
   CASE WHEN direction_urn='odpt.RailDirection:Inbound' THEN 'u' ELSE 'd' END||
   CASE WHEN calendar_urn='odpt.Calendar:Weekday' THEN '1' ELSE '2' END||'.html'
 END
FROM source
ON CONFLICT (source_template_id) DO UPDATE SET
 calendar_urn=EXCLUDED.calendar_urn,direction_urn=EXCLUDED.direction_urn,
 train_number=EXCLUDED.train_number,source_type_urn=EXCLUDED.source_type_urn,
 published_type_urn=EXCLUDED.published_type_urn,
 source_occurrence=EXCLUDED.source_occurrence,fleet_role=EXCLUDED.fleet_role,
 candidate_models=EXCLUDED.candidate_models,
 illustration_model=EXCLUDED.illustration_model,
 png_reference=EXCLUDED.png_reference,
 operating_dates=EXCLUDED.operating_dates,excluded_dates=EXCLUDED.excluded_dates,
 number_evidence_scope=EXCLUDED.number_evidence_scope,source_url=EXCLUDED.source_url;
-- Correct source generic labels only for approved reference records; don't
-- overwrite original stop times, direction, calendar, canonical identity.
UPDATE public.manual_timetable_templates m SET
 vehicle_type_label=CASE WHEN s.fleet_role='kazekko_excursion_no_png'
  THEN NULL ELSE 'キハE130系0番台' END
FROM public.published_suigun_2611_fleet_scope s
WHERE s.source_template_id=m.id AND m.line_key=s.line_key;
-- Quarantine obsolete duplicate rows without deleting historic evidence.
UPDATE public.manual_timetable_templates SET vehicle_type_label=NULL
WHERE id IN (65703,65797,65727) AND line_key='Suigun';
DO $check$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates
      WHERE line_key IN('Suigun','SuigunBranch'))<>218
 OR (SELECT count(*) FROM public.published_suigun_2611_fleet_scope)<>215
 OR (SELECT count(*) FROM public.published_suigun_2611_fleet_scope
      WHERE line_key='Suigun' AND calendar_urn='odpt.Calendar:Weekday')<>76
 OR (SELECT count(*) FROM public.published_suigun_2611_fleet_scope
      WHERE line_key='Suigun' AND calendar_urn='odpt.Calendar:SaturdayHoliday')<>83
 OR (SELECT count(*) FROM public.published_suigun_2611_fleet_scope
      WHERE line_key='SuigunBranch' AND calendar_urn='odpt.Calendar:Weekday')<>26
 OR (SELECT count(*) FROM public.published_suigun_2611_fleet_scope
      WHERE line_key='SuigunBranch' AND calendar_urn='odpt.Calendar:SaturdayHoliday')<>30
 OR (SELECT count(*) FROM public.published_suigun_2611_fleet_scope
      WHERE fleet_role='kazekko_excursion_no_png')<>2
 OR EXISTS (SELECT 1 FROM public.published_suigun_2611_fleet_scope
      WHERE actual_vehicle_confirmed OR NOT reference_only)
 OR EXISTS (SELECT 1 FROM public.published_suigun_2611_fleet_scope
      WHERE fleet_role='kazekko_excursion_no_png' AND
         (png_reference IS NOT NULL OR cardinality(candidate_models)<>0))
 THEN RAISE EXCEPTION 'Suigun 2611 scope mismatch'; END IF;
END $check$;
COMMIT;
