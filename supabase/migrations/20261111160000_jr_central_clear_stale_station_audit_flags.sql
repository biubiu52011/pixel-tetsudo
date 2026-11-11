-- JR-Central: reconcile 11 historic missing-station flags after 2026-11-11
-- station registration and N02-2024 geometry migrations.
-- No train templates, coverage acceptance, or live position is changed.
BEGIN;
SELECT pg_advisory_xact_lock(2026111116);
DO $check$
DECLARE v_count integer;
BEGIN
 SELECT count(*) INTO v_count
 FROM public.published_timetable_coverage_audit c
 JOIN public.line_data_inventory d ON d.line_key=c.line_key
 JOIN public.railway_lines l ON l.id=c.line_key
 WHERE l.timetable_operator='JR-Central'
  AND d.data_kind='station_topology_only'
  AND c.issues @> ARRAY['NO_STATION_REGISTRY']::text[]
  AND c.template_count=0 AND c.coverage_status='missing_all_plans'
  AND (SELECT count(*) FROM public.line_stations s WHERE s.line_id=l.id)=
   CASE l.id
    WHEN 'Gotemba' THEN 19 WHEN 'Iida' THEN 94
    WHEN 'KansaiCentral' THEN 18 WHEN 'KiseiCentral' THEN 41
    WHEN 'Meisho' THEN 15 WHEN 'MinoAkasaka' THEN 3
    WHEN 'Minobu' THEN 39 WHEN 'Sangu' THEN 10
    WHEN 'Taita' THEN 8 WHEN 'Takayama' THEN 45
    WHEN 'Taketoyo' THEN 10 ELSE -1 END
  AND NOT EXISTS(
    SELECT 1 FROM public.line_stations s
    LEFT JOIN public.stations station ON station.id=s.station_name
    WHERE s.line_id=l.id AND station.id IS NULL);
 IF v_count<>11 THEN
  RAISE EXCEPTION 'JRC_STALE_STATION_PRECHECK_FAILED: expected 11 got %',v_count;
 END IF;
END $check$;

UPDATE public.published_timetable_coverage_audit c
SET issues=array_remove(c.issues,'NO_STATION_REGISTRY'),checked_at=now()
FROM public.line_data_inventory d
WHERE d.line_key=c.line_key AND d.data_kind='station_topology_only'
 AND c.line_key IN(
  SELECT id FROM public.railway_lines WHERE timetable_operator='JR-Central'
 )
 AND c.issues @> ARRAY['NO_STATION_REGISTRY']::text[];

UPDATE public.line_data_inventory d
SET notes='2026-11-11: all current canonical stations and coordinates '
 ||'registered from existing station order and MLIT N02-2024 operator-scoped '
 ||'geography (CC BY 4.0; see docs/audits/jr-central-n02-2024-geo-20261111.md). '
 ||'Topology only: no verified 2026-11 train numbers, stop clocks, '
 ||'weekday/holiday full-day coverage or actual vehicle identities.',
 updated_at=now()
WHERE d.data_kind='station_topology_only'
 AND d.line_key IN (
 SELECT id FROM public.railway_lines WHERE timetable_operator='JR-Central');

DO $verify$
DECLARE v_count integer;
BEGIN
 SELECT count(*) INTO v_count
 FROM public.published_timetable_full_day_acceptance a
 JOIN public.line_data_inventory d ON d.line_key=a.line_key
 WHERE d.data_kind='station_topology_only'
   AND a.line_key IN (
    SELECT id FROM public.railway_lines WHERE timetable_operator='JR-Central')
   AND a.registered_station_count>0
   AND a.published_source_templates=0
   AND a.raw_coverage_status='missing_all_plans'
   AND a.acceptance_status='blocked_no_published_trains'
   AND NOT a.full_day_timetable_acceptance_passed
   AND NOT (a.source_audit_issues @> ARRAY['NO_STATION_REGISTRY']::text[])
   AND a.source_audit_issues @>
     ARRAY['NO_PUBLISHED_WEEKDAY_TRAIN_PLAN','NO_PUBLISHED_SATURDAY_HOLIDAY_TRAIN_PLAN']::text[];
 IF v_count<>11 THEN
  RAISE EXCEPTION 'JRC_STALE_STATION_AUDIT_VERIFY_FAILED: %',v_count;
 END IF;
END $verify$;
COMMIT;
