-- Repair the one remaining HokurikuShinkansen source stop whose
-- station identity points to "Fukui" (Tobu Isesaki 福居 in the static
-- railway catalog) rather than Hokuriku's 福井 / "Fukui-Echizen".
-- Reuse current source stop table + derived VIEW; do not rename
-- the genuine TobuIsesaki.Fukui station or create any alias layer.
BEGIN;
SELECT pg_advisory_xact_lock(2611,501);
DO $correct_hokuriku_kagayaki501_fukui$
DECLARE changed_count int; actual_timetable bigint;
BEGIN
 SELECT mem.timetable_id INTO STRICT actual_timetable
 FROM manual_timetable_templates t
 JOIN train_timetable_members mem ON mem.source_template_id=t.id
  AND mem.member_role='primary' AND mem.first_stop_sequence=0
 JOIN train_timetables v ON v.id=mem.timetable_id
  AND v.canonical_key='source:128899' AND v.group_evidence='source_only'
 WHERE t.id=128899 AND t.line_key='HokurikuShinkansen'
 AND t.train_number='かがやき501'
 AND t.calendar_urn='odpt.Calendar:SaturdayHoliday'
 AND t.railway_urn='odpt.Railway:JR-East.HokurikuShinkansen'
 AND t.destination_urns=ARRAY['odpt.Station:JR-East.HokurikuShinkansen.Tsuruga']::text[];
 IF (SELECT count(*) FROM stations WHERE id='Fukui-Echizen')<>1
    OR (SELECT count(*) FROM stations WHERE id='Fukui')<>1
    OR (SELECT count(*) FROM line_stations
      WHERE line_id='HokurikuShinkansen' AND station_name='Fukui-Echizen')<>1
 THEN RAISE EXCEPTION 'Existing railway station owners do not match expectations'; END IF;
 IF (SELECT count(*) FROM manual_timetable_template_stops s WHERE s.template_id=128899
 AND s.stop_sequence=7
 AND s.arrival_station_urn='odpt.Station:JR-East.HokurikuShinkansen.Fukui'
 AND s.departure_station_urn='odpt.Station:JR-East.HokurikuShinkansen.Fukui'
 AND s.arrival_clock IS NOT NULL AND s.departure_clock IS NOT NULL)<>1
 THEN RAISE EXCEPTION 'Expected Kagayaki501 Fukui stop no longer exists'; END IF;
 UPDATE manual_timetable_template_stops SET
 arrival_station_urn='odpt.Station:JR-East.HokurikuShinkansen.Fukui-Echizen',
 departure_station_urn='odpt.Station:JR-East.HokurikuShinkansen.Fukui-Echizen'
 WHERE template_id=128899 AND stop_sequence=7
 AND arrival_station_urn='odpt.Station:JR-East.HokurikuShinkansen.Fukui'
 AND departure_station_urn='odpt.Station:JR-East.HokurikuShinkansen.Fukui';
 GET DIAGNOSTICS changed_count=ROW_COUNT;
 IF changed_count<>1 THEN RAISE EXCEPTION 'Fukui stop identity update failed'; END IF;
 IF (SELECT count(*) FROM train_timetable_stops z WHERE
  z.source_template_id=128899 AND z.timetable_id=actual_timetable
  AND z.stop_sequence=7 AND z.station_urn='odpt.Station:JR-East.HokurikuShinkansen.Fukui-Echizen')<>1
 OR EXISTS (SELECT 1 FROM manual_timetable_template_stops s
 JOIN manual_timetable_templates t ON t.id=s.template_id
 WHERE t.line_key='HokurikuShinkansen' AND (
 s.arrival_station_urn='odpt.Station:JR-East.HokurikuShinkansen.Fukui' OR
 s.departure_station_urn='odpt.Station:JR-East.HokurikuShinkansen.Fukui'))
 THEN RAISE EXCEPTION 'Source/VIEW Hokuriku Fukui identity not reconciled'; END IF;
END $correct_hokuriku_kagayaki501_fukui$;
COMMIT;