-- JR-West 2611 third batch: Kosei inbound local sources only.
-- Extend the existing verified-source owner and DO NOT copy official
-- timetable rows. Public M number is separate from internal holiday MH.
-- 1831M is a verified partial Nagahara-Kyoto segment of a longer
-- Tsuruga-Kyoto train; 4838/4842/4846M are partial north segments.
-- Other rows stop at their originally published segment boundaries.
BEGIN;
SELECT pg_advisory_xact_lock(26110721);
ALTER TABLE public.published_jrwest_kosei_2611_verified_source_clocks
 DROP CONSTRAINT kosei_2611_clock_number_scope_check,
 DROP CONSTRAINT kosei_2611_clock_stop_scope_check,
 DROP CONSTRAINT published_jrwest_kosei_2611_verified_source_direction_urn_check;
ALTER TABLE public.published_jrwest_kosei_2611_verified_source_clocks
 ADD CONSTRAINT kosei_2611_clock_number_scope_check CHECK(
   (direction_urn='odpt.RailDirection:Outbound'
     AND published_train_number~'^(180[2468]|181[02468]|182[02468]|183[0246])M$')
   OR
   (direction_urn='odpt.RailDirection:Inbound'
     AND published_train_number IN('1831M','1839M','4838M','4840M','4842M',
                                   '4844M','4846M','4850M','4852M'))
 ),
 ADD CONSTRAINT kosei_2611_clock_stop_scope_check CHECK(
   (direction_urn='odpt.RailDirection:Outbound' AND stop_count IN(18,21))
   OR (direction_urn='odpt.RailDirection:Inbound' AND stop_count IN(4,5,21,22))
 );
WITH e(source_train_number,calendar_token,expected_hash,expected_count,official_url) AS (VALUES
('1831M','Weekday','6798790f9d2879210df3dd3125992403','21','https://timetable.jr-odekake.net/train-timetable/200841?date=20261023'),
('1831MH','SaturdayHoliday','93194ebf85bccc91f2070688802464b7','21','https://timetable.jr-odekake.net/train-timetable/200851?date=20261031'),
('1839M','Weekday','da4ad4d1415f776de485cc0020cc2669','22','https://timetable.jr-odekake.net/train-timetable/209821?date=20261030'),
('1839MH','SaturdayHoliday','da4ad4d1415f776de485cc0020cc2669','22','https://timetable.jr-odekake.net/train-timetable/209821?date=20261030'),
('4838M','Weekday','26bd08a53988af33551e1d96f2a81677','4','https://timetable.jr-odekake.net/train-timetable/72471?date=20261023'),
('4838MH','SaturdayHoliday','26bd08a53988af33551e1d96f2a81677','4','https://timetable.jr-odekake.net/train-timetable/72471?date=20261023'),
('4840M','Weekday','097600c0fd28a383fa2814e697389371','5','https://timetable.jr-odekake.net/train-timetable/76651?date=20261031'),
('4840MH','SaturdayHoliday','097600c0fd28a383fa2814e697389371','5','https://timetable.jr-odekake.net/train-timetable/76651?date=20261031'),
('4842M','Weekday','f808419411092e57610d0f5f1c61fb3e','4','https://timetable.jr-odekake.net/train-timetable/72481?date=20261108'),
('4842MH','SaturdayHoliday','f808419411092e57610d0f5f1c61fb3e','4','https://timetable.jr-odekake.net/train-timetable/72481?date=20261108'),
('4844M','Weekday','24af1d0a4db3fa25b0df49cbb6c87f2f','5','https://timetable.jr-odekake.net/train-timetable/322481?date=20261026'),
('4844MH','SaturdayHoliday','24af1d0a4db3fa25b0df49cbb6c87f2f','5','https://timetable.jr-odekake.net/train-timetable/322481?date=20261026'),
('4846M','Weekday','31b61cc21dc673189495224d4851541f','4','https://timetable.jr-odekake.net/train-timetable/321871?date=20261108'),
('4846MH','SaturdayHoliday','31b61cc21dc673189495224d4851541f','4','https://timetable.jr-odekake.net/train-timetable/321871?date=20261108'),
('4850M','Weekday','9ff2a3b5f0f7a43adb954d0a7ad8689a','5','https://timetable.jr-odekake.net/train-timetable/91431?date=20261026'),
('4850MH','SaturdayHoliday','9ff2a3b5f0f7a43adb954d0a7ad8689a','5','https://timetable.jr-odekake.net/train-timetable/91431?date=20261026'),
('4852M','Weekday','058694683e8e4ff06cc34ab4637a3b5b','5','https://timetable.jr-odekake.net/train-timetable/322491?date=20261026'),
('4852MH','SaturdayHoliday','058694683e8e4ff06cc34ab4637a3b5b','5','https://timetable.jr-odekake.net/train-timetable/322491?date=20261026')
), matched AS(
 SELECT m.id,m.train_number,m.calendar_urn,m.direction_urn,
        count(*)::integer n,
        md5(string_agg(concat_ws('|',s.stop_sequence,
          coalesce(s.departure_station_urn,s.arrival_station_urn,''),
          coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),
          E'\n' ORDER BY s.stop_sequence)) original_hash
 FROM public.manual_timetable_templates m
 JOIN public.published_jrwest_kosei_2611_source_fleet f
   ON f.source_template_id=m.id AND f.edition='2611'
   AND f.line_key='Kosei'
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key='Kosei'
  AND m.railway_urn='odpt.Railway:JR-West.Kosei'
  AND m.direction_urn='odpt.RailDirection:Inbound'
  AND m.train_type_urn='odpt.TrainType:JR-West.Local'
  AND m.source_path='data/timetables/Kosei-manual.js'
  AND m.source_occurrence=0 AND m.source_revision_date IS NULL
  AND f.reference_only=true AND f.number_date_verified=false
  AND f.actual_vehicle_confirmed=false AND f.authorizes_png=false
 GROUP BY m.id,m.train_number,m.calendar_urn,m.direction_urn
)
INSERT INTO public.published_jrwest_kosei_2611_verified_source_clocks
 (source_template_id,source_train_number,published_train_number,calendar_urn,
  direction_urn,source_stops_md5,stop_count,official_source_url)
SELECT m.id,e.source_train_number,regexp_replace(e.source_train_number,'H$',''),
       m.calendar_urn,m.direction_urn,e.expected_hash,e.expected_count::integer,
       e.official_url
FROM e JOIN matched m
 ON m.train_number=e.source_train_number
 AND m.calendar_urn='odpt.Calendar:'||e.calendar_token
 AND m.original_hash=e.expected_hash AND m.n=e.expected_count::integer
ON CONFLICT(source_template_id) DO NOTHING;
DO $prove$
BEGIN
 IF (SELECT count(*) FROM public.published_jrwest_kosei_2611_verified_source_clocks)<>52
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_clock_evidence
     WHERE verified_source_match)<>52
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_clock_evidence
     WHERE calendar_urn='odpt.Calendar:Weekday')<>26
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_clock_evidence
     WHERE calendar_urn='odpt.Calendar:SaturdayHoliday')<>26
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_verified_source_clocks
     WHERE direction_urn='odpt.RailDirection:Inbound')<>18
 THEN RAISE EXCEPTION 'JR-West Kosei 2611 inbound clock source evidence changed';END IF;
END $prove$;
COMMIT;