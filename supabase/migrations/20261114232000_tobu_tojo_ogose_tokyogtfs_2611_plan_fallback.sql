-- Tobu Tojo (39 stations) / Ogose (8 stations) source-only published GTFS plans.
-- Source: Akihiko Kusanagi, TokyoGTFS (MIT), https://github.com/MKuranowski/TokyoGTFS
-- Exact staged feed: 2026-11-02..2027-11-02, immutable checksum below.
-- IMPORTANT: scheduled position != realtime observation != actual carset.
-- No guessed cross-operator continuation or PNG; each GTFS trip is isolated.
-- This migration is idempotent and fails closed on changed source/partial runs.
DO $tobu_gtfs$
DECLARE
  v_sha CONSTANT text := 'bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f';
  rec RECORD;
  v_source text;
  n integer;
  stop_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('tobu-tojo-ogose-tokyogtfs-202611'));
  IF NOT EXISTS (
    SELECT 1 FROM gtfs_stage.feed_imports
    WHERE feed_sha=v_sha AND service_start=DATE '2026-11-02'
      AND service_end=DATE '2027-11-02' AND staged_trip_count=19358
      AND staged_stop_time_count=279607
  ) THEN RAISE EXCEPTION '2026-11 TokyoGTFS checksum or service calendar changed'; END IF;

  FOR rec IN
    SELECT * FROM (VALUES
      ('Tojo','Tobu.Tojo',1760,933,827,24064,39,33),
      ('Ogose','Tobu.Ogose',290,146,144,2320,8,8)
    ) x(line_key,route_id,trip_count,weekday_count,holiday_count,stop_count,station_count,max_stops)
  LOOP
    v_source:='gtfs-stage:TokyoGTFS:'||v_sha||':'||rec.line_key;
    SELECT count(*) INTO n FROM public.manual_timetable_templates WHERE line_key=rec.line_key;
    IF n<>0 THEN
      IF n<>rec.trip_count OR EXISTS (
        SELECT 1 FROM public.manual_timetable_templates
        WHERE line_key=rec.line_key AND source_path<>v_source
      ) THEN RAISE EXCEPTION '% has other or incomplete timetable sources',rec.line_key; END IF;
    ELSE
      IF (SELECT count(*) FROM gtfs_stage.trips
          WHERE feed_sha=v_sha AND route_id=rec.route_id)<>rec.trip_count
         OR (SELECT count(*) FROM gtfs_stage.trips
             WHERE feed_sha=v_sha AND route_id=rec.route_id AND service_id='Weekday')<>rec.weekday_count
         OR (SELECT count(*) FROM gtfs_stage.trips
             WHERE feed_sha=v_sha AND route_id=rec.route_id AND service_id='SaturdayHoliday')<>rec.holiday_count
         OR EXISTS (
           SELECT 1 FROM gtfs_stage.trips
           WHERE feed_sha=v_sha AND route_id=rec.route_id
             AND (service_id NOT IN ('Weekday','SaturdayHoliday')
               OR direction_id NOT IN ('0','1')
               OR train_number IS NULL OR train_number=''
               OR trip_id NOT LIKE rec.route_id||'.%')
         )
      THEN RAISE EXCEPTION '% GTFS trip roster unexpected',rec.line_key; END IF;

      SELECT count(*) INTO stop_count
      FROM gtfs_stage.stop_times s
      JOIN gtfs_stage.trips t ON t.feed_sha=s.feed_sha AND t.trip_id=s.trip_id
      WHERE t.feed_sha=v_sha AND t.route_id=rec.route_id;
      IF stop_count<>rec.stop_count
         OR (SELECT count(DISTINCT s.stop_id)
            FROM gtfs_stage.stop_times s JOIN gtfs_stage.trips t
              ON t.feed_sha=s.feed_sha AND t.trip_id=s.trip_id
            WHERE t.feed_sha=v_sha AND t.route_id=rec.route_id)<>rec.station_count
         OR EXISTS (
          SELECT 1 FROM gtfs_stage.trips t
          LEFT JOIN gtfs_stage.stop_times s
            ON s.feed_sha=t.feed_sha AND s.trip_id=t.trip_id
          WHERE t.feed_sha=v_sha AND t.route_id=rec.route_id
          GROUP BY t.feed_sha,t.trip_id
          HAVING count(s.stop_id)<2 OR count(s.stop_id)>rec.max_stops
             OR count(s.stop_id)<>max(s.stop_sequence)-min(s.stop_sequence)+1
             OR bool_or(s.stop_id IS NOT NULL AND (
                 s.stop_id NOT LIKE rec.route_id||'.%' OR
                 coalesce(s.arrival_time,s.departure_time) IS NULL OR
                 (s.arrival_time IS NOT NULL
                   AND s.arrival_time !~ '^[0-2][0-9]:[0-5][0-9]:[0-5][0-9]$') OR
                 (s.departure_time IS NOT NULL
                   AND s.departure_time !~ '^[0-2][0-9]:[0-5][0-9]:[0-5][0-9]$')
             ))
        )
      THEN RAISE EXCEPTION '% invalid stop times or station topology',rec.line_key; END IF;

      INSERT INTO public.manual_timetable_templates
        (line_key,calendar_urn,train_number,railway_urn,direction_urn,
         train_type_urn,destination_urns,vehicle_type_label,source_path,
         source_occurrence,source_trip_id,source_revision_date)
      SELECT rec.line_key,
        'odpt.Calendar:'||t.service_id,
        regexp_replace(t.train_number, '^([A-Za-z0-9_-]+)[[:space:]].*$', '\1'),
        'odpt.Railway:Tobu.'||rec.line_key,
        CASE t.direction_id WHEN '0' THEN 'odpt.RailDirection:Outbound'
                            WHEN '1' THEN 'odpt.RailDirection:Inbound' END,
        CASE
          WHEN t.headsign LIKE '(普通 Local)%' THEN 'odpt.TrainType:Tobu.Local'
          WHEN t.headsign LIKE '(Fライナー F-Liner)%' THEN 'odpt.TrainType:TokyoMetro.F-Liner'
          WHEN t.headsign LIKE '(急行 Express)%' THEN 'odpt.TrainType:Tobu.Express'
          WHEN t.headsign LIKE '(準急 Semi Express)%' THEN 'odpt.TrainType:Tobu.SemiExpress'
          WHEN t.headsign LIKE '(快速急行 Rapid Express)%' THEN 'odpt.TrainType:Tobu.RapidExpress'
          WHEN t.headsign LIKE '(川越特急 Kawagoe Limited Express)%' THEN 'odpt.TrainType:Tobu.KawagoeLimitedExpress'
          WHEN t.headsign LIKE '(有料TJライナー Toll TJ-Liner)%' THEN 'odpt.TrainType:Tobu.TJ-Liner'
          ELSE NULL
        END,
        ARRAY[('odpt.Station:'||(
          SELECT s.stop_id FROM gtfs_stage.stop_times s
          WHERE s.feed_sha=t.feed_sha AND s.trip_id=t.trip_id
          ORDER BY s.stop_sequence DESC LIMIT 1
        ))]::text[],
        NULL::text,v_source,
        (row_number() OVER (PARTITION BY t.service_id,
          regexp_replace(t.train_number, '^([A-Za-z0-9_-]+)[[:space:]].*$', '\1')
          ORDER BY t.trip_id)-1)::integer,
        t.trip_id,NULL::date
      FROM gtfs_stage.trips t
      WHERE t.feed_sha=v_sha AND t.route_id=rec.route_id;

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
      JOIN gtfs_stage.stop_times s
        ON s.feed_sha=v_sha AND s.trip_id=m.source_trip_id
      WHERE m.line_key=rec.line_key AND m.source_path=v_source;

      INSERT INTO public.train_timetables
        (canonical_key,calendar_urn,primary_train_number,
         lead_source_template_id,group_evidence,timetable_validity)
      SELECT 'gtfs-source:'||m.id,m.calendar_urn,m.train_number,m.id,
             'source_only','undated_not_current_verified'
      FROM public.manual_timetable_templates m
      WHERE m.line_key=rec.line_key AND m.source_path=v_source;

      INSERT INTO public.train_timetable_members
        (source_template_id,timetable_id,segment_order,member_role,
         first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop)
      SELECT m.id,tt.id,0,'primary',min(s.stop_sequence),max(s.stop_sequence),0,false
      FROM public.manual_timetable_templates m
      JOIN public.train_timetables tt ON tt.lead_source_template_id=m.id
      JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
      WHERE m.line_key=rec.line_key AND m.source_path=v_source
      GROUP BY m.id,tt.id;
    END IF;

    IF (SELECT count(*) FROM public.manual_timetable_templates
        WHERE line_key=rec.line_key AND source_path=v_source)<>rec.trip_count
      OR (SELECT count(*) FROM public.manual_timetable_template_stops s
          JOIN public.manual_timetable_templates m ON m.id=s.template_id
          WHERE m.line_key=rec.line_key AND m.source_path=v_source)<>rec.stop_count
      OR (SELECT count(*) FROM public.train_timetable_members tm
          JOIN public.manual_timetable_templates m ON m.id=tm.source_template_id
          WHERE m.line_key=rec.line_key AND m.source_path=v_source)<>rec.trip_count
    THEN RAISE EXCEPTION '% canonical import row counts mismatch',rec.line_key; END IF;

    UPDATE public.railway_lines
    SET sql_planned_fallback_enabled=true
    WHERE id=rec.line_key;
    IF NOT FOUND THEN RAISE EXCEPTION '% registry entry missing',rec.line_key; END IF;
  END LOOP;
