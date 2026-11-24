-- Date eligibility only, not verification of stop clocks.
-- JR East November 2026 baseline daily services and date-specific time variants:
-- https://timetables.jreast.co.jp/2611/timetable-v/258d1p.html (27/31/37/39/41)
-- https://timetables.jreast.co.jp/2611/timetable-v/003d2p.html (35)
-- https://timetables.jreast.co.jp/2611/timetable-v/258d2.html (holiday number roster)
-- https://timetables.jreast.co.jp/2611/timetable-v/258u1p.html (36/38/42)
-- https://timetables.jreast.co.jp/2611/timetable-v/258u2p.html (44/96)
-- Time variants remain unverified; do not upgrade canonical validity.
BEGIN;
DO $fix$
DECLARE r record; n integer;
DECLARE dates constant date[]:=ARRAY(SELECT d::date FROM generate_series('2026-11-01'::date,'2026-11-30'::date,'1 day') d ORDER BY d);
BEGIN
 FOR r IN SELECT * FROM (VALUES
 (760,'こまち27','3027M',70660,'odpt.RailDirection:Outbound'),
 (762,'こまち31','3031M',70882,'odpt.RailDirection:Outbound'),
 (764,'こまち35','3035M',71104,'odpt.RailDirection:Outbound'),
 (765,'こまち37','3037M',71215,'odpt.RailDirection:Outbound'),
 (766,'こまち39','3039M',71326,'odpt.RailDirection:Outbound'),
 (767,'こまち41','3041M',71437,'odpt.RailDirection:Outbound'),
 (787,'こまち36','3036M',73659,'odpt.RailDirection:Inbound'),
 (788,'こまち38','3038M',73770,'odpt.RailDirection:Inbound'),
 (789,'こまち42','3042M',73881,'odpt.RailDirection:Inbound'),
 (790,'こまち44','3044M',73993,'odpt.RailDirection:Inbound'),
 (792,'こまち96','3096M',74215,'odpt.RailDirection:Inbound')
 ) x(id,service,formal,tid,dir) LOOP
 UPDATE manual_timetable_templates t SET operating_dates=dates
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