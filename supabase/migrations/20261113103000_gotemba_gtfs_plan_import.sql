-- Promote the checksum-locked TokyoGTFS Gotemba route from private quarantine
-- into the existing SQL planned-timetable path consumed by train-runs.
-- This is a static timetable source (evidence grade C), not a realtime feed or
-- proof of the physical formation operating on a particular day.
BEGIN;

SELECT pg_advisory_xact_lock(hashtext('pixel-tetsudo:gotemba-gtfs-plan:20261113'));

DO $$
DECLARE
  v_feed_sha text := 'bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f';
  v_trip_count integer;
  v_stop_count integer;
  v_number_count integer;
BEGIN
  SELECT count(*), count(DISTINCT train_number)
    INTO v_trip_count, v_number_count
  FROM gtfs_stage.trips
  WHERE feed_sha=v_feed_sha AND route_id='JR-Central.Gotemba';
  SELECT count(*) INTO v_stop_count
  FROM gtfs_stage.stop_times st
  JOIN gtfs_stage.trips t ON t.feed_sha=st.feed_sha AND t.trip_id=st.trip_id
  WHERE st.feed_sha=v_feed_sha AND t.route_id='JR-Central.Gotemba';
  IF v_trip_count<>179 OR v_stop_count<>2341 OR v_number_count<>94 THEN
    RAISE EXCEPTION 'Gotemba GTFS source count mismatch: trips %, stops %, numbers %',
      v_trip_count,v_stop_count,v_number_count;
  END IF;
END $$;

INSERT INTO public.evidence_sources(source_key, source_url, source_type, evidence_grade, notes)
VALUES (
  'gtfs:tokyogtfs:rail.zip:BB1BF605817E7A3A65CAFFBCD019843AA0FFD5CB3B2C9FBB0444C8B3072FF87F',
  'https://github.com/MKuranowski/TokyoGTFS', 'timetable', 'C',
  'Static TokyoGTFS rail.zip source for JR-Central.Gotemba; SHA-256 BB1BF605817E7A3A65CAFFBCD019843AA0FFD5CB3B2C9FBB0444C8B3072FF87F; 179 source trips and 2341 stop events; not an operator-issued revision and not a realtime feed.'
)
ON CONFLICT (source_key) DO UPDATE SET
  source_url=EXCLUDED.source_url,
  source_type=EXCLUDED.source_type,
  evidence_grade=EXCLUDED.evidence_grade,
  notes=EXCLUDED.notes;

INSERT INTO public.timetable_revisions(
  operator,line_id,description,source_id,version_key,effective_from,effective_to,
  calendar_urn,source_content_hash
)
SELECT 'JR-Central','Gotemba',
       'TokyoGTFS static JR-Central Gotemba timetable; recheck against an operator edition before treating as current',
       e.id,
       'gtfs-rail-gotemba-20261102-20271102-bb1bf605817e7a3a',
       DATE '2026-11-02',DATE '2027-11-02',c.calendar_urn,
       'BB1BF605817E7A3A65CAFFBCD019843AA0FFD5CB3B2C9FBB0444C8B3072FF87F'
FROM public.evidence_sources e
CROSS JOIN (VALUES ('odpt.Calendar:Weekday'),('odpt.Calendar:SaturdayHoliday')) c(calendar_urn)
WHERE e.source_key='gtfs:tokyogtfs:rail.zip:BB1BF605817E7A3A65CAFFBCD019843AA0FFD5CB3B2C9FBB0444C8B3072FF87F'
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE _gotemba_gtfs_station_map(
  stop_id text PRIMARY KEY,
  station_name text NOT NULL,
  station_index integer NOT NULL
) ON COMMIT DROP;

