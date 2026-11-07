-- Kosei 2026-11 midmorning 2810/2814/2818/2820/2822/2824/2826M
-- original-source station-clock proof for weekday/holiday editions.
-- 2824M ends at Katata (7 stops), others at Oumi-Maiko (13).
-- No copied official train timetable, no guessed stock, no PNG, no
-- additional background process, and no second schedule table.
BEGIN;
SELECT pg_advisory_xact_lock(26110731);
ALTER TABLE public.published_jrwest_kosei_2611_verified_source_clocks
 DROP CONSTRAINT kosei_2611_clock_number_scope_check;
ALTER TABLE public.published_jrwest_kosei_2611_verified_source_clocks
 ADD CONSTRAINT kosei_2611_clock_number_scope_check CHECK(
   (direction_urn='odpt.RailDirection:Outbound'
     AND published_train_number~
        '^(180[2468]|181[02468]|182[02468]|183[02468]|1840|280[02468]|281[0248]|282[0246])M$')
   OR
   (direction_urn='odpt.RailDirection:Inbound'
     AND published_train_number IN('1831M','1839M','4838M','4840M','4842M',
                                   '4844M','4846M','4848M','4850M','4852M'))
 );
WITH e(source_number,calendar_token,stop_count,source_hash,official_url) AS(VALUES
('2810M','Weekday','13','b4d232d12d6ee3669aa9c1d577780a60','https://timetable.jr-odekake.net/train-timetable/27411?date=20261023'),
('2810MH','SaturdayHoliday','13','26abc7675bd159b7b09edb255f1d056f','https://timetable.jr-odekake.net/train-timetable/27421?date=20261101'),
('2814M','Weekday','13','5b3fe939a300839f4d04b78c9bcb99e6','https://timetable.jr-odekake.net/train-timetable/121111?date=20261106'),
('2814MH','SaturdayHoliday','13','29bb18c9a39ed017ec2274212eb60ac3','https://timetable.jr-odekake.net/train-timetable/121121?date=20261024'),
('2818M','Weekday','13','50d2c81f6e8b149b1e059cb7c9ae3e0c','https://timetable.jr-odekake.net/train-timetable/27451?date=20261106'),
('2818MH','SaturdayHoliday','13','50d2c81f6e8b149b1e059cb7c9ae3e0c','https://timetable.jr-odekake.net/train-timetable/27451?date=20261106'),
('2820M','Weekday','13','cfe4e02efcfba6e1bcb81558a3f330c3','https://timetable.jr-odekake.net/train-timetable/209401?date=20261101'),
('2820MH','SaturdayHoliday','13','cfe4e02efcfba6e1bcb81558a3f330c3','https://timetable.jr-odekake.net/train-timetable/209401?date=20261101'),
('2822M','Weekday','13','610b572ded39f621e5129c366d32dcb6','https://timetable.jr-odekake.net/train-timetable/189021?date=20261023'),
('2822MH','SaturdayHoliday','13','610b572ded39f621e5129c366d32dcb6','https://timetable.jr-odekake.net/train-timetable/189021?date=20261023'),
('2824M','Weekday','7','9ff9b531e4d6931c61cf75ee9e4d4ef8','https://timetable.jr-odekake.net/train-timetable/189031?date=20261024'),
('2824MH','SaturdayHoliday','7','9ff9b531e4d6931c61cf75ee9e4d4ef8','https://timetable.jr-odekake.net/train-timetable/189031?date=20261024'),
('2826M','Weekday','13','db3253c16619296287d7a804e363c75f','https://timetable.jr-odekake.net/train-timetable/121131?date=20261031'),
('2826MH','SaturdayHoliday','13','db3253c16619296287d7a804e363c75f','https://timetable.jr-odekake.net/train-timetable/121131?date=20261031')
), original_stops AS(
 SELECT m.id,m.train_number,m.calendar_urn,m.direction_urn,
 count(*)::integer n,
 md5(string_agg(concat_ws('|',s.stop_sequence,
   coalesce(s.departure_station_urn,s.arrival_station_urn,''),
   coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),
   E'\n' ORDER BY s.stop_sequence)) hash
 FROM public.manual_timetable_templates m
 JOIN public.published_jrwest_kosei_2611_source_fleet f
 ON f.source_template_id=m.id AND f.edition='2611' AND f.line_key='Kosei'
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key='Kosei'
 AND m.railway_urn='odpt.Railway:JR-West.Kosei'
 AND m.source_path='data/timetables/Kosei-manual.js'
 AND m.source_occurrence=0 AND m.source_revision_date IS NULL
 AND m.train_type_urn='odpt.TrainType:JR-West.Local'
 AND m.direction_urn='odpt.RailDirection:Outbound'
 AND f.reference_only=true AND f.number_date_verified=false
 AND f.actual_vehicle_confirmed=false AND f.authorizes_png=false
 GROUP BY m.id,m.train_number,m.calendar_urn,m.direction_urn
)
INSERT INTO public.published_jrwest_kosei_2611_verified_source_clocks
(source_template_id,source_train_number,published_train_number,calendar_urn,
 direction_urn,source_stops_md5,stop_count,official_source_url)
SELECT o.id,e.source_number,regexp_replace(e.source_number,'H$',''),
       o.calendar_urn,o.direction_urn,e.source_hash,e.stop_count::integer,
       e.official_url
FROM e JOIN original_stops o ON o.train_number=e.source_number
 AND o.calendar_urn='odpt.Calendar:'||e.calendar_token
 AND o.n=e.stop_count::integer AND o.hash=e.source_hash
ON CONFLICT(source_template_id) DO NOTHING;
DO $prove$
BEGIN
 IF (SELECT count(*) FROM public.published_jrwest_kosei_2611_verified_source_clocks)<>83
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_clock_evidence
  WHERE verified_source_match)<>83
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_clock_evidence
  WHERE calendar_urn='odpt.Calendar:Weekday')<>42
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_clock_evidence
  WHERE calendar_urn='odpt.Calendar:SaturdayHoliday')<>41
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_verified_source_clocks
  WHERE stop_count=7)<>4
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_verified_source_clocks
  WHERE stop_count=13)<>21
 THEN RAISE EXCEPTION 'Kosei 2611 middle morning 14 original clock proofs changed'; END IF;
END $prove$;
COMMIT;