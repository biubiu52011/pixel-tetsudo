-- Keio Main/Takao: exact, source-only TokyoGTFS line segments.
-- Retain the source headsign destination rather than falsely substituting
-- the last stop of an intra-line segment. Do not infer a through-train merge.
-- The two anomalous Takao Mt.TAKAO trips remain in gtfs_stage only.
DO $keio$
DECLARE
 v_sha constant text := 'bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f';
 rec record;
 v_source text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('keio-main-takao-tokyogtfs-p0'));
 IF NOT EXISTS (SELECT 1 FROM gtfs_stage.feed_imports WHERE feed_sha=v_sha AND service_start=DATE '2026-11-02' AND service_end=DATE '2027-11-02') THEN RAISE EXCEPTION 'Unexpected GTFS feed'; END IF;
 IF (SELECT count(*) FROM gtfs_stage.trips WHERE feed_sha=v_sha AND route_id='Keio.Takao')<>441
 OR (SELECT array_agg(DISTINCT t.trip_id ORDER BY t.trip_id) FROM gtfs_stage.trips t JOIN gtfs_stage.stop_times s USING(feed_sha,trip_id) WHERE t.feed_sha=v_sha AND t.route_id='Keio.Takao' AND s.stop_id='Keio.Takao.Meidaimae') IS DISTINCT FROM ARRAY['Keio.Takao.7501.SaturdayHoliday','Keio.Takao.7503.SaturdayHoliday']::text[]
 THEN RAISE EXCEPTION 'Takao anomaly scope changed'; END IF;
 CREATE TEMP TABLE keio_p0_candidates ON COMMIT DROP AS
 SELECT t.*,CASE t.route_id WHEN 'Keio.Keio' THEN 'KeioMain' ELSE 'KeioTakao' END AS line_key,
 split_part(t.train_number,' ',1) AS source_number,
 CASE split_part(regexp_replace(t.headsign,'^\([^)]*\) ',''),' ',1)
 WHEN 'つつじヶ丘' THEN 'Keio.Keio.Tsutsujigaoka'
 WHEN '京王八王子' THEN 'Keio.Keio.KeioHachioji'
 WHEN '京王多摩センター' THEN 'Keio.Sagamihara.KeioTamaCenter'
 WHEN '大島' THEN 'Toei.Shinjuku.Ojima'
 WHEN '新宿' THEN 'Keio.Keio.Shinjuku'
 WHEN '本八幡' THEN 'Toei.Shinjuku.Motoyawata'
 WHEN '桜上水' THEN 'Keio.Keio.Sakurajosui'
 WHEN '橋本' THEN 'Keio.Sagamihara.Hashimoto'
 WHEN '若葉台' THEN 'Keio.Sagamihara.Wakabadai'
 WHEN '調布' THEN 'Keio.Keio.Chofu'
 WHEN '高尾' THEN 'Keio.Takao.Takao'
 WHEN '高尾山口' THEN 'Keio.Takao.Takaosanguchi'
 WHEN '高幡不動' THEN 'Keio.Keio.Takahatafudo'
 WHEN '北野' THEN 'Keio.Takao.Kitano' END AS destination_suffix,
 CASE split_part(t.headsign,')',1)
 WHEN '(各駅停車 Local' THEN 'Local'
 WHEN '(急行 Express' THEN 'Express'
 WHEN '(区間急行 Semi Express' THEN 'SemiExpress'
 WHEN '(快速 Rapid' THEN 'Rapid'
 WHEN '(特急 Limited Express' THEN 'LimitedExpress'
 WHEN '(有料京王ライナー Toll Keio Liner' THEN 'KeioLiner' END AS train_type
 FROM gtfs_stage.trips t
 WHERE t.feed_sha=v_sha AND t.route_id IN ('Keio.Keio','Keio.Takao')
 AND NOT (t.route_id='Keio.Takao' AND t.trip_id IN ('Keio.Takao.7501.SaturdayHoliday','Keio.Takao.7503.SaturdayHoliday'));
 IF EXISTS(SELECT 1 FROM keio_p0_candidates WHERE destination_suffix IS NULL OR train_type IS NULL OR service_id NOT IN ('Weekday','SaturdayHoliday') OR direction_id NOT IN ('0','1') OR source_number IS NULL OR source_number !~ '^[A-Za-z0-9_-]+$' OR split_part(trip_id,'.',3)<>source_number OR exceptional IS DISTINCT FROM '0' OR trip_id NOT LIKE route_id||'.%') THEN RAISE EXCEPTION 'Unmapped source headsign, number, service type or direction'; END IF;
 FOR rec IN SELECT * FROM (VALUES ('KeioMain','Keio.Keio',1675,873,802,23460),('KeioTakao','Keio.Takao',439,219,220,3027)) x(line_key,route_id,trips,weekday,holiday,stops)
 LOOP
  v_source:='gtfs-stage:TokyoGTFS:'||v_sha||':'||rec.line_key;
  IF (SELECT count(*) FROM keio_p0_candidates c WHERE c.line_key=rec.line_key)<>rec.trips
  OR (SELECT count(*) FROM keio_p0_candidates c WHERE c.line_key=rec.line_key AND c.service_id='Weekday')<>rec.weekday
  OR (SELECT count(*) FROM keio_p0_candidates c WHERE c.line_key=rec.line_key AND c.service_id='SaturdayHoliday')<>rec.holiday
  OR (SELECT count(*) FROM keio_p0_candidates c JOIN gtfs_stage.stop_times s USING(feed_sha,trip_id) WHERE c.line_key=rec.line_key)<>rec.stops
  THEN RAISE EXCEPTION '% unexpected source roster',rec.line_key; END IF;
  IF EXISTS(
   WITH ranked AS (
    SELECT c.trip_id,c.direction_id,s.stop_sequence,s.stop_id,s.arrival_time,s.departure_time,l.station_index,
    lag(l.station_index) over(partition by c.trip_id order by s.stop_sequence) AS prev_index,
    lag(coalesce(s.departure_time,s.arrival_time)) over(partition by c.trip_id order by s.stop_sequence) AS prev_clock
    FROM keio_p0_candidates c JOIN gtfs_stage.stop_times s USING(feed_sha,trip_id)
    LEFT JOIN public.line_stations l ON l.line_id=rec.line_key AND lower(CASE l.station_name WHEN 'Hiyamajo-koen' THEN 'HirayamajoshiKoen' WHEN 'Musashidai' THEN 'Musashinodai' ELSE replace(l.station_name,'-','') END)=lower(split_part(s.stop_id,'.',3))
    WHERE c.line_key=rec.line_key
   )
   SELECT 1 FROM ranked GROUP BY trip_id
   HAVING count(*)<2 OR count(*)<>max(stop_sequence)-min(stop_sequence)+1 OR bool_or(station_index IS NULL OR stop_id NOT LIKE rec.route_id||'.%' OR
    (prev_index IS NOT NULL AND (CASE direction_id WHEN '0' THEN station_index<=prev_index ELSE station_index>=prev_index END)) OR
    (arrival_time IS NULL AND departure_time IS NULL) OR
    (arrival_time IS NOT NULL AND arrival_time !~ '^[0-2][0-9]:[0-5][0-9]:[0-5][0-9]$') OR
    (departure_time IS NOT NULL AND departure_time !~ '^[0-2][0-9]:[0-5][0-9]:[0-5][0-9]$') OR
    (prev_clock IS NOT NULL AND coalesce(arrival_time,departure_time)<prev_clock) OR
    (arrival_time IS NOT NULL AND departure_time IS NOT NULL AND arrival_time>departure_time))
  ) THEN RAISE EXCEPTION '% source topology or clock checks failed',rec.line_key; END IF;
  IF EXISTS(SELECT 1 FROM public.manual_timetable_templates WHERE line_key=rec.line_key) THEN RAISE EXCEPTION '% already has source rows; reconcile first',rec.line_key; END IF;
  INSERT INTO public.manual_timetable_templates(line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,destination_urns,vehicle_type_label,source_path,source_occurrence,source_trip_id,source_revision_date)
  SELECT rec.line_key,'odpt.Calendar:'||t.service_id,t.source_number,'odpt.Railway:'||rec.route_id,
  CASE t.direction_id WHEN '0' THEN 'odpt.RailDirection:Outbound' ELSE 'odpt.RailDirection:Inbound' END,
  'odpt.TrainType:Keio.'||t.train_type,ARRAY['odpt.Station:'||t.destination_suffix],NULL,v_source,
  (row_number() over(partition by t.service_id,t.source_number order by t.trip_id)-1)::integer,t.trip_id,NULL
  FROM keio_p0_candidates t WHERE t.line_key=rec.line_key;
  INSERT INTO public.manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
  SELECT m.id,s.stop_sequence,CASE WHEN s.arrival_time IS NOT NULL THEN 'odpt.Station:'||s.stop_id END,CASE WHEN s.departure_time IS NOT NULL THEN 'odpt.Station:'||s.stop_id END,left(s.arrival_time,5),left(s.departure_time,5)
  FROM public.manual_timetable_templates m JOIN gtfs_stage.stop_times s ON s.feed_sha=v_sha AND s.trip_id=m.source_trip_id WHERE m.line_key=rec.line_key AND m.source_path=v_source;
  INSERT INTO public.train_timetables(canonical_key,calendar_urn,primary_train_number,lead_source_template_id,group_evidence,timetable_validity)
  SELECT 'gtfs-source:'||m.id,m.calendar_urn,m.train_number,m.id,'source_only','undated_not_current_verified' FROM public.manual_timetable_templates m WHERE m.line_key=rec.line_key AND m.source_path=v_source;
  INSERT INTO public.train_timetable_members(source_template_id,timetable_id,segment_order,member_role,first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop)
  SELECT m.id,tt.id,0,'primary',min(s.stop_sequence),max(s.stop_sequence),0,false FROM public.manual_timetable_templates m JOIN public.train_timetables tt ON tt.lead_source_template_id=m.id JOIN public.manual_timetable_template_stops s ON s.template_id=m.id WHERE m.line_key=rec.line_key AND m.source_path=v_source GROUP BY m.id,tt.id;
  IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key=rec.line_key AND source_path=v_source)<>rec.trips
  OR (SELECT count(*) FROM public.manual_timetable_template_stops s JOIN public.manual_timetable_templates m ON m.id=s.template_id WHERE m.line_key=rec.line_key AND m.source_path=v_source)<>rec.stops
  OR (SELECT count(*) FROM public.train_timetable_members tm JOIN public.manual_timetable_templates m ON m.id=tm.source_template_id WHERE m.line_key=rec.line_key AND m.source_path=v_source)<>rec.trips
  THEN RAISE EXCEPTION '% canonical import verification failed',rec.line_key; END IF;
 END LOOP;
 -- Keep existing live API and fallback flags until endpoint/UI verification.
END
$keio$;

