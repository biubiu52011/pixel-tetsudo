-- 2026-11 JR East 2611, Hinabi Kamaishi 8621D / 8622D:
-- The same published train serves TohokuMain (Morioka - Hanamaki) and
-- Kamaishi (Hanamaki - Kamaishi). Source IDs are explicit; NEVER merge
-- number-only matches on other lines (Gono / OuMain reuse 8621D / 8622D).
-- Official end-to-end source:
-- https://timetables.jreast.co.jp/2611/train/150/154901.html
-- https://timetables.jreast.co.jp/2611/train/150/154891.html
-- No claim of actual-day physical trainset. Seven November operation days.
BEGIN;
SELECT pg_advisory_xact_lock(26118621);

-- Give the continuity edge its truthful evidence class. Previous migrations
-- admitted only reciprocal imported source IDs; the two legacy imports
-- lack those cross IDs but ARE explicitly joined in the official named-train
-- endpoint and have matching Hanamaki station / clock values.
ALTER TABLE public.train_timetable_continuity
  DROP CONSTRAINT train_timetable_continuity_evidence_check;
ALTER TABLE public.train_timetable_continuity
  ADD CONSTRAINT train_timetable_continuity_evidence_check CHECK (
 (evidence='reciprocal_source_ids_station_time_revision'
   AND arrival_clock IS NOT NULL AND departure_clock IS NOT NULL
   AND connection_minutes IS NOT NULL)
 OR (evidence='reciprocal_source_ids_passing_station_revision'
   AND arrival_clock IS NULL AND departure_clock IS NULL
   AND connection_minutes IS NULL
   AND bracket_departure_clock IS NOT NULL
   AND bracket_arrival_clock IS NOT NULL)
 OR (evidence='reciprocal_source_ids_single_boundary_clock_revision'
   AND ((arrival_clock IS NULL) <> (departure_clock IS NULL))
   AND connection_minutes IS NULL
   AND bracket_departure_clock IS NOT NULL
   AND bracket_arrival_clock IS NOT NULL)
 OR (evidence='official_named_train_station_time_2611'
   AND arrival_clock IS NOT NULL AND departure_clock IS NOT NULL
   AND connection_minutes=0 AND bracket_departure_clock IS NULL
   AND bracket_arrival_clock IS NULL)
);

CREATE TABLE IF NOT EXISTS public.published_kamaishi_2611_through_segments(
  train_number text PRIMARY KEY CHECK(train_number IN ('8621D','8622D')),
  edition text NOT NULL DEFAULT '2611' CHECK(edition='2611'),
  calendar_urn text NOT NULL DEFAULT 'odpt.Calendar:SaturdayHoliday'
    CHECK(calendar_urn='odpt.Calendar:SaturdayHoliday'),
  from_template_id bigint NOT NULL REFERENCES public.manual_timetable_templates(id),
  to_template_id bigint NOT NULL REFERENCES public.manual_timetable_templates(id),
  junction_station_urn text NOT NULL
    CHECK(junction_station_urn='odpt.Station:JR-East.Hanamaki'),
  arrival_clock text NOT NULL,
  departure_clock text NOT NULL,
  operating_dates date[] NOT NULL CHECK(cardinality(operating_dates)=7),
  official_source_url text NOT NULL,
  canonical_timetable_id bigint NOT NULL REFERENCES public.train_timetables(id),
  actual_vehicle_confirmed boolean NOT NULL DEFAULT false
    CHECK(NOT actual_vehicle_confirmed),
  CHECK(from_template_id<>to_template_id)
);
ALTER TABLE public.published_kamaishi_2611_through_segments ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_kamaishi_2611_through_segments IS
 'JR East 2611 official named Hinabi through-service handover at Hanamaki, 2026 November operating days and explicit source IDs; not carset proof.';

