-- Date-specific partial Keio racecourse service, 2026-11-30 only.
-- Official departure times: https://www.keio.co.jp/news/update/announce/announce2026/pdf/20261120_rinji.pdf
-- Community train-number and arrival-clock reference (2026-11-27 update):
-- https://w.atwiki.jp/keio_unyo/pages/117.html
-- The official window has 52 departures each way. Two source entries use
-- 6832 in opposite directions; keep both out until their numbers are resolved.
-- Neither source authorizes actual stock, nor a complete full-day plan.
DO $keio$
DECLARE
 v_path constant text := 'https://w.atwiki.jp/keio_unyo/pages/117.html#2026-11-30';
 v_day constant date := DATE '2026-11-30';
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('keio-keibajo-20261130-p0'));
 IF (SELECT array_agg(station_name::text ORDER BY station_index) FROM public.line_stations WHERE line_id='KeioKeibajo') IS DISTINCT FROM ARRAY['Higashi-Fuchu','Fuchu-Keibajo']::text[] THEN RAISE EXCEPTION 'Racecourse station identity/order changed'; END IF;
 IF EXISTS (SELECT 1 FROM public.manual_timetable_templates WHERE line_key='KeioKeibajo' AND operating_dates @> ARRAY[v_day]) THEN RAISE EXCEPTION 'Existing date-specific plan; reconcile first'; END IF;
 CREATE TEMP TABLE keio_race_1130(direction text,train_number text,departure text,arrival text) ON COMMIT DROP;
 INSERT INTO keio_race_1130 VALUES
 ('Outbound','6419','08:02','08:05'),
 ('Outbound','6421','08:15','08:17'),
 ('Outbound','6423','08:30','08:32'),
 ('Outbound','6425','08:41','08:43'),
 ('Outbound','6801','08:55','08:57'),
 ('Outbound','6427','09:05','09:07'),
 ('Outbound','6803','09:15','09:17'),
 ('Outbound','6429','09:25','09:27'),
 ('Outbound','6431','09:35','09:37'),
 ('Outbound','6805','09:45','09:47'),
 ('Outbound','6433','09:56','09:58'),
 ('Outbound','6435','10:06','10:08'),
 ('Outbound','6807','10:16','10:18'),
 ('Outbound','6437','10:26','10:27'),
 ('Outbound','6809','10:36','10:38'),
 ('Outbound','6439','10:46','10:48'),
 ('Outbound','6811','10:56','10:58'),
 ('Outbound','6441','11:06','11:08'),
 ('Outbound','6813','11:16','11:18'),
 ('Outbound','6443','11:26','11:28'),
 ('Outbound','6815','11:36','11:38'),
 ('Outbound','6445','11:46','11:48'),
 ('Outbound','6817','11:56','11:58'),
 ('Outbound','6447','12:06','12:08'),
 ('Outbound','6819','12:16','12:18'),
 ('Outbound','6449','12:26','12:28'),
 ('Outbound','6821','12:36','12:38'),
 ('Outbound','6451','12:46','12:48'),
 ('Outbound','6823','12:56','12:58'),
 ('Outbound','6453','13:06','13:08'),
 ('Outbound','6825','13:16','13:18'),
 ('Outbound','6455','13:26','13:28'),
 ('Outbound','6827','13:36','13:38'),
 ('Outbound','6457','13:46','13:48'),
 ('Outbound','6829','13:56','13:58'),
 ('Outbound','6459','14:06','14:08'),
 ('Outbound','6461','14:25','14:27'),
 ('Outbound','6463','14:45','14:47'),
 ('Outbound','6465','15:05','15:07'),
 ('Outbound','6467','15:25','15:27'),
 ('Outbound','6469','15:45','15:47'),
 ('Outbound','6471','16:06','16:08'),
 ('Outbound','6833','16:16','16:18'),
 ('Outbound','6473','16:26','16:28'),
 ('Outbound','6835','16:36','16:38'),
 ('Outbound','6475','16:46','16:48'),
 ('Outbound','6837','16:56','16:58'),
 ('Outbound','6477','17:06','17:08'),
 ('Outbound','6839','17:16','17:18'),
 ('Outbound','6479','17:30','17:32'),
 ('Outbound','6481','17:46','17:49'),
 ('Inbound','6418','08:08','08:10'),
 ('Inbound','6420','08:21','08:24'),
 ('Inbound','6422','08:35','08:38'),
 ('Inbound','6424','08:47','08:49'),
 ('Inbound','6800','09:00','09:02'),
 ('Inbound','6426','09:10','09:12'),
 ('Inbound','6802','09:20','09:22'),
 ('Inbound','6428','09:30','09:32'),
 ('Inbound','6430','09:40','09:42'),
 ('Inbound','6804','09:50','09:52'),
 ('Inbound','6432','10:01','10:03'),
 ('Inbound','6806','10:11','10:13'),
 ('Inbound','6434','10:21','10:23'),
 ('Inbound','6808','10:31','10:33'),
 ('Inbound','6436','10:41','10:43'),
 ('Inbound','6810','10:51','10:53'),
 ('Inbound','6438','11:01','11:03'),
 ('Inbound','6812','11:11','11:13'),
 ('Inbound','6440','11:21','11:23'),
 ('Inbound','6814','11:31','11:33'),
 ('Inbound','6442','11:41','11:43'),
 ('Inbound','6816','11:51','11:53'),
 ('Inbound','6444','12:01','12:03'),
 ('Inbound','6818','12:11','12:13'),
 ('Inbound','6446','12:21','12:23'),
 ('Inbound','6820','12:31','12:33'),
 ('Inbound','6448','12:41','12:43'),
 ('Inbound','6822','12:51','12:53'),
 ('Inbound','6450','13:01','13:03'),
 ('Inbound','6824','13:11','13:13'),
 ('Inbound','6452','13:21','13:23'),
 ('Inbound','6826','13:31','13:33'),
 ('Inbound','6454','13:41','13:43'),
 ('Inbound','6828','13:51','13:53'),
 ('Inbound','6456','14:01','14:03'),
 ('Inbound','6458','14:15','14:17'),
 ('Inbound','6460','14:35','14:37'),
 ('Inbound','6462','14:55','14:57'),
 ('Inbound','6464','15:15','15:17'),
 ('Inbound','6466','15:35','15:37'),
 ('Inbound','6830','15:51','15:53'),
 ('Inbound','6468','16:01','16:03'),
 ('Inbound','6470','16:21','16:23'),
 ('Inbound','6834','16:31','16:33'),
 ('Inbound','6472','16:41','16:43'),
 ('Inbound','6836','16:51','16:53'),
 ('Inbound','6474','17:01','17:03'),
 ('Inbound','6838','17:11','17:13'),
 ('Inbound','6476','17:24','17:26'),
 ('Inbound','6478','17:37','17:39'),
 ('Inbound','6480','17:56','17:59');
 IF (SELECT count(*) FROM keio_race_1130)<>102 OR (SELECT count(DISTINCT train_number) FROM keio_race_1130)<>102 OR (SELECT count(*) FROM keio_race_1130 WHERE direction='Outbound')<>51 OR (SELECT count(*) FROM keio_race_1130 WHERE direction='Inbound')<>51 OR EXISTS (SELECT 1 FROM keio_race_1130 WHERE train_number='6832' OR arrival<=departure) THEN RAISE EXCEPTION 'Source roster integrity'; END IF;
 INSERT INTO public.manual_timetable_templates(line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,destination_urns,vehicle_type_label,source_path,source_occurrence,source_trip_id,source_revision_date,operating_dates)
 SELECT 'KeioKeibajo','odpt.Calendar:Weekday',c.train_number,'odpt.Railway:Keio.Keibajo','odpt.RailDirection:'||c.direction,'odpt.TrainType:Keio.Local',ARRAY[CASE c.direction WHEN 'Outbound' THEN 'odpt.Station:Keio.Keibajo.FuchukeibaSeimommae' ELSE 'odpt.Station:Keio.Keibajo.HigashiFuchu' END],NULL,v_path,
 (SELECT coalesce(max(m.source_occurrence),-1)+1 FROM public.manual_timetable_templates m WHERE m.line_key='KeioKeibajo' AND m.calendar_urn='odpt.Calendar:Weekday' AND m.train_number=c.train_number AND m.railway_urn='odpt.Railway:Keio.Keibajo' AND m.revision_id IS NULL),
 'Keio.Keibajo.20261130.'||c.train_number,DATE '2026-11-27',ARRAY[v_day] FROM keio_race_1130 c;
 INSERT INTO public.manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
 SELECT m.id,0,NULL,CASE c.direction WHEN 'Outbound' THEN 'Higashi-Fuchu' ELSE 'Fuchu-Keibajo' END,NULL,c.departure FROM keio_race_1130 c JOIN public.manual_timetable_templates m ON m.line_key='KeioKeibajo' AND m.source_path=v_path AND m.train_number=c.train_number
 UNION ALL
 SELECT m.id,1,CASE c.direction WHEN 'Outbound' THEN 'Fuchu-Keibajo' ELSE 'Higashi-Fuchu' END,NULL,c.arrival,NULL FROM keio_race_1130 c JOIN public.manual_timetable_templates m ON m.line_key='KeioKeibajo' AND m.source_path=v_path AND m.train_number=c.train_number;
 INSERT INTO public.train_timetables(canonical_key,calendar_urn,primary_train_number,lead_source_template_id,group_evidence,timetable_validity)
 SELECT 'keio-race-20261130:'||m.id,m.calendar_urn,m.train_number,m.id,'source_only','undated_not_current_verified' FROM public.manual_timetable_templates m WHERE m.line_key='KeioKeibajo' AND m.source_path=v_path;
 INSERT INTO public.train_timetable_members(source_template_id,timetable_id,segment_order,member_role,first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop)
 SELECT m.id,t.id,0,'primary',0,1,0,false FROM public.manual_timetable_templates m JOIN public.train_timetables t ON t.lead_source_template_id=m.id WHERE m.line_key='KeioKeibajo' AND m.source_path=v_path;
 IF (SELECT count(*) FROM public.manual_timetable_templates m JOIN public.train_timetable_members tm ON tm.source_template_id=m.id WHERE m.line_key='KeioKeibajo' AND m.source_path=v_path AND m.operating_dates=ARRAY[v_day])<>102 OR (SELECT count(*) FROM public.manual_timetable_template_stops s JOIN public.manual_timetable_templates m ON m.id=s.template_id WHERE m.line_key='KeioKeibajo' AND m.source_path=v_path)<>204 THEN RAISE EXCEPTION 'Date-specific import incomplete'; END IF;
 -- Preserve the original audit status and historical sources. Do not turn
 -- the line-wide fallback flag on with only one partial special-day scope.
 UPDATE public.published_timetable_coverage_audit SET template_count=(SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='KeioKeibajo'),issues=issues||ARRAY['20261130_OFFICIAL_08_17_DEPARTURES_104_COMMUNITY_PAIRED_102_NUMBER_COLLISION_6832_TWO_EXCLUDED','20261130_DATE_ONLY_PARTIAL_NOT_NORMAL_DAY_OR_FULL_DAY_VERIFIED'],checked_at=now() WHERE line_key='KeioKeibajo' AND coverage_status='revision_review';
 IF NOT FOUND THEN RAISE EXCEPTION 'Coverage audit needs review'; END IF;
END $keio$;