INSERT INTO _gotemba_gtfs_station_map(stop_id,station_name,station_index) VALUES
  ('JR-Central.Gotemba.Kozu','Kozu',0),
  ('JR-Central.Gotemba.ShimoSoga','JRC-Gotemba-002',1),
  ('JR-Central.Gotemba.KamiOi','JRC-Gotemba-003',2),
  ('JR-Central.Gotemba.SagamiKaneko','JRC-Gotemba-004',3),
  ('JR-Central.Gotemba.Matsuda','JRC-Gotemba-005',4),
  ('JR-Central.Gotemba.HigashiYamakita','JRC-Gotemba-006',5),
  ('JR-Central.Gotemba.Yamakita','JRC-Gotemba-007',6),
  ('JR-Central.Gotemba.Yaga','JRC-Gotemba-008',7),
  ('JR-Central.Gotemba.SurugaOyama','JRC-Gotemba-009',8),
  ('JR-Central.Gotemba.Ashigara','JRC-Gotemba-010',9),
  ('JR-Central.Gotemba.Gotemba','JRC-Gotemba-011',10),
  ('JR-Central.Gotemba.MinamiGotemba','JRC-Gotemba-012',11),
  ('JR-Central.Gotemba.Fujioka','JRC-Gotemba-013',12),
  ('JR-Central.Gotemba.Iwanami','JRC-Gotemba-014',13),
  ('JR-Central.Gotemba.Susono','JRC-Gotemba-015',14),
  ('JR-Central.Gotemba.NagaizumiNameri','JRC-Gotemba-016',15),
  ('JR-Central.Gotemba.ShimoTogari','JRC-Gotemba-017',16),
  ('JR-Central.Gotemba.Ooka','JRC-Gotemba-018',17),
  ('JR-Central.Gotemba.Numazu','Numazu',18);

DO $$
DECLARE
  v_feed_sha text := 'bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f';
  v_unmapped integer;
  v_bad_trip integer;
BEGIN
  SELECT count(*) INTO v_unmapped
  FROM gtfs_stage.stop_times st
  JOIN gtfs_stage.trips t ON t.feed_sha=st.feed_sha AND t.trip_id=st.trip_id
  LEFT JOIN _gotemba_gtfs_station_map sm ON sm.stop_id=st.stop_id
  WHERE st.feed_sha=v_feed_sha AND t.route_id='JR-Central.Gotemba' AND sm.stop_id IS NULL;
  IF v_unmapped<>0 THEN RAISE EXCEPTION 'Gotemba GTFS has unmapped stops: %',v_unmapped; END IF;

  SELECT count(*) INTO v_bad_trip
  FROM (
    SELECT t.trip_id,
           count(st.stop_sequence) AS stop_count,
           min(st.departure_time) FILTER (WHERE st.stop_sequence=0) AS first_departure,
           max(st.arrival_time) FILTER (WHERE st.stop_sequence=(SELECT max(st2.stop_sequence) FROM gtfs_stage.stop_times st2 WHERE st2.feed_sha=st.feed_sha AND st2.trip_id=st.trip_id)) AS last_arrival
    FROM gtfs_stage.trips t
    JOIN gtfs_stage.stop_times st ON st.feed_sha=t.feed_sha AND st.trip_id=t.trip_id
    WHERE t.feed_sha=v_feed_sha AND t.route_id='JR-Central.Gotemba'
    GROUP BY t.trip_id
  ) x
  WHERE stop_count<2 OR first_departure IS NULL OR last_arrival IS NULL;
  IF v_bad_trip<>0 THEN RAISE EXCEPTION 'Gotemba GTFS has incomplete trips: %',v_bad_trip; END IF;
END $$;

