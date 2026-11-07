-- Audit hygiene: Kosei 2026-11 proofs now cover 4/5/7/13/18/21/22
-- station source segments, not a universal 18-stop timetable.
-- Retain the existing invoker view and table. Expose the exact
-- ORIGINAL checked count to train-runs for an additional API guard.
-- No new table, no vehicle inference, no physical art/PNG authority.
BEGIN;
SELECT pg_advisory_xact_lock(26110732);
ALTER TABLE public.published_jrwest_kosei_2611_verified_source_clocks
 DROP CONSTRAINT published_jrwest_kosei_2611_ver_source_clock_verification_check;
UPDATE public.published_jrwest_kosei_2611_verified_source_clocks
 SET source_clock_verification='original_source_stops_compared_with_official'
 WHERE source_clock_verification='original_18_stops_compared_with_official';
ALTER TABLE public.published_jrwest_kosei_2611_verified_source_clocks
 ALTER COLUMN source_clock_verification
 SET DEFAULT 'original_source_stops_compared_with_official',
 ALTER COLUMN stop_count DROP DEFAULT,
 ADD CONSTRAINT kosei_2611_generic_original_clock_verification_check CHECK(
 source_clock_verification='original_source_stops_compared_with_official');
CREATE OR REPLACE VIEW public.published_jrwest_kosei_2611_clock_evidence
WITH (security_invoker=true) AS
SELECT p.source_template_id,p.source_train_number,p.published_train_number,
 p.calendar_urn,p.direction_urn,p.official_source_url,p.valid_from,p.valid_to,
 p.actual_vehicle_confirmed,p.authorizes_png,
 (m.id IS NOT NULL
 AND m.train_number=p.source_train_number
 AND m.calendar_urn=p.calendar_urn
 AND m.direction_urn=p.direction_urn
 AND m.line_key='Kosei'
 AND m.railway_urn='odpt.Railway:JR-West.Kosei'
 AND m.train_type_urn='odpt.TrainType:JR-West.Local'
 AND m.source_path='data/timetables/Kosei-manual.js'
 AND m.source_occurrence=0 AND m.source_revision_date IS NULL
 AND p.source_clock_verification='original_source_stops_compared_with_official'
 AND x.stop_count=p.stop_count AND x.source_hash=p.source_stops_md5
 ) AS verified_source_match,
 p.stop_count
FROM public.published_jrwest_kosei_2611_verified_source_clocks p
LEFT JOIN public.manual_timetable_templates m ON m.id=p.source_template_id
LEFT JOIN LATERAL (
 SELECT count(*)::integer stop_count,
 md5(string_agg(concat_ws('|',s.stop_sequence,
 coalesce(s.departure_station_urn,s.arrival_station_urn,''),
 coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),
 E'\n' ORDER BY s.stop_sequence)) source_hash
 FROM public.manual_timetable_template_stops s WHERE s.template_id=p.source_template_id
) x ON true;
DO $proof$
BEGIN
 IF (SELECT count(*) FROM public.published_jrwest_kosei_2611_clock_evidence)<>83
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_clock_evidence WHERE verified_source_match)<>83
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_clock_evidence
 WHERE stop_count NOT IN(4,5,7,13,18,21,22))<>0
 OR (SELECT count(*) FROM public.published_jrwest_kosei_2611_verified_source_clocks
 WHERE source_clock_verification<>'original_source_stops_compared_with_official')<>0
 THEN RAISE EXCEPTION 'Kosei generic original stop proof migration failed'; END IF;
END $proof$;
COMMIT;