-- Keio Inokashira: source-only published GTFS plans, not observed rolling
-- stock or official full-line clock verification. Exact source date gate was
-- deployed in train-runs v387 before this import.
DO $keio$
DECLARE
  v_sha constant text := 'bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f';
  v_source constant text := 'gtfs-stage:TokyoGTFS:bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f:KeioInokashira';
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('keio-inokashira-tokyogtfs-p0'));
 IF NOT EXISTS (SELECT 1 FROM gtfs_stage.feed_imports WHERE feed_sha=v_sha AND service_start=DATE '2026-11-02' AND service_end=DATE '2027-11-02') THEN RAISE EXCEPTION 'Unexpected GTFS feed'; END IF;
 IF (SELECT count(*) FROM gtfs_stage.trips WHERE feed_sha=v_sha AND route_id='Keio.Inokashira')<>1178
 OR (SELECT count(*) FROM gtfs_stage.trips WHERE feed_sha=v_sha AND route_id='Keio.Inokashira' AND service_id='Weekday')<>630
 OR (SELECT count(*) FROM gtfs_stage.trips WHERE feed_sha=v_sha AND route_id='Keio.Inokashira' AND service_id='SaturdayHoliday')<>548
 OR EXISTS (SELECT 1 FROM gtfs_stage.trips WHERE feed_sha=v_sha AND route_id='Keio.Inokashira' AND (service_id NOT IN ('Weekday','SaturdayHoliday') OR direction_id NOT IN ('0','1') OR train_number IS NULL OR train_number !~ '^[0-9]+[A-Za-z]?$' OR exceptional IS DISTINCT FROM '0' OR trip_id NOT LIKE 'Keio.Inokashira.%' OR headsign NOT LIKE '(各駅停車 Local)%' AND headsign NOT LIKE '(急行 Express)%'))
 THEN RAISE EXCEPTION 'Unexpected Inokashira roster'; END IF;
 IF (SELECT count(*) FROM gtfs_stage.stop_times s JOIN gtfs_stage.trips t USING(feed_sha,trip_id) WHERE t.feed_sha=v_sha AND t.route_id='Keio.Inokashira')<>14035 THEN RAISE EXCEPTION 'Unexpected Inokashira stop count'; END IF;
 IF EXISTS (
 WITH ranked AS (
 SELECT t.trip_id,t.direction_id,t.headsign,s.stop_sequence,s.stop_id,s.arrival_time,s.departure_time,x.stop_name,l.station_index,
 lag(l.station_index) over(partition by t.trip_id order by s.stop_sequence) as prev_index,
 lag(coalesce(s.departure_time,s.arrival_time)) over(partition by t.trip_id order by s.stop_sequence) as prev_clock
 FROM gtfs_stage.trips t JOIN gtfs_stage.stop_times s USING(feed_sha,trip_id)
 JOIN gtfs_stage.stops x USING(feed_sha,stop_id)
 LEFT JOIN public.line_stations l ON l.line_id='KeioInokashira' AND lower(replace(l.station_name,'-',''))=lower(split_part(s.stop_id,'.',3))
 WHERE t.feed_sha=v_sha AND t.route_id='Keio.Inokashira'
 )
 SELECT 1 FROM ranked GROUP BY trip_id,headsign
 HAVING count(*)<2 OR count(*)<>max(stop_sequence)-min(stop_sequence)+1 OR bool_or(station_index IS NULL OR stop_id NOT LIKE 'Keio.Inokashira.%' OR
 (prev_index IS NOT NULL AND (CASE direction_id WHEN '0' THEN station_index<=prev_index ELSE station_index>=prev_index END)) OR
 (arrival_time IS NULL AND departure_time IS NULL) OR
 (arrival_time IS NOT NULL AND arrival_time !~ '^[0-2][0-9]:[0-5][0-9]:[0-5][0-9]$') OR
 (departure_time IS NOT NULL AND departure_time !~ '^[0-2][0-9]:[0-5][0-9]:[0-5][0-9]$') OR
 (prev_clock IS NOT NULL AND coalesce(arrival_time,departure_time)<prev_clock) OR
 (arrival_time IS NOT NULL AND departure_time IS NOT NULL AND arrival_time>departure_time))
 OR headsign NOT LIKE '%'||(array_agg(stop_name ORDER BY stop_sequence DESC))[1]
 ) THEN RAISE EXCEPTION 'Inokashira topology, times or terminus failed'; END IF;
 IF EXISTS (SELECT 1 FROM public.manual_timetable_templates WHERE line_key='KeioInokashira') THEN RAISE EXCEPTION 'Inokashira already has source rows; reconcile rather than overwrite'; END IF;
 INSERT INTO public.manual_timetable_templates
 (line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,destination_urns,vehicle_type_label,source_path,source_occurrence,source_trip_id,source_revision_date)
 SELECT 'KeioInokashira','odpt.Calendar:'||t.service_id,t.train_number,'odpt.Railway:Keio.Inokashira',
 CASE t.direction_id WHEN '0' THEN 'odpt.RailDirection:Outbound' ELSE 'odpt.RailDirection:Inbound' END,
 CASE WHEN t.headsign LIKE '(急行 Express)%' THEN 'odpt.TrainType:Keio.Express' ELSE 'odpt.TrainType:Keio.Local' END,
 ARRAY['odpt.Station:'||(SELECT s.stop_id FROM gtfs_stage.stop_times s WHERE s.feed_sha=t.feed_sha AND s.trip_id=t.trip_id ORDER BY s.stop_sequence DESC LIMIT 1)],
 NULL,v_source,(row_number() over(partition by t.service_id,t.train_number order by t.trip_id)-1)::integer,t.trip_id,NULL
 FROM gtfs_stage.trips t WHERE t.feed_sha=v_sha AND t.route_id='Keio.Inokashira';
 INSERT INTO public.manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT m.id,s.stop_sequence,CASE WHEN s.arrival_time IS NOT NULL THEN 'odpt.Station:'||s.stop_id END,CASE WHEN s.departure_time IS NOT NULL THEN 'odpt.Station:'||s.stop_id END,left(s.arrival_time,5),left(s.departure_time,5)
 FROM public.manual_timetable_templates m JOIN gtfs_stage.stop_times s ON s.feed_sha=v_sha AND s.trip_id=m.source_trip_id
 WHERE m.line_key='KeioInokashira' AND m.source_path=v_source;
 INSERT INTO public.train_timetables(canonical_key,calendar_urn,primary_train_number,lead_source_template_id,group_evidence,timetable_validity)
 SELECT 'gtfs-source:'||m.id,m.calendar_urn,m.train_number,m.id,'source_only','undated_not_current_verified' FROM public.manual_timetable_templates m WHERE m.line_key='KeioInokashira' AND m.source_path=v_source;
 INSERT INTO public.train_timetable_members(source_template_id,timetable_id,segment_order,member_role,first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop)
 SELECT m.id,tt.id,0,'primary',min(s.stop_sequence),max(s.stop_sequence),0,false FROM public.manual_timetable_templates m JOIN public.train_timetables tt ON tt.lead_source_template_id=m.id JOIN public.manual_timetable_template_stops s ON s.template_id=m.id WHERE m.line_key='KeioInokashira' AND m.source_path=v_source GROUP BY m.id,tt.id;
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='KeioInokashira' AND source_path=v_source)<>1178 OR
 (SELECT count(*) FROM public.manual_timetable_template_stops s JOIN public.manual_timetable_templates m ON m.id=s.template_id WHERE m.line_key='KeioInokashira' AND m.source_path=v_source)<>14035 OR
 (SELECT count(*) FROM public.train_timetable_members tm JOIN public.manual_timetable_templates m ON m.id=tm.source_template_id WHERE m.line_key='KeioInokashira' AND m.source_path=v_source)<>1178 THEN RAISE EXCEPTION 'Inokashira import verification failed'; END IF;
 -- Keep existing realtime capability; do not activate a fallback until the
 -- public endpoint and UI are checked separately.
END
$keio$;

