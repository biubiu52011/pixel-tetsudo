-- JR-West November 2026 JR Kobe Line: 2 M SpecialRapid + 1 M
-- Rapid (717M) + 1 T Rapid (815T) on original SanyoMain source rows.
-- The physical vehicle fleet, PNG and missing through-service stations
-- remain UNCONFIRMED. Do not classify every 'M' as SpecialRapid!
BEGIN;
SELECT pg_advisory_xact_lock(26110727);
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
        AND official_stop_count=7 AND official_public_train_type='SpecialRapid'
        AND service_family='regional_rapid_t_m')
       OR
       (official_train_number~'^[0-9]{3,4}C$'
        AND official_stop_count IN (16,19,25,32,33)
        AND official_public_train_type='Local' AND service_family='local_c')
       OR
       (official_train_number~'^[0-9]{3,4}T$'
        AND official_stop_count=18 AND official_public_train_type='Rapid'
        AND service_family='regional_rapid_t_m')))
     OR
     (source_line_key='SanyoMain' AND (
       (official_train_number IN
        ('173C','209C','217C','241C','153C','189C',
         '191C','4631C','4693C','4729C')
        AND official_stop_count IN(5,11)
        AND official_public_train_type='Local' AND service_family='local_c'
        AND
        ((official_train_number IN
          ('173C','209C','241C','153C','189C','191C','4693C')
            AND calendar_urn='odpt.Calendar:Weekday')
          OR
         (official_train_number IN ('217C','4631C','4729C')
            AND calendar_urn='odpt.Calendar:SaturdayHoliday')))
       OR
       (official_train_number IN ('3425M','3469M')
        AND calendar_urn='odpt.Calendar:SaturdayHoliday'
        AND official_stop_count=4 AND official_public_train_type='SpecialRapid'
        AND service_family='regional_rapid_t_m')
       OR
       (official_train_number='717M'
        AND calendar_urn='odpt.Calendar:Weekday'
        AND official_stop_count=17 AND official_public_train_type='Rapid'
        AND service_family='regional_rapid_t_m')
       OR
       (official_train_number='815T'
        AND calendar_urn='odpt.Calendar:SaturdayHoliday'
        AND official_stop_count=17 AND official_public_train_type='Rapid'
        AND service_family='regional_rapid_t_m')))
   ))
 );
WITH e(source_train_id,public_number,calendar_token,public_type,
       expected_count,expected_hash,official_url) AS(VALUES
('710100-2112700-3425M','3425M','SaturdayHoliday','SpecialRapid','4','6da66223748ed24c4040f4e3972d2ea0','https://timetable.jr-odekake.net/train-timetable/173971?date=20261121'),
('710100-1575800-3469M','3469M','SaturdayHoliday','SpecialRapid','4','9cdab3bc6046275a84d1dd431a901e39','https://timetable.jr-odekake.net/train-timetable/145241?date=20261124'),
('710100-4335600-717M','717M','Weekday','Rapid','17','29dd3c384fafce9d4d098c178f4246f0','https://timetable.jr-odekake.net/train-timetable/101711?date=20261027'),
('710100-1094900-815T','815T','SaturdayHoliday','Rapid','17','591f810e65dfe14b3cbddf1dcbc8766c','https://timetable.jr-odekake.net/train-timetable/102101?date=20261012')
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
   AND m.train_type_urn='odpt.TrainType:JR-West.Rapid'
   AND m.direction_urn='odpt.RailDirection:Outbound'
 GROUP BY m.id,m.train_number,m.calendar_urn,m.direction_urn,m.train_type_urn
)
UPDATE public.published_jrwest_kyoto_kobe_2611_source_fleet f
SET official_train_number=e.public_number,
 official_source_url=e.official_url,
 official_stop_md5=e.expected_hash,
 official_stop_count=e.expected_count::integer,
 official_public_train_type=e.public_type
FROM e JOIN fingerprints p ON p.train_number=e.source_train_id
 AND p.calendar_urn='odpt.Calendar:'||e.calendar_token
 AND p.original_hash=e.expected_hash AND p.stop_count=e.expected_count::integer
WHERE f.source_template_id=p.id AND f.source_train_id=e.source_train_id
 AND f.source_line_key='SanyoMain' AND f.edition='2611'
 AND f.calendar_urn=p.calendar_urn AND f.direction_urn=p.direction_urn
 AND f.source_public_number_suffix=e.public_number
 AND f.candidate_segment='kobe_himeji'
 AND f.train_type_urn='odpt.TrainType:JR-West.Rapid'
 AND f.service_family='regional_rapid_t_m' AND f.reference_only=true
 AND f.number_date_verified=false AND f.actual_vehicle_confirmed=false
 AND f.authorizes_png=false AND f.official_train_number IS NULL
 AND NOT f.official_calendar_conflict;
DO $proof$
BEGIN
 IF (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence)<>45
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
 WHERE verified_source_match)<>45
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
 WHERE source_line_key='SanyoMain')<>14
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
 WHERE source_line_key='SanyoMain'
 AND official_public_train_type='SpecialRapid')<>2
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
 WHERE source_line_key='SanyoMain'
 AND official_public_train_type='Rapid')<>2
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
 WHERE source_line_key='TokaidoKansai')<>31
 OR EXISTS(SELECT 1 FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
 WHERE actual_vehicle_confirmed OR authorizes_png)
 THEN RAISE EXCEPTION 'JR Kobe Line Sanyo C/T/M 45 source proof count changed'; END IF;
END $proof$;
COMMIT;