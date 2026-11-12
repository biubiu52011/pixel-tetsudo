-- Applied directly to Supabase 2026-11-12; idempotent source definition.
CREATE OR REPLACE FUNCTION public.import_tokyo_gtfs_batch(p_feed_sha text, p_kind text, p_rows jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'gtfs_stage', 'public'
AS $function$
DECLARE n int; imported int:=0; r int; s int; t int; st int; tr int; c int; e int;
BEGIN
 IF p_feed_sha <> 'bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f' THEN RAISE EXCEPTION 'Unexpected source revision'; END IF;
 IF jsonb_typeof(p_rows)<>'array' THEN RAISE EXCEPTION 'Expected array'; END IF;
 n:=jsonb_array_length(p_rows);
 IF n>1000 THEN RAISE EXCEPTION 'Oversize batch'; END IF;
 IF p_kind<>'complete' AND n=0 THEN RAISE EXCEPTION 'Empty batch'; END IF;
 IF p_kind='complete' AND n<>0 THEN RAISE EXCEPTION 'Complete must be empty'; END IF;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_rows) a WHERE a->>'feed_sha' IS DISTINCT FROM p_feed_sha) THEN RAISE EXCEPTION 'Feed checksum mismatch'; END IF;
 IF NOT EXISTS (SELECT 1 FROM gtfs_stage.feed_imports WHERE feed_sha=p_feed_sha) THEN RAISE EXCEPTION 'Source not registered'; END IF;
 CASE p_kind
 WHEN 'routes' THEN
 INSERT INTO gtfs_stage.routes(feed_sha,route_id,agency_id,route_short_name,route_long_name,route_type,candidate_status,canonical_line_key)
 SELECT feed_sha,route_id,agency_id,route_short_name,route_long_name,route_type,candidate_status,canonical_line_key FROM jsonb_populate_recordset(NULL::gtfs_stage.routes,p_rows)
 ON CONFLICT(feed_sha,route_id) DO UPDATE SET route_short_name=excluded.route_short_name,route_long_name=excluded.route_long_name,route_type=excluded.route_type;
 WHEN 'stops' THEN
 INSERT INTO gtfs_stage.stops(feed_sha,stop_id,stop_name,latitude,longitude,parent_station,location_type)
 SELECT feed_sha,stop_id,stop_name,latitude,longitude,parent_station,location_type FROM jsonb_populate_recordset(NULL::gtfs_stage.stops,p_rows)
 ON CONFLICT(feed_sha,stop_id) DO NOTHING;
 WHEN 'calendar' THEN
 INSERT INTO gtfs_stage.service_calendar(feed_sha,service_id,start_date,end_date,week_mask)
 SELECT feed_sha,service_id,start_date,end_date,week_mask FROM jsonb_populate_recordset(NULL::gtfs_stage.service_calendar,p_rows)
 ON CONFLICT(feed_sha,service_id) DO NOTHING;
 WHEN 'exceptions' THEN
 INSERT INTO gtfs_stage.service_exceptions(feed_sha,service_id,service_date,exception_type)
 SELECT feed_sha,service_id,service_date,exception_type FROM jsonb_populate_recordset(NULL::gtfs_stage.service_exceptions,p_rows)
 ON CONFLICT(feed_sha,service_id,service_date) DO NOTHING;
 WHEN 'trips' THEN
 INSERT INTO gtfs_stage.trips(feed_sha,trip_id,route_id,service_id,train_number,headsign,direction_id,shape_id,block_id,exceptional,vehicle_kind)
 SELECT feed_sha,trip_id,route_id,service_id,train_number,headsign,direction_id,shape_id,block_id,exceptional,vehicle_kind FROM jsonb_populate_recordset(NULL::gtfs_stage.trips,p_rows)
 ON CONFLICT(feed_sha,trip_id) DO NOTHING;
 WHEN 'stop_times' THEN
 INSERT INTO gtfs_stage.stop_times(feed_sha,trip_id,stop_sequence,stop_id,arrival_time,departure_time,shape_dist_traveled)
 SELECT feed_sha,trip_id,stop_sequence,stop_id,arrival_time,departure_time,shape_dist_traveled FROM jsonb_populate_recordset(NULL::gtfs_stage.stop_times,p_rows)
 ON CONFLICT(feed_sha,trip_id,stop_sequence) DO NOTHING;
 WHEN 'transfers' THEN
 INSERT INTO gtfs_stage.transfers(feed_sha,from_trip_id,to_trip_id,transfer_type)
 SELECT feed_sha,from_trip_id,to_trip_id,transfer_type FROM jsonb_populate_recordset(NULL::gtfs_stage.transfers,p_rows)
 ON CONFLICT(feed_sha,from_trip_id,to_trip_id,transfer_type) DO NOTHING;
 WHEN 'complete' THEN
 SELECT count(*) INTO r FROM gtfs_stage.routes WHERE feed_sha=p_feed_sha;
 SELECT count(*) INTO s FROM gtfs_stage.stops WHERE feed_sha=p_feed_sha;
 SELECT count(*) INTO t FROM gtfs_stage.trips WHERE feed_sha=p_feed_sha;
 SELECT count(*) INTO st FROM gtfs_stage.stop_times WHERE feed_sha=p_feed_sha;
 SELECT count(*) INTO tr FROM gtfs_stage.transfers WHERE feed_sha=p_feed_sha;
 SELECT count(*) INTO c FROM gtfs_stage.service_calendar WHERE feed_sha=p_feed_sha;
 SELECT count(*) INTO e FROM gtfs_stage.service_exceptions WHERE feed_sha=p_feed_sha;
 IF r<>165 OR s<>707 OR t<>18821 OR st<>276106 OR tr<>663 OR c<>4 OR e<>48 THEN
  RAISE EXCEPTION 'Incomplete source counts: routes %, stops %, trips %, stop_times %, transfers %, calendars %, exceptions %',r,s,t,st,tr,c,e;
 END IF;
 UPDATE gtfs_stage.feed_imports SET staged_trip_count=t,staged_stop_time_count=st,imported_at=now() WHERE feed_sha=p_feed_sha;
 RETURN jsonb_build_object('ok',true,'status','complete','routes',r,'stations',s,'trips',t,'stop_times',st,'transfers',tr,'calendars',c,'exceptions',e);
 ELSE RAISE EXCEPTION 'Unsupported kind';
 END CASE;
 GET DIAGNOSTICS imported = ROW_COUNT;
 RETURN jsonb_build_object('ok',true,'kind',p_kind,'seen',n,'changed',imported);
END;
$function$

REVOKE ALL ON FUNCTION public.import_tokyo_gtfs_batch(text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.import_tokyo_gtfs_batch(text,text,jsonb) TO service_role;
