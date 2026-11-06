-- JR-East 2026-11 Suigun Hitachi-Ota branch: 15 official Mito through trains
-- x Weekday/ SaturdayHoliday = 30 source pairs. Source-specific and re-runnable.
-- An identical number alone is NOT sufficient: station, direction, calendar,
-- source roles, boundary departure and official arrival must all agree.
-- The scoped source positions stay historical plans, never real-time positions.
BEGIN;
SELECT pg_advisory_xact_lock(2611262430);
CREATE TEMP TABLE _suigun_branch_2611_through_proof (
 train_number text PRIMARY KEY,
 direction text NOT NULL CHECK (direction IN ('Inbound','Outbound')),
 arrival_clock text NOT NULL,
 departure_clock text NOT NULL,
 official_url text NOT NULL
) ON COMMIT DROP;
INSERT INTO _suigun_branch_2611_through_proof VALUES
('920D','Inbound','06:28','06:29','https://timetables.jreast.co.jp/2611/train/025/025131.html'),
('921D','Outbound','06:26','06:30','https://timetables.jreast.co.jp/2611/train/025/025021.html'),
('922D','Inbound','07:15','07:16','https://timetables.jreast.co.jp/2611/train/025/025141.html'),
('923D','Outbound','07:27','07:31','https://timetables.jreast.co.jp/2611/train/025/025031.html'),
('924D','Inbound','08:07','08:08','https://timetables.jreast.co.jp/2611/train/025/025151.html'),
('925D','Outbound','08:36','08:37','https://timetables.jreast.co.jp/2611/train/025/025041.html'),
('926D','Inbound','09:30','09:31','https://timetables.jreast.co.jp/2611/train/025/025161.html'),
('927D','Outbound','09:26','09:45','https://timetables.jreast.co.jp/2611/train/025/025051.html'),
('934D','Inbound','15:32','15:38','https://timetables.jreast.co.jp/2611/train/050/052241.html'),
('935D','Outbound','15:47','15:48','https://timetables.jreast.co.jp/2611/train/050/052201.html'),
('936D','Inbound','16:25','16:26','https://timetables.jreast.co.jp/2611/train/025/025201.html'),
('937D','Outbound','17:07','17:08','https://timetables.jreast.co.jp/2611/train/025/025091.html'),
('941D','Outbound','18:41','18:48','https://timetables.jreast.co.jp/2611/train/050/052221.html'),
('942D','Inbound','19:25','19:30','https://timetables.jreast.co.jp/2611/train/025/025211.html'),
('943D','Outbound','19:40','19:41','https://timetables.jreast.co.jp/2611/train/025/025101.html');
CREATE TEMP TABLE _suigun_branch_2611_pairs ON COMMIT DROP AS
SELECT proof.*, a.calendar_urn, 
 CASE WHEN proof.direction='Outbound' THEN a.id ELSE b.id END from_template_id,
 CASE WHEN proof.direction='Outbound' THEN b.id ELSE a.id END to_template_id,
 CASE WHEN proof.direction='Outbound' THEN ma.timetable_id ELSE mb.timetable_id END root_id,
 CASE WHEN proof.direction='Outbound' THEN mb.timetable_id ELSE ma.timetable_id END child_id,
 CASE WHEN proof.direction='Outbound' THEN 7 ELSE 6 END root_count,
 CASE WHEN proof.direction='Outbound' THEN 6 ELSE 7 END child_count