-- Guard against reused public numbers, altered imports, already-merged
-- sources, incompatible canonical vehicle labels or existing daily runs.
DO $check$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad
  FROM (VALUES
    ('8621D',71728::bigint,1765::bigint,65975::bigint,16164::bigint,
      'TohokuMain','Kamaishi'),
    ('8622D',1793::bigint,71504::bigint,16291::bigint,65733::bigint,
      'Kamaishi','TohokuMain')
  ) p(n,from_id,to_id,root_id,absorbed_id,from_line,to_line)
  JOIN public.manual_timetable_templates f ON f.id=p.from_id
  JOIN public.manual_timetable_templates t ON t.id=p.to_id
  JOIN public.train_timetable_members fm ON fm.source_template_id=f.id
  JOIN public.train_timetable_members tm ON tm.source_template_id=t.id
  JOIN public.train_timetables root ON root.id=p.root_id
  JOIN public.train_timetables absorbed ON absorbed.id=p.absorbed_id
  WHERE f.line_key=p.from_line AND t.line_key=p.to_line
    AND f.train_number=p.n AND t.train_number=p.n
    AND f.calendar_urn='odpt.Calendar:SaturdayHoliday'
    AND t.calendar_urn=f.calendar_urn
    AND root.calendar_urn=f.calendar_urn
    AND absorbed.calendar_urn=f.calendar_urn
    AND root.primary_train_number=p.n
    AND absorbed.primary_train_number=p.n
    AND root.group_evidence='source_only'
    AND absorbed.group_evidence='source_only'
    AND fm.segment_order=0 AND tm.segment_order=0
    AND fm.timetable_id=p.root_id
    AND tm.timetable_id=p.absorbed_id
    AND NOT EXISTS(
      SELECT 1 FROM public.train_runs r
      WHERE r.canonical_timetable_id IN(p.root_id,p.absorbed_id))
    AND NOT EXISTS(
      SELECT 1 FROM public.train_timetable_operation_evidence r
      WHERE r.timetable_id IN(p.root_id,p.absorbed_id))
    AND NOT EXISTS(
      SELECT 1 FROM public.train_timetable_continuity r
      WHERE r.from_template_id IN(f.id,t.id) OR r.to_template_id IN(f.id,t.id))
    AND (SELECT count(*) FROM public.train_timetable_members m
      WHERE m.timetable_id=p.root_id)=1
    AND (SELECT count(*) FROM public.train_timetable_members m
      WHERE m.timetable_id=p.absorbed_id)=1;
  IF bad<>2 THEN RAISE EXCEPTION
    'Kamaishi official through merge guard: expected 2 exact pairs, found %',bad;
  END IF;
  IF (SELECT count(*) FROM public.train_timetable_vehicle_mappings v
    WHERE v.timetable_id IN (65975,65733))<>0
    OR (SELECT count(*) FROM public.train_timetable_vehicle_mappings v
      WHERE v.timetable_id IN(16164,16291)
      AND v.vehicle_type='HB-E300系（ひなび）'
      AND v.actual_vehicle_confirmed=false)<>2
  THEN RAISE EXCEPTION 'Kamaishi Hinabi vehicle evidence mismatch'; END IF;
END $check$;

-- The earlier Tohoku import mislabels the two Hanamaki ARRIVALS
-- as departures. Correct the existing source rows instead of inserting
-- duplicated or guessed clocks.
UPDATE public.manual_timetable_template_stops
SET arrival_station_urn='odpt.Station:JR-East.Hanamaki',
    departure_station_urn=NULL,arrival_clock='10:41',departure_clock=NULL
WHERE template_id=71728 AND stop_sequence=1
  AND departure_station_urn='odpt.Station:JR-East.Hanamaki'
  AND departure_clock='10:41';
UPDATE public.manual_timetable_template_stops
SET arrival_station_urn='odpt.Station:JR-East.Hanamaki',
    departure_station_urn=NULL,arrival_clock='16:54',departure_clock=NULL
WHERE template_id=71504 AND stop_sequence=0
  AND departure_station_urn='odpt.Station:JR-East.Hanamaki'
  AND departure_clock='16:54';

DO $junction$
BEGIN
 IF NOT EXISTS(
  SELECT 1 FROM public.manual_timetable_template_stops a,
                    public.manual_timetable_template_stops b,
                    public.manual_timetable_template_stops c
  WHERE a.template_id=71728 AND a.stop_sequence=1
  AND a.arrival_clock='10:41'
  AND b.template_id=71728 AND b.stop_sequence=2
  AND b.departure_clock='10:53'
  AND c.template_id=1765 AND c.stop_sequence=0
  AND c.departure_clock='10:53'
 ) OR NOT EXISTS(
  SELECT 1 FROM public.manual_timetable_template_stops a,
                    public.manual_timetable_template_stops b,
                    public.manual_timetable_template_stops c
  WHERE a.template_id=1793 AND a.stop_sequence=8
  AND a.arrival_clock='16:54'
  AND b.template_id=71504 AND b.stop_sequence=0
  AND b.arrival_clock='16:54'
  AND c.template_id=71504 AND c.stop_sequence=1
  AND c.departure_clock='17:09'
 ) THEN RAISE EXCEPTION 'Hanamaki published boundary time mismatch'; END IF;
