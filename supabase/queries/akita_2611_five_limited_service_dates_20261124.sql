-- Operating dates only, not verified stop clocks or daily stock.
-- JR East 2611: https://timetables.jreast.co.jp/2611/timetable-v/258d2p.html (17/21)
-- https://timetables.jreast.co.jp/2611/train/125/129752.html (21)
-- https://timetables.jreast.co.jp/2611/train/060/064691.html (51)
-- https://timetables.jreast.co.jp/2611/train/060/064701.html (61)
-- https://timetables.jreast.co.jp/2611/train/110/111403.html (62)
-- 62 has dated clock variants; these are not resolved by this scope-only change.
BEGIN;
DO $fix$
DECLARE r record; n integer;
BEGIN
 FOR r IN SELECT * FROM (VALUES
 (755,'こまち17','9017M',70104,'odpt.RailDirection:Outbound',ARRAY['2026-11-21','2026-11-27','2026-11-28']::date[]),
 (757,'こまち21','5021M',70326,'odpt.RailDirection:Outbound',ARRAY['2026-11-21','2026-11-27','2026-11-28']::date[]),
 (769,'こまち51','5051M',71659,'odpt.RailDirection:Outbound',ARRAY['2026-11-07','2026-11-14','2026-11-21','2026-11-26','2026-11-27','2026-11-28','2026-11-29','2026-11-30']::date[]),
 (771,'こまち61','5061M',71882,'odpt.RailDirection:Outbound',ARRAY['2026-11-20']::date[]),
 (791,'こまち62','8062M',74104,'odpt.RailDirection:Inbound',ARRAY['2026-11-01','2026-11-03','2026-11-20','2026-11-22','2026-11-23','2026-11-27','2026-11-29']::date[])
 ) x(id,service,formal,tid,dir,dates) LOOP
 UPDATE manual_timetable_templates t SET operating_dates=r.dates
 WHERE t.id=r.id AND t.line_key='AkitaShinkansen' AND t.train_number=r.service
 AND t.operating_dates IS NULL AND t.calendar_urn='odpt.Calendar:Weekday' AND t.direction_urn=r.dir
 AND EXISTS (SELECT 1 FROM published_train_number_evidence e WHERE e.source_template_id=t.id AND e.edition='2611' AND e.line_key=t.line_key AND e.calendar_urn=t.calendar_urn AND e.direction_urn=t.direction_urn AND e.train_number=r.formal)
 AND EXISTS (SELECT 1 FROM train_timetable_members m JOIN train_timetables c ON c.id=m.timetable_id JOIN train_timetable_vehicle_mappings v ON v.timetable_id=c.id WHERE m.source_template_id=t.id AND m.timetable_id=r.tid AND m.member_role='primary' AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified' AND v.vehicle_type='E6系' AND NOT v.actual_vehicle_confirmed)
 AND NOT EXISTS (SELECT 1 FROM manual_timetable_templates x WHERE x.line_key=t.line_key AND x.train_number=t.train_number AND x.id<>t.id);
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'Unexpected date scope for %',r.service; END IF;
 END LOOP;
 UPDATE published_timetable_coverage_audit SET checked_at=now() WHERE line_key='AkitaShinkansen' AND coverage_status='sparse_review';
END $fix$;
COMMIT;