END
$tobu_gtfs$;

-- Existing private checksum- and calendar-aware whitelist function, now
-- permitting the two additional Tobu lines; unknown lines still return none.
CREATE OR REPLACE FUNCTION public.tobu_tokyogtfs_active_trip_ids(
  p_line_key text, p_service_date date
)
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
    AND t.route_id=CASE p_line_key
      WHEN 'TobuSkytree' THEN 'Tobu.TobuSkytree'
      WHEN 'Noda' THEN 'Tobu.TobuUrbanPark'
      WHEN 'Tojo' THEN 'Tobu.Tojo'
      WHEN 'Ogose' THEN 'Tobu.Ogose'
      ELSE NULL END
    AND p_service_date BETWEEN f.service_start AND f.service_end
    AND COALESCE(ex.exception_type=1,
      p_service_date BETWEEN c.start_date AND c.end_date
      AND substring(c.week_mask FROM extract(isodow FROM p_service_date)::int FOR 1)='1')
  ORDER BY t.trip_id
$gtfs_calendar$;
REVOKE ALL ON FUNCTION public.tobu_tokyogtfs_active_trip_ids(text,date)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tobu_tokyogtfs_active_trip_ids(text,date)
  TO service_role;
COMMENT ON FUNCTION public.tobu_tokyogtfs_active_trip_ids(text,date) IS
 'Service-role-only TokyoGTFS 2026-11 exact route/date/checksum whitelist; not realtime or physical vehicle evidence.';