FROM _suigun_branch_2611_through_proof proof
JOIN public.manual_timetable_templates a ON
 a.line_key='Suigun' AND a.train_number=proof.train_number
 AND a.direction_urn='odpt.RailDirection:'||proof.direction
 AND a.calendar_urn IN('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
JOIN public.manual_timetable_templates b ON
 b.line_key='SuigunBranch' AND b.train_number=a.train_number
 AND b.direction_urn=a.direction_urn AND b.calendar_urn=a.calendar_urn
JOIN public.train_timetable_members ma ON ma.source_template_id=a.id
JOIN public.train_timetable_members mb ON mb.source_template_id=b.id;
DO $pre$
DECLARE expected integer;
BEGIN
 SELECT count(*) INTO expected FROM _suigun_branch_2611_pairs;
 IF expected<>30 OR
    (SELECT count(DISTINCT (calendar_urn,train_number)) FROM _suigun_branch_2611_pairs)<>30
 THEN RAISE EXCEPTION 'Suigun branch expected 15 through numbers x 2 calendars'; END IF;
 IF EXISTS(
  SELECT 1 FROM _suigun_branch_2611_pairs p
  JOIN public.train_timetable_members rootm ON rootm.source_template_id=p.from_template_id
  JOIN public.train_timetable_members childm ON childm.source_template_id=p.to_template_id
  JOIN public.train_timetables root_t ON root_t.id=rootm.timetable_id
  JOIN public.train_timetables child_t ON child_t.id=childm.timetable_id
  JOIN public.manual_timetable_template_stops root_end ON root_end.template_id=p.from_template_id AND root_end.stop_sequence=p.root_count-1
  JOIN public.manual_timetable_template_stops child_start ON child_start.template_id=p.to_template_id AND child_start.stop_sequence=0
  WHERE
   COALESCE(root_end.departure_station_urn,root_end.arrival_station_urn)<>'odpt.Station:JR-East.Kami-Sugaya'
   OR COALESCE(child_start.departure_station_urn,child_start.arrival_station_urn)<>'odpt.Station:JR-East.Kami-Sugaya'
   OR root_end.departure_clock IS DISTINCT FROM p.departure_clock
   OR child_start.departure_clock IS DISTINCT FROM p.departure_clock
   OR (root_end.arrival_clock IS NOT NULL AND root_end.arrival_clock<>p.arrival_clock)
   OR (SELECT count(*) FROM public.manual_timetable_template_stops s WHERE s.template_id=p.from_template_id)<>p.root_count
   OR (SELECT count(*) FROM public.manual_timetable_template_stops s WHERE s.template_id=p.to_template_id)<>p.child_count
   OR root_t.primary_train_number<>p.train_number
   OR child_t.primary_train_number<>p.train_number
   OR root_t.calendar_urn<>p.calendar_urn OR child_t.calendar_urn<>p.calendar_urn
   OR (rootm.timetable_id<>childm.timetable_id AND (
     root_t.group_evidence<>'source_only' OR child_t.group_evidence<>'source_only'
     OR (SELECT count(*) FROM public.train_timetable_members m WHERE m.timetable_id=root_t.id)<>1
     OR (SELECT count(*) FROM public.train_timetable_members m WHERE m.timetable_id=child_t.id)<>1
     OR EXISTS(SELECT 1 FROM public.train_timetable_continuity c WHERE c.from_template_id IN(p.from_template_id,p.to_template_id) OR c.to_template_id IN(p.from_template_id,p.to_template_id))
     OR EXISTS(SELECT 1 FROM public.train_timetable_vehicle_mappings v WHERE v.timetable_id IN(root_t.id,child_t.id))
     OR EXISTS(SELECT 1 FROM public.train_timetable_operation_evidence v WHERE v.timetable_id IN(root_t.id,child_t.id))
     OR EXISTS(SELECT 1 FROM public.train_runs r WHERE r.canonical_timetable_id IN(root_t.id,child_t.id))
   ))
 ) THEN RAISE EXCEPTION 'Suigun branch source boundary/continuity precondition failed'; END IF;
 IF (SELECT count(*) FROM _suigun_branch_2611_pairs p WHERE p.root_id<>p.child_id) NOT IN (0,30)
 THEN RAISE EXCEPTION 'Partially merged Suigun branch, review before retry'; END IF;
END
$pre$;
-- Preserve published Kami-Sugaya departure times and add the independently
-- verified arrivals to the existing final source station, never a new stop.
UPDATE public.manual_timetable_template_stops s SET
 arrival_station_urn='odpt.Station:JR-East.Kami-Sugaya',
 arrival_clock=p.arrival_clock
FROM _suigun_branch_2611_pairs p
WHERE p.root_id<>p.child_id
 AND s.template_id=p.from_template_id AND s.stop_sequence=p.root_count-1
 AND s.arrival_clock IS NULL AND s.departure_clock=p.departure_clock;
CREATE TEMP TABLE _suigun_branch_2611_pending ON COMMIT DROP AS
SELECT * FROM _suigun_branch_2611_pairs WHERE root_id<>child_id;
INSERT INTO public.train_timetable_continuity(
 from_template_id,to_template_id,junction_station_urn,
 arrival_clock,departure_clock,connection_minutes,evidence)
SELECT from_template_id,to_template_id,'odpt.Station:JR-East.Kami-Sugaya',
 arrival_clock,departure_clock,0,'official_2611_same_number_boundary_clock'
FROM _suigun_branch_2611_pending;
UPDATE public.train_timetable_members m SET
 timetable_id=p.root_id,segment_order=1,member_role='verified_continuation',
 stop_offset=p.root_count,merge_first_stop=true
FROM _suigun_branch_2611_pending p
WHERE m.source_template_id=p.to_template_id AND m.timetable_id=p.child_id;
UPDATE public.train_timetables t SET group_evidence='verified_continuation'
FROM _suigun_branch_2611_pending p WHERE t.id=p.root_id;
DELETE FROM public.train_timetables t USING _suigun_branch_2611_pending p
WHERE t.id=p.child_id
 AND NOT EXISTS(SELECT 1 FROM public.train_timetable_members m WHERE m.timetable_id=t.id);
DO $post$
BEGIN
 IF (SELECT count(*) FROM _suigun_branch_2611_pairs p
   JOIN public.train_timetable_members rootm ON rootm.source_template_id=p.from_template_id
   JOIN public.train_timetable_members childm ON childm.source_template_id=p.to_template_id
   JOIN public.train_timetables root_t ON root_t.id=rootm.timetable_id
   JOIN public.train_timetable_continuity c ON c.from_template_id=p.from_template_id AND c.to_template_id=p.to_template_id
   WHERE rootm.timetable_id=childm.timetable_id
     AND root_t.group_evidence='verified_continuation'
     AND childm.segment_order=1 AND childm.member_role='verified_continuation'
     AND childm.stop_offset=p.root_count AND childm.merge_first_stop
     AND c.arrival_clock=p.arrival_clock AND c.departure_clock=p.departure_clock
     AND (SELECT count(*) FROM public.train_timetable_stops s WHERE s.timetable_id=root_t.id)=12
     AND (SELECT count(DISTINCT s.stop_sequence) FROM public.train_timetable_stops s WHERE s.timetable_id=root_t.id)=12
     AND (SELECT count(*) FROM public.train_timetable_members m WHERE m.timetable_id=root_t.id)=2
 )<>30 THEN RAISE EXCEPTION 'Suigun branch 30 through trains failed 12-stop canonical verification'; END IF;
END
$post$;
COMMIT;
