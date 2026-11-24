-- Date eligibility only. November 2026 holiday table has daily base rows and dated time variants for 7/9/15/19.
-- https://timetables.jreast.co.jp/2611/timetable-v/258d2p.html
-- Search-index excerpts corroborate the daily scope; full HTML could not be retrieved.
-- Keep existing canonical itinerary validity and all stop clocks unchanged.
BEGIN;
DO $fix$
DECLARE r record; n integer;
DECLARE dates constant date[]:=ARRAY(SELECT d::date FROM generate_series('2026-11-01'::date,'2026-11-30'::date,'1 day') d ORDER BY d);
BEGIN
 FOR r IN SELECT * FROM (VALUES
 (751,'こまち7','3007M',69701),
 (752,'こまち9','3009M',69772),
 (754,'こまち15','3015M',69993),
 (756,'こまち19','3019M',70215)
 ) x(id,service,formal,tid) LOOP
 UPDATE manual_timetable_templates t SET operating_dates=dates
 WHERE t.id=r.id AND t.line_key='AkitaShinkansen' AND t.train_number=r.service
 AND t.operating_dates IS NULL AND t.calendar_urn='odpt.Calendar:Weekday' AND t.direction_urn='odpt.RailDirection:Outbound'
 AND EXISTS (SELECT 1 FROM published_train_number_evidence e WHERE e.source_template_id=t.id AND e.edition='2611' AND e.line_key=t.line_key AND e.calendar_urn=t.calendar_urn AND e.direction_urn=t.direction_urn AND e.train_number=r.formal)
 AND EXISTS (SELECT 1 FROM train_timetable_members m JOIN train_timetables c ON c.id=m.timetable_id JOIN train_timetable_vehicle_mappings v ON v.source_template_id=t.id AND v.timetable_id=c.id WHERE m.source_template_id=t.id AND m.timetable_id=r.tid AND m.member_role='primary' AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified' AND v.vehicle_type='E6系' AND NOT v.actual_vehicle_confirmed)
 AND NOT EXISTS (SELECT 1 FROM manual_timetable_templates x WHERE x.line_key=t.line_key AND x.train_number=t.train_number AND x.id<>t.id);
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'Unexpected date scope for %',r.service; END IF;
 END LOOP;
 UPDATE published_timetable_coverage_audit SET checked_at=now() WHERE line_key='AkitaShinkansen' AND coverage_status='sparse_review';
END $fix$;
COMMIT;