-- Operator correction for New Shuttle, not the Saitama Rapid Railway.
-- Railway line ID and historical source URNs deliberately remain unchanged.
-- Official: https://www.new-shuttle.jp/company/resume/
-- No train times, vehicle types, dated operations, or actual formations.
BEGIN;
DO $check$
BEGIN
 IF (SELECT count(*) FROM public.railway_lines
     WHERE id='NewShuttle'
       AND timetable_operator='SaitamaRailway'
       AND sql_planned_fallback_enabled=true)<>1
 OR (SELECT count(*) FROM public.railway_lines
     WHERE id='SaitamaRapid'
       AND timetable_operator='SaitamaRailway')<>1
 THEN RAISE EXCEPTION 'Operator correction precondition failed; no changes applied'; END IF;
END $check$;
UPDATE public.railway_lines
SET timetable_operator='SaitamaNewUrbanTransit'
WHERE id='NewShuttle' AND timetable_operator='SaitamaRailway';
DO $check$
BEGIN
 IF (SELECT timetable_operator FROM public.railway_lines WHERE id='NewShuttle')
       IS DISTINCT FROM 'SaitamaNewUrbanTransit'
 OR (SELECT timetable_operator FROM public.railway_lines WHERE id='SaitamaRapid')
       IS DISTINCT FROM 'SaitamaRailway'
 THEN RAISE EXCEPTION 'Unexpected operator metadata state'; END IF;
END $check$;
COMMIT;