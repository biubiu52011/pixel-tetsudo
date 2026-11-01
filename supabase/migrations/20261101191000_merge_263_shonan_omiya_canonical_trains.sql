-- Source-verified weekday/holiday publication plans only; never daily actual runs.
-- Reconciles 263 reciprocal Omiya handovers, preserving existing canonical
-- IDs (including pre-existing 35 Ofuna Shonan/Tokaido two-segment runs).
CREATE TEMP TABLE _omiya_north ON COMMIT DROP AS
SELECT p.*, f.timetable_id root_id,t.timetable_id absorbed_id,
 (SELECT count(*)::int FROM public.train_timetable_members m WHERE m.timetable_id=f.timetable_id) root_member_count,
 (SELECT count(*)::int FROM public.train_timetable_stops s WHERE s.timetable_id=f.timetable_id) root_stop_count
FROM public.published_shonan_omiya_verified_boundary_sources p
JOIN public.train_timetable_members f ON f.source_template_id=p.from_template_id
JOIN public.train_timetable_members t ON t.source_template_id=p.to_template_id
WHERE p.from_line_key='ShonanShinjuku' AND p.to_line_key IN ('Takasaki','UtsunomiyaJR');
CREATE TEMP TABLE _omiya_south ON COMMIT DROP AS
SELECT p.*, t.timetable_id root_id,f.timetable_id absorbed_id,
 (SELECT count(*)::int FROM public.train_timetable_members m WHERE m.timetable_id=t.timetable_id) root_member_count,
 (SELECT count(*)::int FROM public.manual_timetable_template_stops s WHERE s.template_id=p.from_template_id) incoming_stop_count
FROM public.published_shonan_omiya_verified_boundary_sources p
JOIN public.train_timetable_members f ON f.source_template_id=p.from_template_id
JOIN public.train_timetable_members t ON t.source_template_id=p.to_template_id
WHERE p.to_line_key='ShonanShinjuku' AND p.from_line_key IN ('Takasaki','UtsunomiyaJR');

DO $pre$
DECLARE north_count integer; south_count integer;
BEGIN
 SELECT count(*) INTO north_count FROM _omiya_north;
 SELECT count(*) INTO south_count FROM _omiya_south;
 IF north_count<>131 OR south_count<>132 THEN
 RAISE EXCEPTION 'Unexpected source pairs north %, south %',north_count,south_count; END IF;
 IF EXISTS(SELECT 1 FROM (
   SELECT root_id FROM _omiya_north UNION ALL SELECT root_id FROM _omiya_south
 ) x GROUP BY root_id HAVING count(*)<>1)
 OR EXISTS(SELECT 1 FROM (
   SELECT absorbed_id FROM _omiya_north UNION ALL SELECT absorbed_id FROM _omiya_south
 ) x GROUP BY absorbed_id HAVING count(*)<>1)
 OR EXISTS(SELECT 1 FROM (
   SELECT from_template_id,to_template_id FROM _omiya_north
   UNION ALL SELECT from_template_id,to_template_id FROM _omiya_south
 ) x GROUP BY from_template_id HAVING count(*)<>1)
 OR EXISTS(SELECT 1 FROM (
   SELECT from_template_id,to_template_id FROM _omiya_north
   UNION ALL SELECT from_template_id,to_template_id FROM _omiya_south
 ) x GROUP BY to_template_id HAVING count(*)<>1)
 THEN RAISE EXCEPTION 'Ambiguous source pairing or canonical target'; END IF;
 IF EXISTS (
 SELECT 1 FROM (
   SELECT * FROM _omiya_north UNION ALL
   SELECT s.from_template_id,s.to_template_id,s.from_line_key,s.to_line_key,s.calendar_urn,s.train_number,
     s.source_revision_date,s.junction_station_urn,s.arrival_clock,s.departure_clock,
     s.connection_minutes,s.evidence,s.root_id,s.absorbed_id,s.root_member_count,s.incoming_stop_count
   FROM _omiya_south s
 ) p
 JOIN public.train_timetables root ON root.id=p.root_id
 JOIN public.train_timetables child ON child.id=p.absorbed_id
 WHERE root.id=child.id OR root.calendar_urn<>p.calendar_urn
 OR child.calendar_urn<>p.calendar_urn
 OR root.primary_train_number<>p.train_number OR child.primary_train_number<>p.train_number
 OR root.group_evidence NOT IN ('source_only','verified_continuation')
 OR child.group_evidence<>'source_only'
 OR p.root_member_count NOT BETWEEN 1 AND 2
 OR EXISTS(SELECT 1 FROM public.train_timetable_vehicle_mappings v WHERE v.timetable_id IN(root.id,child.id))
 OR EXISTS(SELECT 1 FROM public.train_timetable_operation_evidence v WHERE v.timetable_id IN(root.id,child.id))
 OR EXISTS(SELECT 1 FROM public.train_runs v WHERE v.canonical_timetable_id IN(root.id,child.id))
 OR (SELECT count(*) FROM public.train_timetable_members m WHERE m.timetable_id=child.id)<>1
 OR EXISTS(SELECT 1 FROM public.train_timetable_continuity c
           WHERE c.from_template_id=p.from_template_id OR c.to_template_id=p.to_template_id)
 ) THEN RAISE EXCEPTION 'Canonical references or published sources changed'; END IF;
 IF EXISTS(
 SELECT 1 FROM _omiya_north p
 WHERE NOT EXISTS (
 SELECT 1 FROM public.train_timetable_members m
 WHERE m.source_template_id=p.from_template_id AND m.timetable_id=p.root_id
   AND m.segment_order=p.root_member_count-1)
 OR p.root_stop_count<2
 ) THEN RAISE EXCEPTION 'Northward append root is not its last source segment'; END IF;
 IF EXISTS(
 SELECT 1 FROM _omiya_south p
 WHERE NOT EXISTS (
 SELECT 1 FROM public.train_timetable_members m
 WHERE m.source_template_id=p.to_template_id AND m.timetable_id=p.root_id
   AND m.segment_order=0 AND NOT m.merge_first_stop)
 OR p.incoming_stop_count<2
 ) THEN RAISE EXCEPTION 'Southward prepend root is not its first source segment'; END IF;
