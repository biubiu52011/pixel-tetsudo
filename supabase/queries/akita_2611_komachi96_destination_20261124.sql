-- Verified destination only: https://timetables.jreast.co.jp/2611/train/030/030472.html
-- Existing stop clocks and undated validity are unchanged.
BEGIN;
DO $fix$
DECLARE n integer;
BEGIN
 UPDATE manual_timetable_templates t SET destination_urns=ARRAY['odpt.Station:JR-East.AkitaShinkansen.Sendai']
 WHERE t.id=792 AND t.line_key='AkitaShinkansen' AND t.train_number='こまち96'
 AND t.calendar_urn='odpt.Calendar:Weekday' AND t.direction_urn='odpt.RailDirection:Inbound'
 AND t.destination_urns=ARRAY['odpt.Station:JR-East.AkitaShinkansen.Tokyo']
 AND t.operating_dates IS NULL
 AND EXISTS (SELECT 1 FROM train_timetable_members m JOIN train_timetables c ON c.id=m.timetable_id WHERE m.source_template_id=t.id AND m.timetable_id=74215 AND m.member_role='primary' AND c.group_evidence='source_only')
 AND EXISTS(SELECT 1 FROM published_train_number_evidence e WHERE e.source_template_id=t.id AND e.edition='2611' AND e.train_number='3096M')
 AND EXISTS(SELECT 1 FROM manual_timetable_template_stops s WHERE s.template_id=t.id AND s.stop_sequence=(SELECT max(x.stop_sequence) FROM manual_timetable_template_stops x WHERE x.template_id=t.id) AND s.arrival_station_urn='odpt.Station:JR-East.AkitaShinkansen.Sendai');
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'Expected one Akita 96 destination correction, got %',n; END IF;
END $fix$;
COMMIT;