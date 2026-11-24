-- Date eligibility only; official search-index excerpts, not full stop clock verification.
-- 13: https://timetables.jreast.co.jp/2611/train/110/111601.html
-- 29/45: https://timetables.jreast.co.jp/2611/timetable-v/258d2p.html
-- 45 corroboration: https://timetables.jreast.co.jp/2612/train/130/130611.html
-- 63: https://timetables.jreast.co.jp/2611/train/045/047221.html
-- 65: https://timetables.jreast.co.jp/2611/timetable-v/258d1p.html (base dates plus time variants)
BEGIN;
DO $fix$
DECLARE r record; n integer;
BEGIN
 FOR r IN SELECT * FROM (VALUES
 (753,'こまち13','5013M',69883,ARRAY['2026-11-20','2026-11-21','2026-11-26','2026-11-27','2026-11-28','2026-11-30']::date[]),
 (761,'こまち29','5029M',70771,ARRAY['2026-11-20','2026-11-23']::date[]),
 (768,'こまち45','5045M',71548,ARRAY['2026-11-20']::date[]),
 (772,'こまち63','5063M',71993,ARRAY['2026-11-06','2026-11-08','2026-11-13','2026-11-15','2026-11-20']::date[]),
 (773,'こまち65','8065M',72104,ARRAY['2026-11-01','2026-11-03','2026-11-08','2026-11-13','2026-11-15','2026-11-20','2026-11-22','2026-11-23','2026-11-29']::date[])
 ) x(id,service,formal,tid,dates) LOOP
 UPDATE manual_timetable_templates t SET operating_dates=r.dates
 WHERE t.id=r.id AND t.line_key='AkitaShinkansen' AND t.train_number=r.service
 AND t.operating_dates IS NULL AND t.calendar_urn='odpt.Calendar:Weekday' AND t.direction_urn='odpt.RailDirection:Outbound'
 AND EXISTS (SELECT 1 FROM published_train_number_evidence e WHERE e.source_template_id=t.id AND e.edition='2611' AND e.line_key=t.line_key AND e.calendar_urn=t.calendar_urn AND e.direction_urn=t.direction_urn AND e.train_number=r.formal)
 AND EXISTS (SELECT 1 FROM train_timetable_members m JOIN train_timetables c ON c.id=m.timetable_id JOIN train_timetable_vehicle_mappings v ON v.timetable_id=c.id WHERE m.source_template_id=t.id AND m.timetable_id=r.tid AND m.member_role='primary' AND c.group_evidence='source_only' AND c.timetable_validity='undated_not_current_verified' AND v.vehicle_type='E6系' AND NOT v.actual_vehicle_confirmed)
 AND NOT EXISTS (SELECT 1 FROM manual_timetable_templates x WHERE x.line_key=t.line_key AND x.train_number=t.train_number AND x.id<>t.id);
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'Unexpected date scope for %',r.service; END IF;
 END LOOP;
 UPDATE published_timetable_coverage_audit SET checked_at=now() WHERE line_key='AkitaShinkansen' AND coverage_status='sparse_review';
END $fix$;
COMMIT;