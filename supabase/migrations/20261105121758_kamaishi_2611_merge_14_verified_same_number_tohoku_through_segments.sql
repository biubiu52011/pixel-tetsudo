-- JR East 2026-Nov Kamaishi 979d1,d2,u1,u2 / TohokuMain 248:
-- Seven ordinary/Hamayuri train NUMBER identities continue across
-- Hanamaki on both calendar templates (14 source pairs).
-- Four southbound: 3657D,3665D,1667D,1669D (Morioka->Kamaishi)
-- Three northbound: 1652D,1654D,1668D (Kamaishi/Tono->Morioka)
-- Match official train number, both source line IDs, calendar, exact
-- arrival and departure at Hanamaki. NEVER merge by number alone;
-- Ou/Gono/etc may reuse these suffixes.
-- Sources:
-- https://timetables.jreast.co.jp/2611/timetable-v/979d1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/979u1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/248u1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/248d1.html
BEGIN;
SELECT pg_advisory_xact_lock(26111667);
ALTER TABLE public.train_timetable_continuity
 DROP CONSTRAINT train_timetable_continuity_evidence_check;
ALTER TABLE public.train_timetable_continuity
 ADD CONSTRAINT train_timetable_continuity_evidence_check CHECK (
 (evidence='reciprocal_source_ids_station_time_revision'
  AND arrival_clock IS NOT NULL AND departure_clock IS NOT NULL
  AND connection_minutes IS NOT NULL)
 OR (evidence='reciprocal_source_ids_passing_station_revision'
  AND arrival_clock IS NULL AND departure_clock IS NULL
  AND connection_minutes IS NULL AND bracket_departure_clock IS NOT NULL
  AND bracket_arrival_clock IS NOT NULL)
 OR (evidence='reciprocal_source_ids_single_boundary_clock_revision'
  AND ((arrival_clock IS NULL) <> (departure_clock IS NULL))
  AND connection_minutes IS NULL AND bracket_departure_clock IS NOT NULL
  AND bracket_arrival_clock IS NOT NULL)
 OR (evidence='official_named_train_station_time_2611'
  AND arrival_clock IS NOT NULL AND departure_clock IS NOT NULL
  AND connection_minutes=0 AND bracket_departure_clock IS NULL
  AND bracket_arrival_clock IS NULL)
 OR (evidence='official_2611_same_number_boundary_clock'
  AND arrival_clock IS NOT NULL AND departure_clock IS NOT NULL
  AND connection_minutes=0 AND bracket_departure_clock IS NULL
  AND bracket_arrival_clock IS NULL)
);
CREATE TABLE IF NOT EXISTS public.published_kamaishi_2611_regular_through_segments (
 train_number text NOT NULL,calendar_urn text NOT NULL,
 from_template_id bigint NOT NULL REFERENCES public.manual_timetable_templates(id),
 to_template_id bigint NOT NULL REFERENCES public.manual_timetable_templates(id),
 from_line_key text NOT NULL,to_line_key text NOT NULL,
 junction_station_urn text NOT NULL
   CHECK(junction_station_urn='odpt.Station:JR-East.Hanamaki'),
 arrival_clock text NOT NULL,departure_clock text NOT NULL,
 official_kamaishi_url text NOT NULL,official_tohoku_url text NOT NULL,
 canonical_timetable_id bigint NOT NULL REFERENCES public.train_timetables(id),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 PRIMARY KEY(train_number,calendar_urn),CHECK(from_template_id<>to_template_id)
);
ALTER TABLE public.published_kamaishi_2611_regular_through_segments ENABLE ROW LEVEL SECURITY;

