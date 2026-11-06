-- JR-West 2611: four SanyoMain source segments belonging to
-- JR Kobe Line WEST of Kobe station. Their existing manual source
-- clocks match the official 2026-11 timetable at ALL 5/11 stations.
-- Do NOT promote the nearby 741T: its original Tegara-Yamahira stop
-- departs 11:49 versus the JR official 11:48; no guessed correction.
BEGIN;
SELECT pg_advisory_xact_lock(26110725);
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
      AND official_train_number IN ('173C','209C','217C','241C')
      AND official_stop_count IN (5,11)
      AND official_public_train_type='Local'
      AND service_family='local_c'
      AND ((official_train_number IN('173C','209C','241C')
             AND calendar_urn='odpt.Calendar:Weekday')
           OR (official_train_number='217C'
             AND calendar_urn='odpt.Calendar:SaturdayHoliday')))
   ))
 );
-- EXACT ORIGINAL station clocks must match; no new stop row copies.
WITH e(source_train_id,public_number,calendar_token,expected_count,
       expected_hash,official_url) AS(VALUES
('710100-1096200-173C','173C','Weekday','5','ae9c0698577116c22cc407174b362d8e','https://timetable.jr-odekake.net/train-timetable/102351?date=20261024'),
('710100-194000-209C','209C','Weekday','11','c3170655bb21b99b1594c87f0dde4efd','https://timetable.jr-odekake.net/train-timetable/18981?date=20261026'),
('710100-198700-217C','217C','SaturdayHoliday','11','2d877ffb38d617c2547e164b90dc814c','https://timetable.jr-odekake.net/train-timetable/19441?date=20261031'),
('710100-236600-241C','241C','Weekday','11','b9c0191b644b8c6e02a5b26281066df8','https://timetable.jr-odekake.net/train-timetable/23181?date=20261028')
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
-- Extend EXISTING invoker evidence view to both JR Kyoto/Kobe source owners.
CREATE OR REPLACE VIEW public.published_jrwest_kyoto_kobe_2611_clock_evidence
WITH (security_invoker=true) AS
SELECT f.source_template_id,f.source_line_key,f.source_train_id,
 f.source_public_number_suffix,f.calendar_urn,f.direction_urn,
 f.train_type_urn,f.official_train_number,f.official_source_url,
 f.official_public_train_type,f.official_stop_count,
 f.number_date_verified,f.actual_vehicle_confirmed,f.authorizes_png,
 (m.id IS NOT NULL AND m.train_number=f.source_train_id
 AND m.line_key=f.source_line_key
 AND m.railway_urn='odpt.Railway:JR-West.'||f.source_line_key
 AND m.source_path='data/timetables/'||f.source_line_key||'-manual.js'
 AND m.source_occurrence=0 AND m.source_revision_date IS NULL
 AND m.calendar_urn=f.calendar_urn AND m.direction_urn=f.direction_urn
 AND m.train_type_urn=f.train_type_urn
 AND f.official_train_number=f.source_public_number_suffix
 AND x.n=f.official_stop_count AND x.md5=f.official_stop_md5) verified_source_match
FROM public.published_jrwest_kyoto_kobe_2611_source_fleet f
LEFT JOIN public.manual_timetable_templates m ON m.id=f.source_template_id
LEFT JOIN LATERAL (
 SELECT count(*)::integer n,
 md5(string_agg(concat_ws('|',s.stop_sequence,
   coalesce(s.departure_station_urn,s.arrival_station_urn,''),
   coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),
   E'\n' ORDER BY s.stop_sequence)) md5
 FROM public.manual_timetable_template_stops s WHERE s.template_id=f.source_template_id
) x ON true
WHERE f.official_train_number IS NOT NULL;
DO $proof$
BEGIN
 IF (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence)<>35
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
 WHERE verified_source_match)<>35
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
 WHERE source_line_key='SanyoMain')<>4
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
 WHERE source_line_key='SanyoMain' AND calendar_urn='odpt.Calendar:Weekday')<>3
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
 WHERE source_line_key='TokaidoKansai')<>31
 OR EXISTS(
 SELECT 1 FROM public.published_jrwest_kyoto_kobe_2611_source_fleet
 WHERE source_line_key='SanyoMain' AND source_public_number_suffix='741T'
 AND official_train_number IS NOT NULL)
 THEN RAISE EXCEPTION 'Kyoto-Kobe Sanyo source proof coverage changed'; END IF;
END $proof$;
COMMIT;
