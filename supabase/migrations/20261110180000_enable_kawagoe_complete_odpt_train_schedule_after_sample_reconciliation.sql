-- Kawagoe JR-East west (Kawagoe<->Komagawa), NOT SaikyoKawagoe.
-- Original 5 JR East 2610 official sample train templates each match all six
-- station clocks in the currently available 2026-07-17 ODPT train feed.
-- Independently checked the November 2611 departure boards: 47+46/day.
-- Existing canonical importer rejects a second independent source; reconcile
-- these five prior source rows to its source identity BEFORE using its RPC.
-- The importer will replace them atomically, retaining the same train numbers.
BEGIN;
SELECT pg_advisory_xact_lock(2611525);
DO $preflight$
DECLARE c integer; continuations integer;
BEGIN
 SELECT count(*) INTO c FROM public.manual_timetable_templates t
 WHERE t.line_key='Kawagoe' AND t.source_path='official-sampled:jreast:2610:Kawagoe'
   AND t.calendar_urn IN ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
   AND t.train_number IN ('663H','665H','773H','1178H','1776H');
 IF c<>5 OR (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='Kawagoe')<>5
 THEN RAISE EXCEPTION 'KAWAGOE_SAMPLE_SOURCE_CHANGED'; END IF;
 SELECT count(*) INTO continuations FROM public.train_timetable_continuity c
 JOIN public.manual_timetable_templates t ON t.id=c.from_template_id OR t.id=c.to_template_id
 WHERE t.line_key='Kawagoe';
 IF continuations<>0 THEN RAISE EXCEPTION 'KAWAGOE_SAMPLE_HAS_CANONICAL_CONTINUATION'; END IF;
 IF EXISTS (SELECT 1 FROM public.manual_timetable_templates t
  JOIN public.train_timetable_members m ON m.source_template_id=t.id
  JOIN public.train_timetable_vehicle_mappings vm ON vm.timetable_id=m.timetable_id
  WHERE t.line_key='Kawagoe')
 THEN RAISE EXCEPTION 'KAWAGOE_SAMPLE_VEHICLE_MAPPING_MUST_BE_RECONCILED'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.railway_lines WHERE id='Kawagoe'
   AND odpt_operator='JR-East' AND odpt_railway='Kawagoe'
   AND odpt_base_url='https://api-challenge.odpt.org/api/v4/'
   AND timetable_api_enabled=false)
 THEN RAISE EXCEPTION 'KAWAGOE_API_LINE_CONFIG_CHANGED'; END IF;
END $preflight$;
UPDATE public.railway_lines SET timetable_api_enabled=true WHERE id='Kawagoe';
UPDATE public.manual_timetable_templates SET source_path='odpt-api:v1:Kawagoe'
WHERE line_key='Kawagoe' AND source_path='official-sampled:jreast:2610:Kawagoe';
COMMIT;
