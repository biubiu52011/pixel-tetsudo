-- JR-West Nov 2026 Kyoto/Kobe local C source-only proof expansion.
-- Reuse published_jrwest_kyoto_kobe_2611_source_fleet and original
-- manual_timetable_template_stops. Eight original partial source records
-- are independently checked; the official full journeys often continue
-- beyond Kobe/Motomachi and are NEVER inferred by this import.
-- No source train ID rewrite, train vehicle assignment or PNG proof.
BEGIN;
SELECT pg_advisory_xact_lock(26110722);
ALTER TABLE public.published_jrwest_kyoto_kobe_2611_source_fleet
 DROP CONSTRAINT jrwest_kyoto_kobe_2611_clock_proof_scope;
ALTER TABLE public.published_jrwest_kyoto_kobe_2611_source_fleet
 ADD CONSTRAINT jrwest_kyoto_kobe_2611_clock_proof_scope CHECK(
 (official_train_number IS NULL AND official_source_url IS NULL
  AND official_stop_md5 IS NULL AND official_stop_count IS NULL
  AND official_public_train_type IS NULL)
 OR
 (official_train_number=source_public_number_suffix
  AND official_source_url LIKE 'https://timetable.jr-odekake.net/train-timetable/%'
  AND official_stop_md5~'^[a-f0-9]{32}$'
  AND source_line_key='TokaidoKansai'
  AND number_date_verified=false AND actual_vehicle_confirmed=false
  AND authorizes_png=false AND NOT official_calendar_conflict
  AND
  ((official_train_number~'^[0-9]{4}M$'
    AND official_stop_count=7
    AND official_public_train_type='SpecialRapid'
    AND service_family='regional_rapid_t_m')
   OR
   (official_train_number~'^[0-9]{3,4}C$'
    AND official_stop_count IN(16,19,25,33)
    AND official_public_train_type='Local'
    AND service_family='local_c')))
 );
WITH e(source_train_id,public_number,calendar_token,dir,station_count,expected_hash,source_url) AS (VALUES
('500300-1871500-107C','107C','Weekday','Outbound','33','93303216a8a3b9552e77c9919ec06ee9','https://timetable.jr-odekake.net/train-timetable/173541?date=20261026'),
('500300-1871600-107C','107C','SaturdayHoliday','Outbound','33','502f60a48136c467675c2601318361c1','https://timetable.jr-odekake.net/train-timetable/173551?date=20261031'),
('500310-1098100-150C','150C','Weekday','Inbound','25','a4462fbc40fbd24b0fce2bbcba472f6d','https://timetable.jr-odekake.net/train-timetable/102541?date=20261117'),
('500310-1098200-150C','150C','SaturdayHoliday','Inbound','25','a4462fbc40fbd24b0fce2bbcba472f6d','https://timetable.jr-odekake.net/train-timetable/102551?date=20261024'),
('500300-2264000-515C','515C','Weekday','Outbound','19','7575e86816d8cbf88332fc98cabe6c6c','https://timetable.jr-odekake.net/train-timetable/209261?date=20261124'),
('500300-204500-221C','221C','SaturdayHoliday','Outbound','33','c284ad7a6fa6f9a896657e1ae47ce27a','https://timetable.jr-odekake.net/train-timetable/20011?date=20261024'),
('500310-2036300-542C','542C','Weekday','Inbound','16','c523722106e9f524dfc2dab94f3aa210','https://timetable.jr-odekake.net/train-timetable/188971?date=20261104'),
('500310-2036300-542C','542C','SaturdayHoliday','Inbound','16','c523722106e9f524dfc2dab94f3aa210','https://timetable.jr-odekake.net/train-timetable/188971?date=20261104')
), fingerprints AS(
 SELECT m.id,m.train_number,m.calendar_urn,m.direction_urn,
   count(*)::integer n,md5(string_agg(concat_ws('|',s.stop_sequence,
    coalesce(s.departure_station_urn,s.arrival_station_urn,''),
    coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),
    E'\n' ORDER BY s.stop_sequence)) original_hash
 FROM public.manual_timetable_templates m
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key='TokaidoKansai'
 AND m.railway_urn='odpt.Railway:JR-West.TokaidoKansai'
 AND m.source_path='data/timetables/TokaidoKansai-manual.js'
 AND m.source_occurrence=0 AND m.source_revision_date IS NULL
 AND m.train_type_urn='odpt.TrainType:JR-West.Local'
 GROUP BY m.id,m.train_number,m.calendar_urn,m.direction_urn
)
UPDATE public.published_jrwest_kyoto_kobe_2611_source_fleet f
SET official_train_number=e.public_number,official_source_url=e.source_url,
 official_stop_md5=e.expected_hash,official_stop_count=e.station_count::integer,
 official_public_train_type='Local'
FROM e JOIN fingerprints p ON p.train_number=e.source_train_id
 AND p.calendar_urn='odpt.Calendar:'||e.calendar_token
 AND p.direction_urn='odpt.RailDirection:'||e.dir
 AND p.n=e.station_count::integer AND p.original_hash=e.expected_hash
WHERE f.source_template_id=p.id
 AND f.source_train_id=e.source_train_id
 AND f.source_public_number_suffix=e.public_number
 AND f.calendar_urn=p.calendar_urn AND f.direction_urn=p.direction_urn
 AND f.source_line_key='TokaidoKansai' AND f.edition='2611'
 AND f.train_type_urn='odpt.TrainType:JR-West.Local'
 AND f.service_family='local_c' AND f.reference_only=true
 AND f.number_date_verified=false AND f.actual_vehicle_confirmed=false
 AND f.authorizes_png=false AND f.official_train_number IS NULL
 AND NOT f.official_calendar_conflict;
DO $proof$
BEGIN
 IF (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence)<>17
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
     WHERE verified_source_match)<>17
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
     WHERE official_public_train_type='Local')<>8
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
     WHERE calendar_urn='odpt.Calendar:Weekday')<>10
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
     WHERE calendar_urn='odpt.Calendar:SaturdayHoliday')<>7
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_source_fleet
     WHERE official_calendar_conflict)<>2
 THEN RAISE EXCEPTION 'JRWest Kyoto/Kobe source-only local clock evidence changed';END IF;
END $proof$;
COMMIT;