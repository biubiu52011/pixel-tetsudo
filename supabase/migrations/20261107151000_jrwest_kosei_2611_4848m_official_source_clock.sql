-- JR-West Kosei 2026-11: certify the ORIGINAL four-stop 4848M
-- Nagahara -> Omiimazu source for both calendar variants. Official
-- JR West timetable page (2026-11 issue) is DAILY, 143M through
-- 4848M at Omi-Shiotsu. Do not synthesize the unimported earlier
-- Omi-Shiotsu -> Nagahara segment or authorize any physical fleet.
BEGIN;
SELECT pg_advisory_xact_lock(26110728);
ALTER TABLE public.published_jrwest_kosei_2611_verified_source_clocks
 DROP CONSTRAINT kosei_2611_clock_number_scope_check;
ALTER TABLE public.published_jrwest_kosei_2611_verified_source_clocks
 ADD CONSTRAINT kosei_2611_clock_number_scope_check CHECK(
   (direction_urn='odpt.RailDirection:Outbound'
     AND published_train_number~'^(180[2468]|181[02468]|182[02468]|183[0246])M$')
   OR
   (direction_urn='odpt.RailDirection:Inbound'
     AND published_train_number IN('1831M','1839M','4838M','4840M','4842M',
                                   '4844M','4846M','4848M','4850M','4852M'))
 );
WITH e(source_number,calendar_urn) AS(VALUES
  ('4848M','odpt.Calendar:Weekday'),
  ('4848MH','odpt.Calendar:SaturdayHoliday')
), checked AS(
 SELECT m.id,m.train_number,m.calendar_urn,m.direction_urn,
    count(*)::integer stop_count,
    md5(string_agg(concat_ws('|',s.stop_sequence,
     coalesce(s.departure_station_urn,s.arrival_station_urn,''),
     coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),
     E'\n' ORDER BY s.stop_sequence)) source_md5
 FROM public.manual_timetable_templates m
 JOIN public.published_jrwest_kosei_2611_source_fleet f
   ON f.source_template_id=m.id AND f.line_key='Kosei' AND f.edition='2611'
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key='Kosei'
   AND m.railway_urn='odpt.Railway:JR-West.Kosei'
   AND m.source_path='data/timetables/Kosei-manual.js'
   AND m.source_revision_date IS NULL AND m.source_occurrence=0
   AND m.train_type_urn='odpt.TrainType:JR-West.Local'
   AND m.direction_urn='odpt.RailDirection:Inbound'
   AND f.reference_only=true AND f.number_date_verified=false
   AND f.actual_vehicle_confirmed=false AND f.authorizes_png=false
 GROUP BY m.id,m.train_number,m.calendar_urn,m.direction_urn
)
INSERT INTO public.published_jrwest_kosei_2611_verified_source_clocks
 (source_template_id,source_train_number,published_train_number,
  calendar_urn,direction_urn,source_stops_md5,stop_count,official_source_url)
SELECT c.id,e.source_number,'4848M',c.calendar_urn,c.direction_urn,
       c.source_md5,4,
       'https://timetable.jr-odekake.net/train-timetable/96861?date=20261026'
FROM e JOIN checked c
  ON c.train_number=e.source_number AND c.calendar_urn=e.calendar_urn
  AND c.stop_count=4
  AND c.source_md5='6ededc46e407290c7127e092f77dc717'
ON CONFLICT(source_template_id) DO NOTHING;
DO $proof$
BEGIN
 IF (SELECT count(*) FROM public.published_jrwest_kosei_2611_verified_source_clocks)<>54
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_clock_evidence
     WHERE verified_source_match)<>54
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_clock_evidence
     WHERE calendar_urn='odpt.Calendar:Weekday')<>27
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_clock_evidence
     WHERE calendar_urn='odpt.Calendar:SaturdayHoliday')<>27
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_verified_source_clocks
     WHERE published_train_number='4848M')<>2
 THEN RAISE EXCEPTION 'Kosei 2611 4848M original 4-stop source clock mismatch'; END IF;
END $proof$;
COMMIT;
