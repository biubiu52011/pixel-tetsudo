-- JR-West Kyoto/Kobe 2611: six existing 18-stop rapid T sources.
-- Full public trains often continue to/from Maibara, Aboshi, Himeji:
-- This migration certifies ORIGINAL source partial stations only,
-- preserving the source composite ID and unconfirmed 223/225 fleets.
BEGIN;
SELECT pg_advisory_xact_lock(26110723);
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
    AND service_family='local_c')
   OR
   (official_train_number~'^[0-9]{3,4}T$'
    AND official_stop_count=18
    AND official_public_train_type='Rapid'
    AND service_family='regional_rapid_t_m')))
 );
WITH e(source_train_id,public_number,calendar_token,dir,expected_hash,source_url) AS (VALUES
('500310-1385400-714T','714T','Weekday','Inbound','04eb3f4839da78231a2aefbe304b12e1','https://timetable.jr-odekake.net/train-timetable/129501?date=20261028'),
('500310-4345200-714T','714T','SaturdayHoliday','Inbound','fc242a15daacee38ad6188cc5404e510','https://timetable.jr-odekake.net/train-timetable/389701?date=20261024'),
('500310-4345500-726T','726T','SaturdayHoliday','Inbound','9bf30529c270016c4b63b0243e38b64c','https://timetable.jr-odekake.net/train-timetable/387041?date=20261024'),
('500300-1583900-733T','733T','SaturdayHoliday','Outbound','2a801130cce5cddfb87140667f031276','https://timetable.jr-odekake.net/train-timetable/147931?date=20261018'),
('500300-1578700-767T','767T','SaturdayHoliday','Outbound','d08c21bbc3939931f51c9a58bc5d7fb3','https://timetable.jr-odekake.net/train-timetable/147561?date=20261107'),
('500300-1090400-791T','791T','Weekday','Outbound','32606f1e87534d796a323a0d9475a06a','https://timetable.jr-odekake.net/train-timetable/101651?date=20261006')
), fingerprints AS(
 SELECT m.id,m.train_number,m.calendar_urn,m.direction_urn,
 count(*)::integer n,
 md5(string_agg(concat_ws('|',s.stop_sequence,
 coalesce(s.departure_station_urn,s.arrival_station_urn,''),
 coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),
 E'\n' ORDER BY s.stop_sequence)) original_hash
 FROM public.manual_timetable_templates m
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key='TokaidoKansai'
 AND m.railway_urn='odpt.Railway:JR-West.TokaidoKansai'
 AND m.source_path='data/timetables/TokaidoKansai-manual.js'
 AND m.source_occurrence=0 AND m.source_revision_date IS NULL
 AND m.train_type_urn='odpt.TrainType:JR-West.Rapid'
 GROUP BY m.id,m.train_number,m.calendar_urn,m.direction_urn
)
UPDATE public.published_jrwest_kyoto_kobe_2611_source_fleet f
SET official_train_number=e.public_number,official_source_url=e.source_url,
 official_stop_md5=e.expected_hash,official_stop_count=18,
 official_public_train_type='Rapid'
FROM e JOIN fingerprints p ON p.train_number=e.source_train_id
 AND p.calendar_urn='odpt.Calendar:'||e.calendar_token
 AND p.direction_urn='odpt.RailDirection:'||e.dir
 AND p.n=18 AND p.original_hash=e.expected_hash
WHERE f.source_template_id=p.id AND f.source_train_id=e.source_train_id
 AND f.source_public_number_suffix=e.public_number
 AND f.calendar_urn=p.calendar_urn AND f.direction_urn=p.direction_urn
 AND f.source_line_key='TokaidoKansai' AND f.edition='2611'
 AND f.train_type_urn='odpt.TrainType:JR-West.Rapid'
 AND f.service_family='regional_rapid_t_m' AND f.reference_only=true
 AND f.number_date_verified=false AND f.actual_vehicle_confirmed=false
 AND f.authorizes_png=false AND f.official_train_number IS NULL
 AND NOT f.official_calendar_conflict;
DO $proof$
BEGIN
 IF (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence)<>23
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
     WHERE verified_source_match)<>23
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
     WHERE official_public_train_type='Rapid')<>6
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
     WHERE official_public_train_type='Local')<>8
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
     WHERE official_public_train_type='SpecialRapid')<>9
 THEN RAISE EXCEPTION 'Kyoto/Kobe 2611 six rapid source partial clocks failed proof';END IF;
END $proof$;
COMMIT;