-- JR-West 2026-11: expand Kobe Line Kobe-west source-only C proof
-- through the pre-existing SanyoMain family, NEVER introducing new
-- duplicated schedule tables or moving an unverified source calendar.
-- Retain original compound source train IDs and stop clocks untouched.
BEGIN;
SELECT pg_advisory_xact_lock(26110726);
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
   AND number_date_verified=false AND actual_vehicle_confirmed=false
   AND authorizes_png=false AND NOT official_calendar_conflict
   AND (
     (source_line_key='TokaidoKansai' AND (
       (official_train_number~'^[0-9]{4}M$'
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
     OR
     (source_line_key='SanyoMain'
      AND official_train_number IN
        ('173C','209C','217C','241C','153C','189C',
         '191C','4631C','4693C','4729C')
      AND official_stop_count IN (5,11)
      AND official_public_train_type='Local'
      AND service_family='local_c'
      AND
      ((official_train_number IN
        ('173C','209C','241C','153C','189C','191C','4693C')
          AND calendar_urn='odpt.Calendar:Weekday')
        OR
       (official_train_number IN ('217C','4631C','4729C')
          AND calendar_urn='odpt.Calendar:SaturdayHoliday')))
   ))
 );
WITH e(source_train_id,public_number,calendar_token,expected_count,
       expected_hash,official_url) AS(VALUES
('710100-1668700-153C','153C','Weekday','5','80c8f3849686fd9d7bae2b2d8a588bf0','https://timetable.jr-odekake.net/train-timetable/155921?date=20261104'),
('710100-1096700-189C','189C','Weekday','5','333ff3c1a8e220566b3bb6ca10003d44','https://timetable.jr-odekake.net/train-timetable/102401?date=20261023'),
('710100-919300-191C','191C','Weekday','5','ec682bdac64b4ee3d83e37a0df182e67','https://timetable.jr-odekake.net/train-timetable/86381?date=20261009'),
('710100-2041200-4631C','4631C','SaturdayHoliday','11','e133d01aa1ae9b60ef49a0872fb45deb','https://timetable.jr-odekake.net/train-timetable/189391?date=20261023'),
('710100-2044600-4693C','4693C','Weekday','11','a19292666edcfdb70843954de995c403','https://timetable.jr-odekake.net/train-timetable/189601?date=20261013'),
('710100-2046500-4729C','4729C','SaturdayHoliday','11','9cf18d56cd53d42d9f6d7f1ed5f6cb8d','https://timetable.jr-odekake.net/train-timetable/189791?date=20261017')
), fingerprints AS(
 SELECT m.id,m.train_number,m.calendar_urn,m.direction_urn,m.train_type_urn,
    count(*)::integer stop_count,
    md5(string_agg(concat_ws('|',s.stop_sequence,
     coalesce(s.departure_station_urn,s.arrival_station_urn,''),
     coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),
     E'\n' ORDER BY s.stop_sequence)) original_hash
 FROM public.manual_timetable_templates m
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key='SanyoMain'
   AND m.railway_urn='odpt.Railway:JR-West.SanyoMain'
   AND m.source_path='data/timetables/SanyoMain-manual.js'
   AND m.source_occurrence=0 AND m.source_revision_date IS NULL
   AND m.train_type_urn='odpt.TrainType:JR-West.Local'
   AND m.direction_urn='odpt.RailDirection:Outbound'
 GROUP BY m.id,m.train_number,m.calendar_urn,m.direction_urn,m.train_type_urn
)
UPDATE public.published_jrwest_kyoto_kobe_2611_source_fleet f
SET official_train_number=e.public_number,
 official_source_url=e.official_url,
 official_stop_md5=e.expected_hash,
 official_stop_count=e.expected_count::integer,
 official_public_train_type='Local'
FROM e JOIN fingerprints p ON p.train_number=e.source_train_id
 AND p.calendar_urn='odpt.Calendar:'||e.calendar_token
 AND p.original_hash=e.expected_hash AND p.stop_count=e.expected_count::integer
WHERE f.source_template_id=p.id AND f.source_train_id=e.source_train_id
 AND f.source_line_key='SanyoMain' AND f.edition='2611'
 AND f.calendar_urn=p.calendar_urn AND f.direction_urn=p.direction_urn
 AND f.source_public_number_suffix=e.public_number
 AND f.candidate_segment='kobe_himeji'
 AND f.train_type_urn='odpt.TrainType:JR-West.Local'
 AND f.service_family='local_c' AND f.reference_only=true
 AND f.number_date_verified=false AND f.actual_vehicle_confirmed=false
 AND f.authorizes_png=false AND f.official_train_number IS NULL
 AND NOT f.official_calendar_conflict;
DO $proof$
BEGIN
 IF (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence)<>41
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
 WHERE verified_source_match)<>41
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
 WHERE source_line_key='SanyoMain')<>10
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
 WHERE source_line_key='SanyoMain'
 AND calendar_urn='odpt.Calendar:Weekday')<>7
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
 WHERE source_line_key='SanyoMain'
 AND calendar_urn='odpt.Calendar:SaturdayHoliday')<>3
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
 WHERE source_line_key='TokaidoKansai')<>31
 OR EXISTS(
 SELECT 1 FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
 WHERE actual_vehicle_confirmed OR authorizes_png)
 THEN RAISE EXCEPTION 'Kyoto-Kobe Sanyo source-only proof scope changed'; END IF;
END $proof$;
COMMIT;
