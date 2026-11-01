-- Re-runnable guard for 35 publication-plan ShonanShinjuku/Tokaido
-- continuations at Ofuna. Executes no daily run or actual carset updates.
-- The view requires reciprocal ODPT source trip IDs, exact boundary clocks
-- and consistent calendars and source revisions.
CREATE TEMP TABLE _shonan_tokaido_merge ON COMMIT DROP AS
SELECT p.*, a.timetable_id root_id,b.timetable_id child_id,
 (SELECT count(*)::integer FROM public.manual_timetable_template_stops s
  WHERE s.template_id=p.from_template_id) root_count,
 (SELECT count(*)::integer FROM public.manual_timetable_template_stops s
  WHERE s.template_id=p.to_template_id) child_count
FROM public.published_shonan_verified_boundary_sources p
JOIN public.train_timetable_members a ON a.source_template_id=p.from_template_id
JOIN public.train_timetable_members b ON b.source_template_id=p.to_template_id
WHERE (p.from_line_key='Tokaido' OR p.to_line_key='Tokaido')
 AND a.timetable_id<>b.timetable_id;

DO $pre$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM _shonan_tokaido_merge;
 IF n NOT IN (0,35) THEN RAISE EXCEPTION 'Unexpected pending Ofuna merges: %',n; END IF;
 IF EXISTS(
  SELECT 1 FROM _shonan_tokaido_merge p
  JOIN public.train_timetables a ON a.id=p.root_id
  JOIN public.train_timetables b ON b.id=p.child_id
  WHERE a.group_evidence<>'source_only' OR b.group_evidence<>'source_only'
  OR a.lead_source_template_id<>p.from_template_id
  OR b.lead_source_template_id<>p.to_template_id
  OR a.calendar_urn<>p.calendar_urn OR b.calendar_urn<>p.calendar_urn
  OR a.primary_train_number<>p.train_number OR b.primary_train_number<>p.train_number
  OR p.root_count<2 OR p.child_count<2
  OR (SELECT count(*) FROM public.train_timetable_members x WHERE x.timetable_id=a.id)<>1
  OR (SELECT count(*) FROM public.train_timetable_members x WHERE x.timetable_id=b.id)<>1
  OR EXISTS(SELECT 1 FROM public.train_timetable_vehicle_mappings x WHERE x.timetable_id IN(a.id,b.id))
  OR EXISTS(SELECT 1 FROM public.train_timetable_operation_evidence x WHERE x.timetable_id IN(a.id,b.id))
  OR EXISTS(SELECT 1 FROM public.train_runs x WHERE x.canonical_timetable_id IN(a.id,b.id))
  OR EXISTS(SELECT 1 FROM public.train_timetable_continuity x
            WHERE x.from_template_id=p.from_template_id OR x.to_template_id=p.to_template_id)
 ) THEN RAISE EXCEPTION 'Unsafe canonical merge, leave sources unchanged'; END IF;
 IF EXISTS (SELECT 1 FROM _shonan_tokaido_merge GROUP BY root_id HAVING count(*)<>1)
 OR EXISTS (SELECT 1 FROM _shonan_tokaido_merge GROUP BY child_id HAVING count(*)<>1)
 THEN RAISE EXCEPTION 'Canonical root/child not one-to-one'; END IF;
END
$pre$;
INSERT INTO public.train_timetable_continuity(
  from_template_id,to_template_id,junction_station_urn,arrival_clock,
  departure_clock,connection_minutes,evidence)
SELECT from_template_id,to_template_id,junction_station_urn,arrival_clock,
  departure_clock,0,'reciprocal_source_ids_station_time_revision'
FROM _shonan_tokaido_merge;
UPDATE public.train_timetable_members m SET
 timetable_id=p.root_id,segment_order=1,member_role='verified_continuation',
 stop_offset=p.root_count,merge_first_stop=true
FROM _shonan_tokaido_merge p
WHERE m.source_template_id=p.to_template_id AND m.timetable_id=p.child_id;
UPDATE public.train_timetables t SET group_evidence='verified_continuation'
FROM _shonan_tokaido_merge p WHERE t.id=p.root_id;
DELETE FROM public.train_timetables t USING _shonan_tokaido_merge p
WHERE t.id=p.child_id AND NOT EXISTS (
 SELECT 1 FROM public.train_timetable_members m WHERE m.timetable_id=t.id);
DO $post$
DECLARE expected integer;
BEGIN
 SELECT count(*) INTO expected FROM _shonan_tokaido_merge;
 IF (SELECT count(*) FROM _shonan_tokaido_merge p
     JOIN public.train_timetables t ON t.id=p.root_id
     WHERE t.group_evidence='verified_continuation'
       AND (SELECT count(*) FROM public.train_timetable_members m WHERE m.timetable_id=t.id)=2
       AND EXISTS(SELECT 1 FROM public.train_timetable_members m
         WHERE m.source_template_id=p.to_template_id AND m.timetable_id=t.id
           AND m.member_role='verified_continuation' AND m.merge_first_stop
           AND m.stop_offset=p.root_count)
       AND (SELECT count(*) FROM public.train_timetable_stops s
            WHERE s.timetable_id=t.id)=p.root_count+p.child_count-1
       AND (SELECT count(DISTINCT s.stop_sequence) FROM public.train_timetable_stops s
            WHERE s.timetable_id=t.id)=p.root_count+p.child_count-1
    )<>expected THEN
   RAISE EXCEPTION 'Canonical stop/membership verification failed'; END IF;
END
$post$;
