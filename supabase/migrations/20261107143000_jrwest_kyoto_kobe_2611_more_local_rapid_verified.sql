-- JR West Nov 2026: additional existing Kyoto/Kobe LOCAL C and
-- RAPID T sources with official per-calendar train-number evidence.
-- The importer composite train ID remains internal. Never infer
-- missing stations, vehicle formations, or PNG from a published number.
-- The exact original timetable stop fingerprint must match before a
-- published number/stop segment is admitted by train-runs.
BEGIN;
SELECT pg_advisory_xact_lock(26110724);
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
     AND official_stop_count IN (16,19,25,32,33)
     AND official_public_train_type='Local'
     AND service_family='local_c')
    OR
    (official_train_number~'^[0-9]{3,4}T$'
     AND official_stop_count=18
     AND official_public_train_type='Rapid'
     AND service_family='regional_rapid_t_m')))
 );
WITH e(source_train_id,public_number,calendar_token,direction_token,
       stop_count,source_md5,official_url,public_type) AS (VALUES
('500310-1389200-172C','172C','SaturdayHoliday','Inbound','25','247388c0a9ad74b5392f26cda63cf5a0','https://timetable.jr-odekake.net/train-timetable/129881?date=20261030','Local'),
('500310-1389400-176C','176C','Weekday','Inbound','25','778911d60d391e11923f083c5a1c3a4d','https://timetable.jr-odekake.net/train-timetable/129901?date=20261026','Local'),
('500310-920400-202C','202C','Weekday','Inbound','32','d45cec4d0905ee63d2f0092ccb1e3bc8','https://timetable.jr-odekake.net/train-timetable/86491?date=20261013','Local'),
('500310-217400-228C','228C','Weekday','Inbound','32','68a315b65d00ee4e33a9910984d5fb82','https://timetable.jr-odekake.net/train-timetable/21281?date=20261026','Local'),
('500310-1390300-194C','194C','SaturdayHoliday','Inbound','32','8047e472e8c0f7c4e8c7377dd1fa3ae1','https://timetable.jr-odekake.net/train-timetable/129991?date=20261024','Local'),
('500310-4346500-810T','810T','SaturdayHoliday','Inbound','18','940ffc5e81b927f1e9d02ffe6e070633','https://timetable.jr-odekake.net/train-timetable/389831?date=20261012','Rapid'),
('500300-1385300-823T','823T','SaturdayHoliday','Outbound','18','deab107fb7beadf6dbe65c20ca35aed5','https://timetable.jr-odekake.net/train-timetable/129491?date=20261025','Rapid'),
('500300-4344000-835T','835T','SaturdayHoliday','Outbound','18','a9ee44f9b5d4e1a0ba2b1485548004ca','https://timetable.jr-odekake.net/train-timetable/386891?date=20261031','Rapid')
), source_fingerprint AS (
 SELECT m.id,m.train_number,m.calendar_urn,m.direction_urn,m.train_type_urn,
        count(*)::integer stop_count,
        md5(string_agg(concat_ws('|',s.stop_sequence,
          coalesce(s.departure_station_urn,s.arrival_station_urn,''),
          coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),
          E'\n' ORDER BY s.stop_sequence)) source_md5
 FROM public.manual_timetable_templates m
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key='TokaidoKansai'
   AND m.railway_urn='odpt.Railway:JR-West.TokaidoKansai'
   AND m.source_path='data/timetables/TokaidoKansai-manual.js'
   AND m.source_occurrence=0 AND m.source_revision_date IS NULL
   AND m.train_type_urn IN ('odpt.TrainType:JR-West.Local',
                            'odpt.TrainType:JR-West.Rapid')
 GROUP BY m.id,m.train_number,m.calendar_urn,m.direction_urn,m.train_type_urn
)
UPDATE public.published_jrwest_kyoto_kobe_2611_source_fleet f
SET official_train_number=e.public_number,
    official_source_url=e.official_url,
    official_stop_md5=e.source_md5,
    official_stop_count=e.stop_count::integer,
    official_public_train_type=e.public_type
FROM e JOIN source_fingerprint p
  ON p.train_number=e.source_train_id
 AND p.calendar_urn='odpt.Calendar:'||e.calendar_token
 AND p.direction_urn='odpt.RailDirection:'||e.direction_token
 AND p.source_md5=e.source_md5 AND p.stop_count=e.stop_count::integer
 AND p.train_type_urn='odpt.TrainType:JR-West.'||e.public_type
WHERE f.source_template_id=p.id AND f.source_train_id=e.source_train_id
  AND f.source_line_key='TokaidoKansai' AND f.edition='2611'
  AND f.source_public_number_suffix=e.public_number
  AND f.calendar_urn=p.calendar_urn AND f.direction_urn=p.direction_urn
  AND f.train_type_urn=p.train_type_urn
  AND f.service_family=CASE WHEN e.public_type='Local'
       THEN 'local_c' ELSE 'regional_rapid_t_m' END
  AND f.reference_only=true AND f.number_date_verified=false
  AND f.actual_vehicle_confirmed=false AND f.authorizes_png=false
  AND f.official_train_number IS NULL AND NOT f.official_calendar_conflict;
DO $proof$
BEGIN
 IF (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence)<>31
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
     WHERE verified_source_match)<>31
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
     WHERE official_public_train_type='Local')<>13
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
     WHERE official_public_train_type='Rapid')<>9
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
     WHERE official_public_train_type='SpecialRapid')<>9
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
     WHERE calendar_urn='odpt.Calendar:Weekday')<>15
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
     WHERE calendar_urn='odpt.Calendar:SaturdayHoliday')<>16
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_source_fleet
     WHERE official_calendar_conflict)<>2
 THEN RAISE EXCEPTION 'JR-West Kyoto/Kobe C/T third proof 31 records gate failed'; END IF;
END $proof$;
COMMIT;
