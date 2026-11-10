-- Kawagoe West: materialize direct H train-number + service-date ->
-- crowdsourced vehicle model/formation observations into the EXISTING table.
-- The 61-79 common working supplies source reconciliation ONLY.
-- Runtime lookup must use service date and train number directly.
-- The crowd observation is grade C (illustrative, not confirmed physical ID).
BEGIN;
SELECT pg_advisory_xact_lock(2611528);
DO $guard$
BEGIN
 IF (SELECT count(*) FROM public.train_timetable_operation_evidence op
     JOIN public.manual_timetable_templates t ON t.id=op.source_template_id
     WHERE t.line_key='Kawagoe')<>186 OR
    (SELECT count(*) FROM public.published_kawagoe_2611_source_roster)<>186 OR
    (SELECT count(*) FROM public.operation_vehicle_observations
     WHERE operator='JR-East' AND network_key='odpt.Railway:JR-East.Kawagoe'
       AND service_date IN ('2026-11-09','2026-11-10'))<>18 OR
    EXISTS (SELECT 1 FROM public.train_vehicle_observations
     WHERE network_key='odpt.Railway:JR-East.Kawagoe'
       AND service_date IN ('2026-11-09','2026-11-10'))
 THEN RAISE EXCEPTION 'KAWAGOE_DATE_NUMBER_SOURCE_CONFLICT'; END IF;
END $guard$;
CREATE TEMP TABLE _kw_direct ON COMMIT DROP AS
SELECT o.service_date,t.id source_template_id,t.train_number,
 o.vehicle_type,o.formation_ids,o.source_id,
 (SELECT s.departure_clock FROM public.manual_timetable_template_stops s
  WHERE s.template_id=t.id ORDER BY s.stop_sequence LIMIT 1) departure_clock,
 (SELECT s.arrival_clock FROM public.manual_timetable_template_stops s
  WHERE s.template_id=t.id ORDER BY s.stop_sequence DESC LIMIT 1) arrival_clock
FROM public.manual_timetable_templates t
JOIN public.train_timetable_operation_evidence op ON op.source_template_id=t.id
JOIN public.operation_vehicle_observations o
  ON o.operation_code=op.operation_code AND o.operator='JR-East'
  AND o.network_key='odpt.Railway:JR-East.Kawagoe'
  AND o.service_date IN ('2026-11-09','2026-11-10')
JOIN public.evidence_sources e ON e.id=o.source_id
WHERE t.line_key='Kawagoe'
 AND t.calendar_urn='odpt.Calendar:Weekday'
 AND t.railway_urn='odpt.Railway:JR-East.Kawagoe'
 AND (o.valid_from_time IS NULL OR
  (SELECT s.departure_clock FROM public.manual_timetable_template_stops s
   WHERE s.template_id=t.id ORDER BY s.stop_sequence LIMIT 1)::time >=o.valid_from_time)
 AND (o.valid_to_time IS NULL OR
  (SELECT s.departure_clock FROM public.manual_timetable_template_stops s
   WHERE s.template_id=t.id ORDER BY s.stop_sequence LIMIT 1)::time <o.valid_to_time)
 AND e.source_type='observation' AND e.evidence_grade='C'
 AND e.source_key='kw-reported-'||to_char(o.service_date,'YYYYMMDD')
 AND e.source_url='https://loo-ool.com/rail/W/00/'||
  to_char(o.service_date,'YYYYMMDD')||'/'
 AND (o.vehicle_type='E231系3000番台'
      AND o.formation_ids<@ARRAY['ハエ41','ハエ42','ハエ43','ハエ44','ハエ45','ハエ46']::text[]
    OR o.vehicle_type='209系3500番台'
      AND o.formation_ids<@ARRAY['ハエ51','ハエ52','ハエ53','ハエ54','ハエ55']::text[])
 AND cardinality(o.formation_ids)=1;
DO $check$
BEGIN
 IF (SELECT count(*) FROM _kw_direct)<>164 OR
    (SELECT count(*) FROM _kw_direct WHERE service_date='2026-11-09')<>93 OR
    (SELECT count(*) FROM _kw_direct WHERE service_date='2026-11-10')<>71 OR
    EXISTS (SELECT 1 FROM (
      SELECT service_date,train_number FROM _kw_direct
      GROUP BY service_date,train_number HAVING count(*)>1) dup)
    OR EXISTS (SELECT 1 FROM _kw_direct
      WHERE departure_clock IS NULL OR arrival_clock IS NULL OR
        source_template_id IS NULL OR source_id IS NULL OR
        train_number !~ '^[0-9]{3,4}H$')
 THEN RAISE EXCEPTION 'KAWAGOE_DATE_NUMBER_DIRECT_MAPPING_COVERAGE_DRIFT';
 END IF;
END $check$;
WITH n AS (
 SELECT *,row_number() OVER(ORDER BY service_date,train_number) rn FROM _kw_direct
)
INSERT INTO public.train_vehicle_observations
 (id,service_date,operator,network_key,train_number,vehicle_type,
  formation_ids,observed_date,source_id)
SELECT (SELECT COALESCE(MAX(id),0) FROM public.train_vehicle_observations)+rn,
 service_date,'JR-East','odpt.Railway:JR-East.Kawagoe',
 train_number,vehicle_type,formation_ids,service_date,source_id
FROM n;
DO $post$
BEGIN
 IF (SELECT count(*) FROM public.train_vehicle_observations
   WHERE network_key='odpt.Railway:JR-East.Kawagoe'
   AND service_date IN ('2026-11-09','2026-11-10'))<>164
 THEN RAISE EXCEPTION 'KAWAGOE_DIRECT_OBSERVATIONS_POSTCHECK_FAILED'; END IF;
END $post$;
COMMIT;