END
$pre$;

INSERT INTO public.train_timetable_continuity(
 from_template_id,to_template_id,junction_station_urn,
 arrival_clock,departure_clock,connection_minutes,evidence)
SELECT from_template_id,to_template_id,junction_station_urn,
 arrival_clock,departure_clock,connection_minutes,evidence
FROM _omiya_north
UNION ALL
SELECT from_template_id,to_template_id,junction_station_urn,
 arrival_clock,departure_clock,connection_minutes,evidence
FROM _omiya_south;

-- Northbound: append final Takasaki/Utsunomiya segment to the existing
-- canonical train. It may already include an upstream Tokaido segment.
UPDATE public.train_timetable_members m SET
 timetable_id=p.root_id,segment_order=p.root_member_count,
 member_role='verified_continuation',stop_offset=p.root_stop_count,
 merge_first_stop=true
FROM _omiya_north p WHERE m.source_template_id=p.to_template_id
 AND m.timetable_id=p.absorbed_id;
UPDATE public.train_timetables t SET group_evidence='verified_continuation'
FROM _omiya_north p WHERE t.id=p.root_id;
DELETE FROM public.train_timetables t USING _omiya_north p
WHERE t.id=p.absorbed_id AND NOT EXISTS(
 SELECT 1 FROM public.train_timetable_members m WHERE m.timetable_id=t.id);

-- Southbound: prepend the Takasaki/Utsunomiya first segment but RETAIN
-- the former Shonan canonical timetable_id, including any downstream
-- Tokaido third segment and all of its immutable source evidence.
UPDATE public.train_timetable_members m SET
 segment_order=m.segment_order+1,
 stop_offset=CASE WHEN m.source_template_id=p.to_template_id
   THEN p.incoming_stop_count
   ELSE m.stop_offset + p.incoming_stop_count-1 END,
 merge_first_stop=CASE WHEN m.source_template_id=p.to_template_id
   THEN true ELSE m.merge_first_stop END,
 member_role='verified_continuation'
FROM _omiya_south p WHERE m.timetable_id=p.root_id;
UPDATE public.train_timetable_members m SET
 timetable_id=p.root_id,segment_order=0,member_role='primary',
 stop_offset=0,merge_first_stop=false
FROM _omiya_south p WHERE m.source_template_id=p.from_template_id
 AND m.timetable_id=p.absorbed_id;
UPDATE public.train_timetables t SET group_evidence='verified_continuation',
 lead_source_template_id=p.from_template_id
FROM _omiya_south p WHERE t.id=p.root_id;
DELETE FROM public.train_timetables t USING _omiya_south p
WHERE t.id=p.absorbed_id AND NOT EXISTS(
 SELECT 1 FROM public.train_timetable_members m WHERE m.timetable_id=t.id);

DO $post$
DECLARE correctly_merged integer;
BEGIN
 SELECT count(*) INTO correctly_merged FROM (
 SELECT root_id,from_template_id,to_template_id FROM _omiya_north
 UNION ALL SELECT root_id,from_template_id,to_template_id FROM _omiya_south
 ) p JOIN public.train_timetables t ON t.id=p.root_id
 WHERE t.group_evidence='verified_continuation'
 AND EXISTS(SELECT 1 FROM public.train_timetable_members m WHERE m.source_template_id=p.from_template_id AND m.timetable_id=p.root_id)
 AND EXISTS(SELECT 1 FROM public.train_timetable_members m WHERE m.source_template_id=p.to_template_id AND m.timetable_id=p.root_id)
 AND (SELECT count(*) FROM public.train_timetable_members m WHERE m.timetable_id=p.root_id) IN (2,3)
 AND (SELECT count(*) FROM public.train_timetable_stops s WHERE s.timetable_id=p.root_id)=
 (SELECT sum(c.n)::integer-count(*)::integer+1 FROM public.train_timetable_members m
  CROSS JOIN LATERAL(SELECT count(*)::integer n FROM public.manual_timetable_template_stops st WHERE st.template_id=m.source_template_id)c
  WHERE m.timetable_id=p.root_id)
 AND (SELECT count(DISTINCT s.stop_sequence) FROM public.train_timetable_stops s WHERE s.timetable_id=p.root_id)=
 (SELECT count(*) FROM public.train_timetable_stops s WHERE s.timetable_id=p.root_id);
 IF correctly_merged<>263 THEN RAISE EXCEPTION 'Omiya canonical merge postcheck failed: % / 263',correctly_merged; END IF;
END
$post$;