END $junction$;

INSERT INTO public.train_timetable_continuity
(from_template_id,to_template_id,junction_station_urn,
 arrival_clock,departure_clock,connection_minutes,evidence)
VALUES
(71728,1765,'odpt.Station:JR-East.Hanamaki','10:41','10:53',0,
 'official_named_train_station_time_2611'),
(1793,71504,'odpt.Station:JR-East.Hanamaki','16:54','17:09',0,
 'official_named_train_station_time_2611');

-- Downbound 8621D starts on TohokuMain: keep its original canonical id
-- 65975 and carry its approved HB-E300 plan mapping over from child 16164.
UPDATE public.train_timetable_vehicle_mappings SET timetable_id=65975
WHERE timetable_id=16164 AND source_template_id=1765;
UPDATE public.train_timetable_members
SET timetable_id=65975,segment_order=1,member_role='verified_continuation',
    stop_offset=3,merge_first_stop=true
WHERE source_template_id=1765 AND timetable_id=16164;
UPDATE public.train_timetables SET group_evidence='verified_continuation'
WHERE id=65975;
DELETE FROM public.train_timetables WHERE id=16164
AND NOT EXISTS(SELECT 1 FROM public.train_timetable_members m
 WHERE m.timetable_id=16164);

-- Upbound 8622D starts on Kamaishi: preserve approved canonical 16291.
UPDATE public.train_timetable_members
SET timetable_id=16291,segment_order=1,member_role='verified_continuation',
    stop_offset=9,merge_first_stop=true
WHERE source_template_id=71504 AND timetable_id=65733;
UPDATE public.train_timetables SET group_evidence='verified_continuation'
WHERE id=16291;
DELETE FROM public.train_timetables WHERE id=65733
AND NOT EXISTS(SELECT 1 FROM public.train_timetable_members m
 WHERE m.timetable_id=65733);

INSERT INTO public.published_kamaishi_2611_through_segments
(train_number,from_template_id,to_template_id,junction_station_urn,
 arrival_clock,departure_clock,operating_dates,official_source_url,
 canonical_timetable_id)
VALUES
('8621D',71728,1765,'odpt.Station:JR-East.Hanamaki','10:41','10:53',
 ARRAY['2026-11-07','2026-11-08','2026-11-14','2026-11-15',
       '2026-11-21','2026-11-22','2026-11-23']::date[],
 'https://timetables.jreast.co.jp/2611/train/150/154901.html',65975),
('8622D',1793,71504,'odpt.Station:JR-East.Hanamaki','16:54','17:09',
 ARRAY['2026-11-07','2026-11-08','2026-11-14','2026-11-15',
       '2026-11-21','2026-11-22','2026-11-23']::date[],
 'https://timetables.jreast.co.jp/2611/train/150/154891.html',16291);

DO $after$
BEGIN
  IF (SELECT count(*) FROM public.published_kamaishi_2611_through_segments)<>2
    OR EXISTS(
       SELECT 1 FROM (VALUES(65975::bigint,'Morioka','Kamaishi'),
                             (16291::bigint,'Kamaishi','Morioka'))
         p(id,first_code,last_code)
       WHERE (SELECT count(*) FROM public.train_timetable_stops s
         WHERE s.timetable_id=p.id)<>11
         OR (SELECT split_part(s.station_urn,'.',3)
             FROM public.train_timetable_stops s
             WHERE s.timetable_id=p.id ORDER BY s.stop_sequence LIMIT 1)
             <>p.first_code
         OR (SELECT split_part(s.station_urn,'.',3)
             FROM public.train_timetable_stops s
             WHERE s.timetable_id=p.id ORDER BY s.stop_sequence DESC LIMIT 1)
             <>p.last_code
         OR (SELECT count(*) FROM public.train_timetable_members m
             WHERE m.timetable_id=p.id)<>2)
    THEN RAISE EXCEPTION 'Kamaishi 2611 full-journey canonical validation failed'; END IF;
END $after$;
COMMIT;