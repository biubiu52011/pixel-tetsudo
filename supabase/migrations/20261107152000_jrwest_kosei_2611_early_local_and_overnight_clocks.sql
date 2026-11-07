-- JR-West 2026-11 verified Lake Biwa / Kosei local source clock expansion.
-- New evidence: 15 ORIGINAL source records, 7/13/18-stop partial/full
-- local trains. Never copy the JR-West timetable into a second run store.
-- Overnight 1838M/1840M retain the original DEPARTURE service date.
-- Public M number is stripped of internal holiday 'H' only when every
-- historical station arrival/departure source fingerprint still matches.
-- No stock, vehicle set, 221/223/225/521 livery or PNG is authorized.
BEGIN;
SELECT pg_advisory_xact_lock(26110729);
ALTER TABLE public.published_jrwest_kosei_2611_verified_source_clocks
 DROP CONSTRAINT kosei_2611_clock_number_scope_check,
 DROP CONSTRAINT kosei_2611_clock_stop_scope_check;
ALTER TABLE public.published_jrwest_kosei_2611_verified_source_clocks
 ADD CONSTRAINT kosei_2611_clock_number_scope_check CHECK(
   (direction_urn='odpt.RailDirection:Outbound'
     AND published_train_number~
        '^(180[2468]|181[02468]|182[02468]|183[02468]|1840|280[02468]|2812)M$')
   OR
   (direction_urn='odpt.RailDirection:Inbound'
     AND published_train_number IN('1831M','1839M','4838M','4840M','4842M',
                                   '4844M','4846M','4848M','4850M','4852M'))
 ),
 ADD CONSTRAINT kosei_2611_clock_stop_scope_check CHECK(
   (direction_urn='odpt.RailDirection:Outbound' AND stop_count IN(7,13,18,21))
   OR (direction_urn='odpt.RailDirection:Inbound' AND stop_count IN(4,5,21,22))
 );
WITH evidence(source_train_number,calendar_token,expected_count,expected_hash,
             official_url) AS(VALUES
('1838M','Weekday','18','fd4ea3f9351e8f8d0a38c399cd416513','https://timetable.jr-odekake.net/train-timetable/140231?date=20261104'),
('1838MH','SaturdayHoliday','18','fd4ea3f9351e8f8d0a38c399cd416513','https://timetable.jr-odekake.net/train-timetable/140231?date=20261104'),
('1840M','Weekday','18','e0e6dccfe35ec1a775aac6ce2685efff','https://timetable.jr-odekake.net/train-timetable/91391?date=20261023'),
('1840MH','SaturdayHoliday','18','e0e6dccfe35ec1a775aac6ce2685efff','https://timetable.jr-odekake.net/train-timetable/91391?date=20261023'),
('2800M','Weekday','13','2fcd2005fdeb59446ad6569933968741','https://timetable.jr-odekake.net/train-timetable/27321?date=20261024'),
('2800MH','SaturdayHoliday','13','2fcd2005fdeb59446ad6569933968741','https://timetable.jr-odekake.net/train-timetable/27321?date=20261024'),
('2802M','Weekday','13','2dafbe716ac7cd3fec19399d40d330ea','https://timetable.jr-odekake.net/train-timetable/27351?date=20261105'),
('2804M','Weekday','13','34faf5fe888d9a20d08520ae79f082c8','https://timetable.jr-odekake.net/train-timetable/27361?date=20261105'),
('2804MH','SaturdayHoliday','13','901dfc13e39b9604793dbe1f774d2d1c','https://timetable.jr-odekake.net/train-timetable/27371?date=20261024'),
('2806M','Weekday','13','d1dd898267e108f02b13e36fe7f76ae9','https://timetable.jr-odekake.net/train-timetable/70641?date=20261016'),
('2806MH','SaturdayHoliday','13','610ffa1144868d26aae6131ff29f9c67','https://timetable.jr-odekake.net/train-timetable/70691?date=20261107'),
('2808M','Weekday','7','cd7e4a39112c26f33e394d59099c9bd3','https://timetable.jr-odekake.net/train-timetable/70701?date=20261030'),
('2808MH','SaturdayHoliday','7','71bb38f99bddf57b42eadf42fb45fffe','https://timetable.jr-odekake.net/train-timetable/70711?date=20261024'),
('2812M','Weekday','13','251588c6d0bb5ff1a57c518ae6b38ca1','https://timetable.jr-odekake.net/train-timetable/27431?date=20261105'),
('2812MH','SaturdayHoliday','13','257e57e6e7af94353439d7b2e739d7d3','https://timetable.jr-odekake.net/train-timetable/27441?date=20261101')
), originals AS (
 SELECT m.id,m.train_number,m.calendar_urn,m.direction_urn,
        count(*)::integer source_count,
        md5(string_agg(concat_ws('|',s.stop_sequence,
           coalesce(s.departure_station_urn,s.arrival_station_urn,''),
           coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),
           E'\n' ORDER BY s.stop_sequence)) source_hash
 FROM public.manual_timetable_templates m
 JOIN public.published_jrwest_kosei_2611_source_fleet f
   ON f.source_template_id=m.id AND f.edition='2611' AND f.line_key='Kosei'
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key='Kosei'
   AND m.railway_urn='odpt.Railway:JR-West.Kosei'
   AND m.source_path='data/timetables/Kosei-manual.js'
   AND m.source_revision_date IS NULL AND m.source_occurrence=0
   AND m.train_type_urn='odpt.TrainType:JR-West.Local'
   AND m.direction_urn='odpt.RailDirection:Outbound'
   AND f.reference_only=true AND f.number_date_verified=false
   AND f.actual_vehicle_confirmed=false AND f.authorizes_png=false
 GROUP BY m.id,m.train_number,m.calendar_urn,m.direction_urn
)
INSERT INTO public.published_jrwest_kosei_2611_verified_source_clocks
 (source_template_id,source_train_number,published_train_number,calendar_urn,
  direction_urn,source_stops_md5,stop_count,official_source_url)
SELECT o.id,e.source_train_number,regexp_replace(e.source_train_number,'H$',''),
       o.calendar_urn,o.direction_urn,e.expected_hash,e.expected_count::integer,
       e.official_url
FROM evidence e JOIN originals o
 ON o.train_number=e.source_train_number
 AND o.calendar_urn='odpt.Calendar:'||e.calendar_token
 AND o.source_count=e.expected_count::integer
 AND o.source_hash=e.expected_hash
ON CONFLICT (source_template_id) DO NOTHING;
DO $proof$
BEGIN
 IF (SELECT count(*) FROM public.published_jrwest_kosei_2611_verified_source_clocks)<>69
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_clock_evidence
    WHERE verified_source_match)<>69
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_clock_evidence
    WHERE calendar_urn='odpt.Calendar:Weekday')<>35
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_clock_evidence
    WHERE calendar_urn='odpt.Calendar:SaturdayHoliday')<>34
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_verified_source_clocks
    WHERE published_train_number IN ('1838M','1840M'))<>4
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_verified_source_clocks
    WHERE stop_count=7)<>2
 THEN RAISE EXCEPTION 'Kosei 2026-11 early and overnight 15 source schedule proofs changed'; END IF;
END $proof$;
COMMIT;
