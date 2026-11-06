-- 2026-11 JR Kyushu official 773A: Hakata 23:01 -> Kumamoto 23:49.
-- March legacy template 129035 mislabeled 23:40 Shin-Tamana departure
-- as Kumamoto and 23:49 Kumamoto terminal as Shin-Yatsushiro.
-- Correct both source URNs and destination metadata; the canonical
-- timetable-stops VIEW reads the same source. No actual carset or PNG guess.
BEGIN;
SELECT pg_advisory_xact_lock(2611,773);
DO $official_773$
DECLARE id_ bigint; tt_ bigint; n int;
BEGIN
 SELECT m.id,mem.timetable_id INTO STRICT id_,tt_
 FROM manual_timetable_templates m
 JOIN train_timetable_members mem ON mem.source_template_id=m.id AND mem.member_role='primary'
 JOIN train_timetables t ON t.id=mem.timetable_id AND t.group_evidence='source_only'
 WHERE m.id=129035 AND m.line_key='KyushuShinkansen'
 AND m.railway_urn='odpt.Railway:JR-Kyushu.KyushuShinkansen'
 AND m.calendar_urn='odpt.Calendar:SaturdayHoliday'
 AND m.direction_urn='odpt.RailDirection:Outbound'
 AND m.train_number='さくら773'
 AND m.destination_urns=ARRAY['odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Yatsushiro']::text[]
 AND mem.first_stop_sequence=0 AND mem.last_stop_sequence=6
 AND t.primary_train_number='さくら773' AND t.canonical_key='source:129035'
 AND (SELECT count(*) FROM train_timetable_members a WHERE a.timetable_id=t.id)=1;
 IF (SELECT count(*) FROM manual_timetable_template_stops s WHERE s.template_id=id_)<>7
 THEN RAISE EXCEPTION '773 original stop count mismatch'; END IF;
 IF NOT EXISTS (SELECT 1 FROM manual_timetable_template_stops s
  WHERE s.template_id=id_ AND s.stop_sequence=0
    AND s.departure_station_urn='odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata'
    AND s.departure_clock='23:01')
 THEN RAISE EXCEPTION '773 starting service mismatch'; END IF;
 IF EXISTS (SELECT 1 FROM published_train_number_evidence e
    WHERE e.source_template_id=id_ AND e.edition='2611')
 THEN RAISE EXCEPTION '773 already has edition evidence'; END IF;
 IF (SELECT count(*) FROM train_timetable_vehicle_mappings vm
    JOIN evidence_sources es ON es.id=vm.source_id
    WHERE vm.timetable_id=tt_ AND vm.source_template_id=id_
    AND vm.vehicle_type='N700系' AND vm.mapping_level='official_service_vehicle_plan'
    AND vm.actual_vehicle_confirmed=false
    AND es.source_type='official' AND es.evidence_grade='B')<>1
 THEN RAISE EXCEPTION '773 existing planned N700 evidence mismatch'; END IF;
 UPDATE manual_timetable_template_stops s
    SET departure_station_urn='odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tamana'
  WHERE s.template_id=id_ AND s.stop_sequence=5
    AND s.departure_station_urn='odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto'
    AND s.departure_clock='23:40' AND s.arrival_clock IS NULL
    AND s.arrival_station_urn IS NULL;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION '773 Shin-Tamana source mismatch'; END IF;
 UPDATE manual_timetable_template_stops s
    SET arrival_station_urn='odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto'
  WHERE s.template_id=id_ AND s.stop_sequence=6
    AND s.arrival_station_urn='odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Yatsushiro'
    AND s.arrival_clock='23:49' AND s.departure_clock IS NULL
    AND s.departure_station_urn IS NULL;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION '773 Kumamoto terminal source mismatch'; END IF;
 UPDATE manual_timetable_templates m
    SET destination_urns=ARRAY['odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto']::text[]
  WHERE m.id=id_
    AND m.destination_urns=ARRAY['odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Yatsushiro']::text[];
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION '773 destination metadata mismatch'; END IF;
 IF (SELECT count(*) FROM train_timetable_stops z WHERE z.source_template_id=id_ AND z.timetable_id=tt_
   AND z.stop_sequence=5
   AND z.departure_station_urn='odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tamana'
   AND z.departure_clock='23:40')<>1
  OR (SELECT count(*) FROM train_timetable_stops z WHERE z.source_template_id=id_ AND z.timetable_id=tt_
   AND z.stop_sequence=6
   AND z.arrival_station_urn='odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto'
   AND z.arrival_clock='23:49')<>1
 THEN RAISE EXCEPTION '773 derived train_timetable_stops view mismatch'; END IF;

 INSERT INTO published_train_number_evidence
  (edition,line_key,calendar_urn,direction_urn,train_number,
   source_template_id,official_source_url,verification_scope)
 VALUES ('2611','KyushuShinkansen','odpt.Calendar:SaturdayHoliday',
   'odpt.RailDirection:Outbound','773A',id_,
   'https://www.jrkyushu-timetable.jp/sp/2611/0034/00341801.html?d=20261103&t=2828300',
   'train_number_only') ON CONFLICT DO NOTHING;
 IF (SELECT count(*) FROM published_train_number_evidence e
   WHERE e.edition='2611' AND e.source_template_id=id_ AND e.train_number='773A'
   AND e.official_source_url='https://www.jrkyushu-timetable.jp/sp/2611/0034/00341801.html?d=20261103&t=2828300')<>1
 THEN RAISE EXCEPTION '773 official number mismatch'; END IF;
END $official_773$;
COMMIT;