CREATE TEMP TABLE _gotemba_gtfs_seed ON COMMIT DROP AS
WITH calendar_days AS (
  SELECT c.service_id,d::date AS service_date,
         substring(c.week_mask from extract(isodow FROM d)::integer for 1)='1' AS base_active
  FROM gtfs_stage.service_calendar c
  CROSS JOIN LATERAL generate_series(c.start_date,c.end_date,interval '1 day') d
  WHERE c.feed_sha='bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f'
), effective_days AS (
  SELECT cd.service_id,cd.service_date
  FROM calendar_days cd
  WHERE cd.base_active
    AND NOT EXISTS (
      SELECT 1 FROM gtfs_stage.service_exceptions e
      WHERE e.feed_sha='bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f'
        AND e.service_id=cd.service_id AND e.service_date=cd.service_date AND e.exception_type=2)
  UNION
  SELECT e.service_id,e.service_date
  FROM gtfs_stage.service_exceptions e
  WHERE e.feed_sha='bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f'
    AND e.exception_type=1
), trip_rows AS (
  SELECT t.trip_id,
         CASE t.service_id WHEN 'Weekday' THEN 'odpt.Calendar:Weekday'
           WHEN 'SaturdayHoliday' THEN 'odpt.Calendar:SaturdayHoliday' END AS calendar_urn,
         substring(t.train_number from '^[0-9]{1,5}[A-Z]{1,2}') AS train_number,
         CASE t.direction_id WHEN '0' THEN 'odpt.RailDirection:Outbound'
           WHEN '1' THEN 'odpt.RailDirection:Inbound' END AS direction_urn,
         CASE WHEN t.headsign LIKE '%有料特急%' THEN 'odpt.TrainType:JR-Central.LimitedExpress'
           ELSE 'odpt.TrainType:JR-Central.Local' END AS train_type_urn,
         last_sm.station_name AS terminal_station,
         array_agg(ed.service_date ORDER BY ed.service_date) AS operating_dates
  FROM gtfs_stage.trips t
  JOIN LATERAL (
    SELECT sm.station_name
    FROM gtfs_stage.stop_times st
    JOIN _gotemba_gtfs_station_map sm ON sm.stop_id=st.stop_id
    WHERE st.feed_sha=t.feed_sha AND st.trip_id=t.trip_id
    ORDER BY st.stop_sequence DESC LIMIT 1
  ) last_sm ON true
  JOIN effective_days ed ON ed.service_id=t.service_id
  WHERE t.feed_sha='bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f'
    AND t.route_id='JR-Central.Gotemba'
    AND t.service_id IN ('Weekday','SaturdayHoliday')
  GROUP BY t.trip_id,t.service_id,t.train_number,t.direction_id,t.headsign,last_sm.station_name
)
SELECT * FROM trip_rows;

INSERT INTO public.manual_timetable_templates(
  line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,
  destination_urns,vehicle_type_label,source_path,source_occurrence,source_trip_id,
  source_revision_date,operating_dates,revision_id
)
SELECT 'Gotemba',s.calendar_urn,s.train_number,
       'odpt.Railway:JR-Central.Gotemba',s.direction_urn,s.train_type_urn,
       ARRAY['odpt.Station:JR-Central.Gotemba.'||s.terminal_station]::text[],
       NULL,
       'gtfs:tokyogtfs:rail.zip:BB1BF605817E7A3A65CAFFBCD019843AA0FFD5CB3B2C9FBB0444C8B3072FF87F:JR-Central.Gotemba',
       0,s.trip_id,DATE '2026-11-02',s.operating_dates,r.id
FROM _gotemba_gtfs_seed s
JOIN public.timetable_revisions r ON r.line_id='Gotemba' AND r.calendar_urn=s.calendar_urn
  AND r.version_key='gtfs-rail-gotemba-20261102-20271102-bb1bf605817e7a3a'
WHERE s.train_number IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.manual_timetable_template_stops(
  template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock
)
SELECT t.id,st.stop_sequence,
       'odpt.Station:JR-Central.Gotemba.'||sm.station_name,
       'odpt.Station:JR-Central.Gotemba.'||sm.station_name,
       left(NULLIF(st.arrival_time,''),5),left(NULLIF(st.departure_time,''),5)
