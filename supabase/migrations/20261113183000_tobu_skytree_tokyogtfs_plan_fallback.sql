-- Tobu Skytree line: promote the already checksum-locked TokyoGTFS 2026-11
-- railway STAGING only, not the ODPT Challenge feed or a realtime observation.
-- Upstream railway timetable attribution: Copyright (c) 2019-2025 Akihiko
-- Kusanagi, MIT; https://github.com/MKuranowski/TokyoGTFS
-- This feed covers 2026-11-02..2027-11-02. Retain source and date scope.
-- Fleet and formation identities MUST remain unknown.
DO $tobu_gtfs$
DECLARE
  v_sha CONSTANT text := 'bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f';
  v_source CONSTANT text := 'gtfs-stage:TokyoGTFS:bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f:TobuSkytree';
  n integer;
  stop_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('tobu-skytree-tokyogtfs-promotion-202611'));
  SELECT count(*) INTO n FROM public.manual_timetable_templates WHERE line_key='TobuSkytree';
  IF n <> 0 THEN
    -- Never overwrite an existing official source or ingest a second copy.
    IF n <> 1738 OR EXISTS (
      SELECT 1 FROM public.manual_timetable_templates
      WHERE line_key='TobuSkytree' AND source_path <> v_source
    ) THEN RAISE EXCEPTION 'TobuSkytree already has a different active source; abort promotion'; END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM gtfs_stage.feed_imports
      WHERE feed_sha=v_sha AND service_start='2026-11-02'::date
        AND service_end='2027-11-02'::date AND staged_trip_count=19358
        AND staged_stop_time_count=279607
    ) THEN RAISE EXCEPTION 'TokyoGTFS checksum edition or staged counts invalid'; END IF;
    IF (SELECT count(*) FROM gtfs_stage.trips
        WHERE feed_sha=v_sha AND route_id='Tobu.TobuSkytree') <> 1738
       OR (SELECT count(*) FROM gtfs_stage.trips
           WHERE feed_sha=v_sha AND route_id='Tobu.TobuSkytree'
             AND service_id='Weekday') <> 909
       OR (SELECT count(*) FROM gtfs_stage.trips
           WHERE feed_sha=v_sha AND route_id='Tobu.TobuSkytree'
             AND service_id='SaturdayHoliday') <> 829
    THEN RAISE EXCEPTION 'TobuSkytree exact 2026-11 timetable roster changed'; END IF;

    SELECT count(*) INTO stop_count
    FROM gtfs_stage.stop_times st JOIN gtfs_stage.trips t
      ON t.feed_sha=st.feed_sha AND t.trip_id=st.trip_id
    WHERE t.feed_sha=v_sha AND t.route_id='Tobu.TobuSkytree';
    IF stop_count <> 20860 OR EXISTS (
      SELECT 1 FROM gtfs_stage.trips t
      LEFT JOIN gtfs_stage.stop_times s
        ON s.feed_sha=t.feed_sha AND s.trip_id=t.trip_id
      WHERE t.feed_sha=v_sha AND t.route_id='Tobu.TobuSkytree'
      GROUP BY t.feed_sha,t.trip_id
      HAVING count(s.trip_id)<2 OR count(s.trip_id)>30
          OR count(s.trip_id) <> count(s.stop_id)
          OR count(s.trip_id) <> max(s.stop_sequence)-min(s.stop_sequence)+1
          OR bool_or(s.stop_id IS NOT NULL AND
            (s.stop_id NOT LIKE 'Tobu.TobuSkytree.%'
             OR coalesce(s.arrival_time,s.departure_time) IS NULL
             OR (s.arrival_time IS NOT NULL AND
                 s.arrival_time !~ '^[0-2][0-9]:[0-5][0-9]:[0-5][0-9]$')
             OR (s.departure_time IS NOT NULL AND
                 s.departure_time !~ '^[0-2][0-9]:[0-5][0-9]:[0-5][0-9]$')))
    ) THEN RAISE EXCEPTION 'TobuSkytree stop order, station scope or clock invalid'; END IF;

    -- The upstream GTFS train_short_name sometimes includes a service name
    -- (e.g. "1007 スペーシアX 1号"). Keep its actual number token; no vehicle
    -- inference from the service name. Repeated public numbers get distinct
    -- source_occurrence values and retain independent trip_id identity.
    INSERT INTO public.manual_timetable_templates
      (line_key,calendar_urn,train_number,railway_urn,direction_urn,
       train_type_urn,destination_urns,vehicle_type_label,source_path,
       source_occurrence,source_trip_id,source_revision_date)
    SELECT
      'TobuSkytree',
      'odpt.Calendar:' || t.service_id,
      regexp_replace(t.train_number, '^([A-Za-z0-9_-]+)[[:space:]].*$', '\1'),
      'odpt.Railway:Tobu.TobuSkytree',
      CASE t.direction_id WHEN '0' THEN 'odpt.RailDirection:Outbound'
                          WHEN '1' THEN 'odpt.RailDirection:Inbound' END,
      CASE
        WHEN t.headsign LIKE '(普通 Local)%' THEN 'odpt.TrainType:Tobu.Local'
        WHEN t.headsign LIKE '(急行 Express)%' THEN 'odpt.TrainType:Tobu.Express'
        WHEN t.headsign LIKE '(区間急行 Section Express)%' THEN 'odpt.TrainType:Tobu.SectionExpress'
        WHEN t.headsign LIKE '(準急 Semi Express)%' THEN 'odpt.TrainType:Tobu.SemiExpress'
        WHEN t.headsign LIKE '(区間準急 Section Semi Express)%' THEN 'odpt.TrainType:Tobu.SectionSemiExpress'
        WHEN t.headsign LIKE '(有料特急 Toll Limited Express)%' THEN 'odpt.TrainType:Tobu.LimitedExpress'
        WHEN t.headsign LIKE '(有料THライナー Toll TH-LINER)%' THEN 'odpt.TrainType:Tobu.THLiner'
        ELSE NULL
      END,
      ARRAY[('odpt.Station:' || (
        SELECT st.stop_id FROM gtfs_stage.stop_times st
        WHERE st.feed_sha=t.feed_sha AND st.trip_id=t.trip_id
        ORDER BY st.stop_sequence DESC LIMIT 1
      ))]::text[],
      NULL::text, v_source,
      (row_number() OVER (
        PARTITION BY t.service_id,
          regexp_replace(t.train_number, '^([A-Za-z0-9_-]+)[[:space:]].*$', '\1')
        ORDER BY t.trip_id
      )-1)::integer,
      t.trip_id,NULL::date
    FROM gtfs_stage.trips t
    WHERE t.feed_sha=v_sha AND t.route_id='Tobu.TobuSkytree';

    INSERT INTO public.manual_timetable_template_stops
      (template_id,stop_sequence,arrival_station_urn,departure_station_urn,
       arrival_clock,departure_clock)
    SELECT m.id,s.stop_sequence,
      CASE WHEN s.arrival_time IS NOT NULL
           THEN 'odpt.Station:'||s.stop_id ELSE NULL END,
      CASE WHEN s.departure_time IS NOT NULL
           THEN 'odpt.Station:'||s.stop_id ELSE NULL END,
      left(s.arrival_time,5),left(s.departure_time,5)
    FROM public.manual_timetable_templates m
    JOIN gtfs_stage.stop_times s ON s.feed_sha=v_sha AND s.trip_id=m.source_trip_id
    WHERE m.line_key='TobuSkytree' AND m.source_path=v_source;

    -- An independent canonical source-only identity for every GTFS trip:
    -- DO NOT merge merely because the train number or transfer block matches.
    INSERT INTO public.train_timetables
      (canonical_key,calendar_urn,primary_train_number,
       lead_source_template_id,group_evidence,timetable_validity)
    SELECT 'gtfs-source:'||m.id,m.calendar_urn,m.train_number,m.id,
      'source_only','undated_not_current_verified'
    FROM public.manual_timetable_templates m
    WHERE m.line_key='TobuSkytree' AND m.source_path=v_source;

    INSERT INTO public.train_timetable_members
      (source_template_id,timetable_id,segment_order,member_role,
       first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop)
    SELECT m.id,tt.id,0,'primary',min(s.stop_sequence),max(s.stop_sequence),0,false
    FROM public.manual_timetable_templates m
    JOIN public.train_timetables tt ON tt.lead_source_template_id=m.id
    JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
    WHERE m.line_key='TobuSkytree' AND m.source_path=v_source
    GROUP BY m.id,tt.id;
  END IF;

  IF (SELECT count(*) FROM public.manual_timetable_templates
       WHERE line_key='TobuSkytree' AND source_path=v_source)<>1738
    OR (SELECT count(*) FROM public.manual_timetable_template_stops s
        JOIN public.manual_timetable_templates m ON m.id=s.template_id
        WHERE m.line_key='TobuSkytree' AND m.source_path=v_source)<>20860
    OR (SELECT count(*) FROM public.train_timetable_members tm
        JOIN public.manual_timetable_templates m ON m.id=tm.source_template_id
        WHERE m.line_key='TobuSkytree' AND m.source_path=v_source)<>1738
  THEN RAISE EXCEPTION 'Canonical GTFS plan promotion incomplete; rollback'; END IF;

  UPDATE public.railway_lines SET sql_planned_fallback_enabled=true
  WHERE id='TobuSkytree';
  IF NOT FOUND THEN RAISE EXCEPTION 'TobuSkytree railway registry unavailable'; END IF;