CREATE TEMP TABLE _kamaishi_2611_same_number_pairs ON COMMIT DROP AS
WITH seeds(number,flow) AS (
 VALUES ('3657D','southbound'),('3665D','southbound'),
        ('1667D','southbound'),('1669D','southbound'),
        ('1652D','northbound'),('1654D','northbound'),
        ('1668D','northbound')
), chosen AS (
 SELECT seed.number,seed.flow,k.calendar_urn,
   k.id kamaishi_source_id,tf.id tohoku_source_id,
   km.timetable_id kamaishi_canonical_id,
   tm.timetable_id tohoku_canonical_id,
   (select count(*)::int from public.manual_timetable_template_stops
    where template_id=k.id) kamaishi_count,
   (select count(*)::int from public.manual_timetable_template_stops
    where template_id=tf.id) tohoku_count,
   k.train_type_urn,k.vehicle_type_label
 FROM seeds seed
 JOIN public.manual_timetable_templates k
  ON k.line_key='Kamaishi' AND k.train_number=seed.number
 JOIN public.manual_timetable_templates tf
  ON tf.line_key='TohokuMain' AND tf.train_number=seed.number
  AND tf.calendar_urn=k.calendar_urn
 JOIN public.train_timetable_members km ON km.source_template_id=k.id
 JOIN public.train_timetable_members tm ON tm.source_template_id=tf.id
 WHERE k.calendar_urn IN('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
)
SELECT c.*,
 CASE WHEN flow='southbound' THEN tohoku_source_id ELSE kamaishi_source_id END from_id,
 CASE WHEN flow='southbound' THEN kamaishi_source_id ELSE tohoku_source_id END to_id,
 CASE WHEN flow='southbound' THEN tohoku_canonical_id ELSE kamaishi_canonical_id END root_id,
 CASE WHEN flow='southbound' THEN kamaishi_canonical_id ELSE tohoku_canonical_id END absorbed_id,
 CASE WHEN flow='southbound' THEN tohoku_count ELSE kamaishi_count END first_count,
 CASE WHEN flow='southbound' THEN 'TohokuMain' ELSE 'Kamaishi' END from_line_key,
 CASE WHEN flow='southbound' THEN 'Kamaishi' ELSE 'TohokuMain' END to_line_key
FROM chosen c;

DO $pre$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM _kamaishi_2611_same_number_pairs;
 IF n<>14 THEN RAISE EXCEPTION 'Expected 7 x 2 same-number through pairs, found %',n; END IF;
 IF EXISTS(SELECT 1 FROM _kamaishi_2611_same_number_pairs
  GROUP BY root_id HAVING count(*)<>1)
 OR EXISTS(SELECT 1 FROM _kamaishi_2611_same_number_pairs
  GROUP BY absorbed_id HAVING count(*)<>1)
 THEN RAISE EXCEPTION 'Ambiguous through-train canonical ID'; END IF;
 IF EXISTS(
  SELECT 1 FROM _kamaishi_2611_same_number_pairs p
  JOIN public.train_timetables r ON r.id=p.root_id
  JOIN public.train_timetables c ON c.id=p.absorbed_id
  WHERE r.id=c.id OR r.calendar_urn<>p.calendar_urn OR c.calendar_urn<>p.calendar_urn
    OR r.primary_train_number<>p.number OR c.primary_train_number<>p.number
    OR r.group_evidence<>'source_only' OR c.group_evidence<>'source_only'
    OR p.vehicle_type_label<>'HB-E220系'
    OR p.first_count<2 OR p.kamaishi_count<2 OR p.tohoku_count<2
    OR (SELECT count(*) FROM public.train_timetable_members m
       WHERE m.timetable_id=r.id)<>1
    OR (SELECT count(*) FROM public.train_timetable_members m
       WHERE m.timetable_id=c.id)<>1
    OR (SELECT count(*) FROM public.train_timetable_vehicle_mappings v
       WHERE v.timetable_id=p.kamaishi_canonical_id
       AND v.vehicle_type='HB-E220系' AND NOT v.actual_vehicle_confirmed)<>1
    OR EXISTS(SELECT 1 FROM public.train_timetable_vehicle_mappings v
       WHERE v.timetable_id=p.tohoku_canonical_id)
    OR EXISTS(SELECT 1 FROM public.train_timetable_operation_evidence v
       WHERE v.timetable_id IN(p.root_id,p.absorbed_id))
    OR EXISTS(SELECT 1 FROM public.train_runs v
       WHERE v.canonical_timetable_id IN(p.root_id,p.absorbed_id))
    OR EXISTS(SELECT 1 FROM public.train_timetable_continuity v
       WHERE v.from_template_id IN(p.from_id,p.to_id)
          OR v.to_template_id IN(p.from_id,p.to_id))
 ) THEN RAISE EXCEPTION 'Unsafe source/plan conditions, refuse through merge'; END IF;
 -- Southbound root ends Hanamaki with arrival plus departure event,
 -- matching Kamaishi first Hanamaki DEPARTURE. Northbound the reverse.
 IF EXISTS(
  SELECT 1 FROM _kamaishi_2611_same_number_pairs p
  WHERE (
    p.flow='southbound' AND
    (SELECT coalesce(s.departure_clock,s.arrival_clock)
      FROM public.manual_timetable_template_stops s WHERE s.template_id=p.from_id
      ORDER BY s.stop_sequence DESC LIMIT 1)
    <> (SELECT s.departure_clock FROM public.manual_timetable_template_stops s
        WHERE s.template_id=p.to_id ORDER BY s.stop_sequence LIMIT 1)
  ) OR (
    p.flow='northbound' AND
    (SELECT s.arrival_clock FROM public.manual_timetable_template_stops s
      WHERE s.template_id=p.from_id ORDER BY s.stop_sequence DESC LIMIT 1)
    <> (SELECT coalesce(s.arrival_clock,s.departure_clock)
        FROM public.manual_timetable_template_stops s
        WHERE s.template_id=p.to_id ORDER BY s.stop_sequence LIMIT 1)
  ) OR (
    (SELECT split_part(coalesce(s.arrival_station_urn,s.departure_station_urn),'.',3)
     FROM public.manual_timetable_template_stops s WHERE s.template_id=p.from_id
      ORDER BY s.stop_sequence DESC LIMIT 1)<>'Hanamaki'
  ) OR (
    (SELECT split_part(coalesce(s.arrival_station_urn,s.departure_station_urn),'.',3)
     FROM public.manual_timetable_template_stops s WHERE s.template_id=p.to_id
      ORDER BY s.stop_sequence LIMIT 1)<>'Hanamaki'
  )
 ) THEN RAISE EXCEPTION 'Hanamaki exact clock/stop boundary not verified'; END IF;
END $pre$;

-- Correct the *existing* TohokuMain source's Hanamaki arrival role;
-- no new clock or station is created.
UPDATE public.manual_timetable_template_stops s
SET arrival_station_urn=s.departure_station_urn,
    departure_station_urn=NULL,
    arrival_clock=s.departure_clock,
    departure_clock=NULL
FROM _kamaishi_2611_same_number_pairs p
WHERE s.template_id=p.tohoku_source_id AND s.arrival_clock IS NULL
 AND s.departure_station_urn='odpt.Station:JR-East.Hanamaki'
 AND s.stop_sequence=CASE WHEN p.flow='southbound'
   THEN p.tohoku_count-2 ELSE 0 END;

DO $roles$
DECLARE n int;
BEGIN
 SELECT count(*) INTO n FROM _kamaishi_2611_same_number_pairs p
 JOIN public.manual_timetable_template_stops s ON s.template_id=p.tohoku_source_id
 AND s.stop_sequence=CASE WHEN p.flow='southbound' THEN p.tohoku_count-2 ELSE 0 END
 WHERE s.arrival_station_urn='odpt.Station:JR-East.Hanamaki'
 AND s.arrival_clock IS NOT NULL AND s.departure_clock IS NULL;
 IF n<>14 THEN RAISE EXCEPTION '14 Hanamaki arrival clock roles not corrected: %',n; END IF;
END $roles$;

-- Train model and type on the Tohoku source are the same running vehicle.
-- The imported 701/E721 label belongs to a generic LINE default and must
-- not survive after official cross-line train identity verification.
UPDATE public.manual_timetable_templates tf
SET train_type_urn=p.train_type_urn,
 vehicle_type_label='HB-E220系',
 destination_urns=CASE WHEN p.flow='southbound'
   THEN ARRAY['odpt.Station:JR-East.Kamaishi'] ELSE tf.destination_urns END
FROM _kamaishi_2611_same_number_pairs p
WHERE tf.id=p.tohoku_source_id;
UPDATE public.manual_timetable_templates k
SET destination_urns=ARRAY['odpt.Station:JR-East.Morioka']
FROM _kamaishi_2611_same_number_pairs p
WHERE k.id=p.kamaishi_source_id AND p.flow='northbound';

INSERT INTO public.train_timetable_continuity
 (from_template_id,to_template_id,junction_station_urn,
  arrival_clock,departure_clock,connection_minutes,evidence)
SELECT p.from_id,p.to_id,'odpt.Station:JR-East.Hanamaki',
 CASE WHEN p.flow='southbound' THEN
   (SELECT s.arrival_clock FROM public.manual_timetable_template_stops s
    WHERE s.template_id=p.tohoku_source_id
    AND s.stop_sequence=p.tohoku_count-2)
 ELSE
   (SELECT s.arrival_clock FROM public.manual_timetable_template_stops s
    WHERE s.template_id=p.kamaishi_source_id
    ORDER BY s.stop_sequence DESC LIMIT 1)
 END,
 CASE WHEN p.flow='southbound' THEN
   (SELECT s.departure_clock FROM public.manual_timetable_template_stops s
    WHERE s.template_id=p.kamaishi_source_id
    ORDER BY s.stop_sequence LIMIT 1)
 ELSE
   (SELECT s.departure_clock FROM public.manual_timetable_template_stops s
    WHERE s.template_id=p.tohoku_source_id AND s.stop_sequence=1)
 END,
 0,'official_2611_same_number_boundary_clock'
FROM _kamaishi_2611_same_number_pairs p;

-- Adopt canonical HB-E220 plan (already attached to Kamaishi source).
UPDATE public.train_timetable_vehicle_mappings v
SET timetable_id=p.root_id
FROM _kamaishi_2611_same_number_pairs p
WHERE p.flow='southbound' AND v.timetable_id=p.kamaishi_canonical_id;

UPDATE public.train_timetable_members m
SET timetable_id=p.root_id,segment_order=1,
    member_role='verified_continuation',
    stop_offset=p.first_count,merge_first_stop=true
FROM _kamaishi_2611_same_number_pairs p
WHERE m.source_template_id=p.to_id AND m.timetable_id=p.absorbed_id;
UPDATE public.train_timetables t SET group_evidence='verified_continuation'
FROM _kamaishi_2611_same_number_pairs p WHERE t.id=p.root_id;
DELETE FROM public.train_timetables t
USING _kamaishi_2611_same_number_pairs p
WHERE t.id=p.absorbed_id AND NOT EXISTS(
 SELECT 1 FROM public.train_timetable_members m WHERE m.timetable_id=t.id);

INSERT INTO public.published_kamaishi_2611_regular_through_segments
(train_number,calendar_urn,from_template_id,to_template_id,from_line_key,to_line_key,
 junction_station_urn,arrival_clock,departure_clock,
 official_kamaishi_url,official_tohoku_url,canonical_timetable_id)
SELECT p.number,p.calendar_urn,p.from_id,p.to_id,
 p.from_line_key,p.to_line_key,'odpt.Station:JR-East.Hanamaki',
 c.arrival_clock,c.departure_clock,
 'https://timetables.jreast.co.jp/2611/timetable-v/979'||
 CASE WHEN p.flow='southbound' THEN 'd' ELSE 'u' END||
 CASE WHEN p.calendar_urn='odpt.Calendar:Weekday' THEN '1' ELSE '2' END||'.html',
 'https://timetables.jreast.co.jp/2611/timetable-v/248'||
 CASE WHEN p.flow='southbound' THEN 'u' ELSE 'd' END||
 CASE WHEN p.calendar_urn='odpt.Calendar:Weekday' THEN '1' ELSE '2' END||'.html',
 p.root_id
FROM _kamaishi_2611_same_number_pairs p
JOIN public.train_timetable_continuity c ON c.from_template_id=p.from_id
AND c.to_template_id=p.to_id;

DO $post$
DECLARE ok int;
BEGIN
 SELECT count(*) INTO ok
 FROM _kamaishi_2611_same_number_pairs p
 JOIN public.train_timetables t ON t.id=p.root_id
 WHERE t.group_evidence='verified_continuation'
 AND (SELECT count(*) FROM public.train_timetable_members m
      WHERE m.timetable_id=t.id)=2
 AND (SELECT count(*) FROM public.train_timetable_stops s
      WHERE s.timetable_id=t.id)=p.kamaishi_count+p.tohoku_count-1
 AND (SELECT count(distinct s.stop_sequence)
      FROM public.train_timetable_stops s
      WHERE s.timetable_id=t.id)=p.kamaishi_count+p.tohoku_count-1
 AND (SELECT count(*) FROM public.train_timetable_lines l
      WHERE l.timetable_id=t.id)=2
 AND EXISTS(SELECT 1 FROM public.train_timetable_vehicle_mappings v
      WHERE v.timetable_id=t.id AND v.vehicle_type='HB-E220系'
      AND NOT v.actual_vehicle_confirmed);
 IF ok<>14 THEN RAISE EXCEPTION 'Kamaishi regular canonical postcheck failed % / 14',ok; END IF;
END $post$;
COMMIT;