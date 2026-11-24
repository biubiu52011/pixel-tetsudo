-- Operating eligibility only, not exact stop clocks. JR East individual calendar index excerpts show numbered dates (including alternate-clock dates); combine 2611 with late-Nov dates retained in 2612, not December timings.
-- 16: https://timetables.jreast.co.jp/2611/train/030/033674.html ; https://timetables.jreast.co.jp/2612/train/030/033694.html
-- 20: https://timetables.jreast.co.jp/2611/train/110/111195.html ; https://timetables.jreast.co.jp/2611/train/110/111193.html
-- 23: https://timetables.jreast.co.jp/2611/train/010/010075.html ; https://timetables.jreast.co.jp/2612/train/010/010075.html
-- 25: https://timetables.jreast.co.jp/2611/train/010/010088.html ; https://timetables.jreast.co.jp/2612/train/010/010084.html
-- 28: https://timetables.jreast.co.jp/2611/train/010/010092.html ; https://timetables.jreast.co.jp/2612/train/010/010092.html
-- Full HTML unavailable; retain undated_not_current_verified and existing clocks.
BEGIN;
DO $fix$
DECLARE r record; n integer;
DECLARE dates constant date[]:=ARRAY(SELECT d::date FROM generate_series('2026-11-01'::date,'2026-11-30'::date,'1 day') d ORDER BY d);
BEGIN
 FOR r IN SELECT * FROM (VALUES
 (758,'こまち23','3023M',70437,'odpt.RailDirection:Outbound'),
 (759,'こまち25','3025M',70548,'odpt.RailDirection:Outbound'),
 (779,'こまち16','3016M',72770,'odpt.RailDirection:Inbound'),
 (781,'こまち20','3020M',72993,'odpt.RailDirection:Inbound'),
 (784,'こまち28','3028M',73326,'odpt.RailDirection:Inbound')
 ) x(id,service,formal,tid,dir) LOOP
 UPDATE manual_timetable_templates t SET operating_dates=dates
 WHERE t.id=r.id AND t.line_key='AkitaShinkansen' AND t.train_number=r.service
 AND t.operating_dates IS NULL AND t.calendar_urn='odpt.Calendar:Weekday' AND t.direction_urn=r.dir
 AND EXISTS (SELECT 1 FROM published_train_number_evidence e WHERE e.source_template_id=t.id AND e.edition='2611' AND e.line_key=t.line_key AND e.calendar_urn=t.calendar_urn AND e.direction_urn=t.direction_urn AND e.train_number=r.formal)
 AND EXISTS (SELECT 1 FROM train_timetable_members m JOIN train_timetables c ON c.id=m.timetable_id JOIN train_timetable_vehicle_mappings v ON v.source_template_id=t.id AND v.timetable_id=c.id WHERE m.source_template_id=t.id AND m.timetable_id=r.tid AND m.member_role='primary' AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified' AND v.vehicle_type='E6系' AND NOT v.actual_vehicle_confirmed)
 AND NOT EXISTS (SELECT 1 FROM manual_timetable_templates x WHERE x.line_key=t.line_key AND x.train_number=t.train_number AND x.id<>t.id);
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'Unexpected date scope for %',r.service; END IF;
 END LOOP;
 UPDATE published_timetable_coverage_audit SET checked_at=now() WHERE line_key='AkitaShinkansen' AND coverage_status='sparse_review';
END $fix$;
COMMIT;