END
$tobu_gtfs$;

-- Service dates, inclusive, including calendar_dates exceptions.
-- No guessed holiday calendar, no cross-feed trip_id, no public DB access.
CREATE OR REPLACE FUNCTION public.tobu_skytree_active_gtfs_trip_ids(p_service_date date)
RETURNS TABLE(trip_id text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog,gtfs_stage,public
AS $gtfs_calendar$
  SELECT t.trip_id
  FROM gtfs_stage.trips t
  JOIN gtfs_stage.service_calendar c
    ON c.feed_sha=t.feed_sha AND c.service_id=t.service_id
  JOIN gtfs_stage.feed_imports f ON f.feed_sha=t.feed_sha
  LEFT JOIN gtfs_stage.service_exceptions ex
    ON ex.feed_sha=t.feed_sha AND ex.service_id=t.service_id
      AND ex.service_date=p_service_date
  WHERE t.feed_sha='bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f'
    AND t.route_id='Tobu.TobuSkytree'
    AND p_service_date BETWEEN f.service_start AND f.service_end
    AND COALESCE(ex.exception_type=1,
      p_service_date BETWEEN c.start_date AND c.end_date
      AND substring(c.week_mask FROM extract(isodow FROM p_service_date)::int FOR 1)='1')
  ORDER BY t.trip_id
$gtfs_calendar$;
REVOKE ALL ON FUNCTION public.tobu_skytree_active_gtfs_trip_ids(date)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tobu_skytree_active_gtfs_trip_ids(date)
  TO service_role;
COMMENT ON FUNCTION public.tobu_skytree_active_gtfs_trip_ids(date) IS
 'Private checksum-locked TokyoGTFS TobuSkytree trip-day validation. No live position or physical vehicle evidence.';
