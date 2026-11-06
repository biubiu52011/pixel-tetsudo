-- Kosei 2026-11 official-source clocks: second batch.
-- Extend existing source table, never copy published timetable rows.
-- MH is historic calendar metadata, not part of public M number.
BEGIN;
SELECT pg_advisory_xact_lock(26110712);
ALTER TABLE public.published_jrwest_kosei_2611_verified_source_clocks
 DROP CONSTRAINT published_jrwest_kosei_2611_verifi_published_train_number_check,
 DROP CONSTRAINT published_jrwest_kosei_2611_verified__source_train_number_check,
 DROP CONSTRAINT published_jrwest_kosei_2611_verified_source_cl_stop_count_check;
ALTER TABLE public.published_jrwest_kosei_2611_verified_source_clocks
 ADD CONSTRAINT kosei_2611_clock_number_scope_check
 CHECK (published_train_number ~ '^(180[2468]|181[02468]|182[02468]|183[0246])M$'
 AND source_train_number ~ '^(180[2468]|181[02468]|182[02468]|183[0246])MH?$'),
 ADD CONSTRAINT kosei_2611_clock_stop_scope_check CHECK (stop_count IN(18,21));
WITH e(source_train_number,calendar_token,expected_hash,expected_count,official_url) AS (VALUES
('1810M','Weekday','931de61b84f4752e4e0d91fe37fb6c2e','18','https://timetable.jr-odekake.net/train-timetable/63621?date=20261029'),
('1810MH','SaturdayHoliday','6eeadbaa57e1dd0345f0e89f0f12dd5b','18','https://timetable.jr-odekake.net/train-timetable/63631?date=20261103'),
('1812M','Weekday','0168cb26bd514ea3b1a066d78d8006a0','18','https://timetable.jr-odekake.net/train-timetable/72531?date=20261025'),
('1812MH','SaturdayHoliday','0168cb26bd514ea3b1a066d78d8006a0','18','https://timetable.jr-odekake.net/train-timetable/72531?date=20261025'),
('1814M','Weekday','8ba7c045f25add8c96a00bcfb3b00014','18','https://timetable.jr-odekake.net/train-timetable/72541?date=20261023'),
('1814MH','SaturdayHoliday','8ba7c045f25add8c96a00bcfb3b00014','18','https://timetable.jr-odekake.net/train-timetable/72541?date=20261023'),
('1816M','Weekday','a94a7af7237bfc25d38b7edc168f4a1c','18','https://timetable.jr-odekake.net/train-timetable/72551?date=20261031'),
('1816MH','SaturdayHoliday','a94a7af7237bfc25d38b7edc168f4a1c','18','https://timetable.jr-odekake.net/train-timetable/72551?date=20261031'),
('1818M','Weekday','b6b7f2eb2f1c0a22f8e556f518fdc76b','18','https://timetable.jr-odekake.net/train-timetable/72561?date=20261101'),
('1818MH','SaturdayHoliday','b6b7f2eb2f1c0a22f8e556f518fdc76b','18','https://timetable.jr-odekake.net/train-timetable/72561?date=20261101'),
('1820M','Weekday','cc5052416f04b8f3d884eb87a7ff5921','18','https://timetable.jr-odekake.net/train-timetable/63611?date=20261031'),
('1820MH','SaturdayHoliday','cc5052416f04b8f3d884eb87a7ff5921','18','https://timetable.jr-odekake.net/train-timetable/63611?date=20261031'),
('1824M','Weekday','91df9f10d7434b6800d1063133b5bb96','18','https://timetable.jr-odekake.net/train-timetable/16281?date=20261024'),
('1824MH','SaturdayHoliday','91df9f10d7434b6800d1063133b5bb96','18','https://timetable.jr-odekake.net/train-timetable/16281?date=20261024'),
('1826M','Weekday','2e0c7ef96d3f3a56998912d966881f53','21','https://timetable.jr-odekake.net/train-timetable/209511?date=20261031'),
('1826MH','SaturdayHoliday','2e0c7ef96d3f3a56998912d966881f53','21','https://timetable.jr-odekake.net/train-timetable/209511?date=20261031'),
('1828M','Weekday','90ef57c08a36ef7b2ebe2da65f4b2059','18','https://timetable.jr-odekake.net/train-timetable/76611?date=20261031'),
('1828MH','SaturdayHoliday','90ef57c08a36ef7b2ebe2da65f4b2059','18','https://timetable.jr-odekake.net/train-timetable/76611?date=20261031'),
('1830M','Weekday','714be1831bc340933d0b8881b476d1b8','18','https://timetable.jr-odekake.net/train-timetable/63651?date=20261023'),
('1830MH','SaturdayHoliday','714be1831bc340933d0b8881b476d1b8','18','https://timetable.jr-odekake.net/train-timetable/63651?date=20261023'),
('1832M','Weekday','9f1d589121b4ccac67b129b5d860b5c6','21','https://timetable.jr-odekake.net/train-timetable/209551?date=20261023'),
('1832MH','SaturdayHoliday','9f1d589121b4ccac67b129b5d860b5c6','21','https://timetable.jr-odekake.net/train-timetable/209551?date=20261023'),
('1834M','Weekday','a256b4aa28e8ca89f6744014c8742342','18','https://timetable.jr-odekake.net/train-timetable/140221?date=20261027'),
('1834MH','SaturdayHoliday','a256b4aa28e8ca89f6744014c8742342','18','https://timetable.jr-odekake.net/train-timetable/140221?date=20261027'),
('1836M','Weekday','ce08738acdbf47145d81689a56b81d14','18','https://timetable.jr-odekake.net/train-timetable/209591?date=20261027'),
('1836MH','SaturdayHoliday','ce08738acdbf47145d81689a56b81d14','18','https://timetable.jr-odekake.net/train-timetable/209591?date=20261027')
), matched AS (
 SELECT m.id,m.train_number,m.calendar_urn,COUNT(*)::integer n,
 md5(string_agg(concat_ws('|',s.stop_sequence,
 coalesce(s.departure_station_urn,s.arrival_station_urn,''),
 coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),
 E'\n' ORDER BY s.stop_sequence)) actual_hash
 FROM public.manual_timetable_templates m
 JOIN public.published_jrwest_kosei_2611_source_fleet f
 ON f.source_template_id=m.id AND f.edition='2611' AND f.line_key='Kosei'
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key='Kosei' AND m.railway_urn='odpt.Railway:JR-West.Kosei'
 AND m.source_path='data/timetables/Kosei-manual.js'
 AND m.source_occurrence=0 AND m.source_revision_date IS NULL
 AND m.train_type_urn='odpt.TrainType:JR-West.Local'
 AND m.direction_urn='odpt.RailDirection:Outbound'
 AND f.reference_only=true AND f.number_date_verified=false
 AND f.actual_vehicle_confirmed=false AND f.authorizes_png=false
 GROUP BY m.id,m.train_number,m.calendar_urn
)
INSERT INTO public.published_jrwest_kosei_2611_verified_source_clocks
(source_template_id,source_train_number,published_train_number,
 calendar_urn,source_stops_md5,stop_count,official_source_url)
SELECT m.id,e.source_train_number,regexp_replace(e.source_train_number,'H$',''),
 m.calendar_urn,e.expected_hash,e.expected_count,e.official_url
FROM e JOIN matched m ON m.train_number=e.source_train_number
AND m.calendar_urn='odpt.Calendar:'||e.calendar_token
AND m.actual_hash=e.expected_hash AND m.n=e.expected_count
ON CONFLICT(source_template_id) DO NOTHING;
DO $proof$
BEGIN
 IF (SELECT count(*) FROM public.published_jrwest_kosei_2611_verified_source_clocks)<>34
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_clock_evidence WHERE verified_source_match)<>34
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_clock_evidence WHERE calendar_urn='odpt.Calendar:Weekday')<>17
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_clock_evidence WHERE calendar_urn='odpt.Calendar:SaturdayHoliday')<>17
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_verified_source_clocks WHERE stop_count=21)<>4
 THEN RAISE EXCEPTION 'Kosei 2611 second batch: expected 34 verified original source clocks'; END IF;
END $proof$;
COMMIT;