FROM gtfs_stage.trips gt
JOIN gtfs_stage.stop_times st ON st.feed_sha=gt.feed_sha AND st.trip_id=gt.trip_id
JOIN _gotemba_gtfs_station_map sm ON sm.stop_id=st.stop_id
JOIN public.manual_timetable_templates t
  ON t.line_key='Gotemba' AND t.source_trip_id=gt.trip_id
 AND t.source_path='gtfs:tokyogtfs:rail.zip:BB1BF605817E7A3A65CAFFBCD019843AA0FFD5CB3B2C9FBB0444C8B3072FF87F:JR-Central.Gotemba'
WHERE gt.feed_sha='bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f'
  AND gt.route_id='JR-Central.Gotemba'
ON CONFLICT DO NOTHING;

INSERT INTO public.train_timetables(canonical_key,calendar_urn,primary_train_number,lead_source_template_id,group_evidence,timetable_validity)
SELECT 'gotemba:gtfs:'||t.id,t.calendar_urn,t.train_number,t.id,'source_only','undated_not_current_verified'
FROM public.manual_timetable_templates t
WHERE t.line_key='Gotemba'
  AND t.source_path='gtfs:tokyogtfs:rail.zip:BB1BF605817E7A3A65CAFFBCD019843AA0FFD5CB3B2C9FBB0444C8B3072FF87F:JR-Central.Gotemba'
  AND NOT EXISTS (SELECT 1 FROM public.train_timetables c WHERE c.lead_source_template_id=t.id);

INSERT INTO public.train_timetable_members(
  source_template_id,timetable_id,segment_order,member_role,first_stop_sequence,
  last_stop_sequence,stop_offset,merge_first_stop
)
SELECT t.id,c.id,0,'primary',0,
       (SELECT max(s.stop_sequence) FROM public.manual_timetable_template_stops s WHERE s.template_id=t.id),
       0,false
FROM public.manual_timetable_templates t
JOIN public.train_timetables c ON c.lead_source_template_id=t.id
WHERE t.line_key='Gotemba'
  AND t.source_path='gtfs:tokyogtfs:rail.zip:BB1BF605817E7A3A65CAFFBCD019843AA0FFD5CB3B2C9FBB0444C8B3072FF87F:JR-Central.Gotemba'
ON CONFLICT DO NOTHING;

UPDATE public.published_timetable_coverage_audit a
SET template_count=s.template_count,calendar_count=s.calendar_count,direction_count=s.direction_count,
    sampled_count=0,coverage_status='unverified',
    issues=ARRAY['GTFS_STATIC_SOURCE_NOT_OPERATOR_EDITION','NO_REALTIME_SOURCE']::text[],checked_at=now()
FROM (
  SELECT count(*)::integer AS template_count,count(DISTINCT calendar_urn)::integer AS calendar_count,
         count(DISTINCT direction_urn)::integer AS direction_count
  FROM public.manual_timetable_templates
  WHERE line_key='Gotemba' AND source_path LIKE 'gtfs:tokyogtfs:rail.zip:%:JR-Central.Gotemba'
) s
WHERE a.line_key='Gotemba';

DO $$
DECLARE v_templates integer; v_stops integer; v_calendars integer; v_directions integer;
BEGIN
  SELECT count(*),count(DISTINCT calendar_urn),count(DISTINCT direction_urn)
    INTO v_templates,v_calendars,v_directions
  FROM public.manual_timetable_templates
  WHERE line_key='Gotemba' AND source_path LIKE 'gtfs:tokyogtfs:rail.zip:%:JR-Central.Gotemba';
  SELECT count(*) INTO v_stops
  FROM public.manual_timetable_template_stops s
  JOIN public.manual_timetable_templates t ON t.id=s.template_id
  WHERE t.line_key='Gotemba' AND t.source_path LIKE 'gtfs:tokyogtfs:rail.zip:%:JR-Central.Gotemba';
  IF v_templates<>179 OR v_stops<>2341 OR v_calendars<>2 OR v_directions<>2 THEN
    RAISE EXCEPTION 'Gotemba promoted plan mismatch: templates %, stops %, calendars %, directions %',
      v_templates,v_stops,v_calendars,v_directions;
  END IF;
END $$;

COMMIT;
