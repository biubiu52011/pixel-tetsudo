-- 2026-11 JR West Kyoto/Kobe: 5 partial 7-station source runs
-- checked against date/edition-specific official new-rapid schedules.
-- Keep the existing historical composite source ID and fleet candidates.
-- Do NOT turn any official number into a physical carset or PNG claim.
BEGIN;
SELECT pg_advisory_xact_lock(26110713);
ALTER TABLE public.published_jrwest_kyoto_kobe_2611_source_fleet
 ADD COLUMN IF NOT EXISTS official_train_number text,
 ADD COLUMN IF NOT EXISTS official_source_url text,
 ADD COLUMN IF NOT EXISTS official_stop_md5 text,
 ADD COLUMN IF NOT EXISTS official_stop_count integer,
 ADD COLUMN IF NOT EXISTS official_public_train_type text;
ALTER TABLE public.published_jrwest_kyoto_kobe_2611_source_fleet
 ADD CONSTRAINT jrwest_kyoto_kobe_2611_clock_proof_scope CHECK(
 (official_train_number IS NULL AND official_source_url IS NULL
 AND official_stop_md5 IS NULL AND official_stop_count IS NULL
 AND official_public_train_type IS NULL)
 OR (official_train_number ~ '^[0-9]{4}M$'
 AND official_train_number=source_public_number_suffix
 AND official_source_url LIKE 'https://timetable.jr-odekake.net/train-timetable/%'
 AND official_stop_md5 ~ '^[a-f0-9]{32}$'
 AND official_stop_count=7
 AND official_public_train_type='SpecialRapid'
 AND source_line_key='TokaidoKansai' AND service_family='regional_rapid_t_m'
 AND number_date_verified=false AND actual_vehicle_confirmed=false AND authorizes_png=false)
 );
WITH e(source_train_id,official_num,expected_hash,source_url,calendar_token,dir) AS (VALUES
('500300-1862700-3447M','3447M','cb52493b61c4157550a216b7dddcff11','https://timetable.jr-odekake.net/train-timetable/173871?date=20261023','Weekday','Outbound'),
('500300-2233400-3465M','3465M','f46e2b48b71ac3d9ddb55cf758aae710','https://timetable.jr-odekake.net/train-timetable/206551?date=20261030','Weekday','Outbound'),
('500300-2233700-3473M','3473M','eb57680addd7e6b863112898faf103fc','https://timetable.jr-odekake.net/train-timetable/206581?date=20261024','SaturdayHoliday','Outbound'),
('500310-1865300-3472M','3472M','2b6d07c81663d5eef6b584268adfe07a','https://timetable.jr-odekake.net/train-timetable/173081?date=20261028','SaturdayHoliday','Inbound'),
('500310-2253600-3530M','3530M','63dc6bc136c50a59e312fbe049e86952','https://timetable.jr-odekake.net/train-timetable/208291?date=20261024','SaturdayHoliday','Inbound')
), hashes AS(
 SELECT m.id,m.train_number,m.calendar_urn,m.direction_urn,
 COUNT(*)::integer n,md5(string_agg(concat_ws('|',s.stop_sequence,
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
SET official_train_number=e.official_num, official_source_url=e.source_url,
 official_stop_md5=e.expected_hash,official_stop_count=7,
 official_public_train_type='SpecialRapid'
FROM e JOIN hashes h ON h.train_number=e.source_train_id
 AND h.calendar_urn='odpt.Calendar:'||e.calendar_token
 AND h.direction_urn='odpt.RailDirection:'||e.dir
 AND h.n=7 AND h.original_hash=e.expected_hash
WHERE f.source_template_id=h.id AND f.source_train_id=e.source_train_id
 AND f.source_line_key='TokaidoKansai' AND f.edition='2611'
 AND f.source_public_number_suffix=e.official_num
 AND f.calendar_urn=h.calendar_urn AND f.direction_urn=h.direction_urn
 AND f.service_family='regional_rapid_t_m' AND f.authorizes_png=false;
CREATE OR REPLACE VIEW public.published_jrwest_kyoto_kobe_2611_clock_evidence
WITH (security_invoker=true) AS
SELECT f.source_template_id,f.source_line_key,f.source_train_id,
 f.source_public_number_suffix,f.calendar_urn,f.direction_urn,
 f.train_type_urn,f.official_train_number,f.official_source_url,
 f.official_public_train_type,f.official_stop_count,
 f.number_date_verified,f.actual_vehicle_confirmed,f.authorizes_png,
 (m.id IS NOT NULL AND m.train_number=f.source_train_id
 AND m.line_key='TokaidoKansai'
 AND m.railway_urn='odpt.Railway:JR-West.TokaidoKansai'
 AND m.source_path='data/timetables/TokaidoKansai-manual.js'
 AND m.source_revision_date IS NULL
 AND m.calendar_urn=f.calendar_urn AND m.direction_urn=f.direction_urn
 AND m.train_type_urn=f.train_type_urn
 AND f.official_train_number=f.source_public_number_suffix
 AND x.n=f.official_stop_count AND x.md5=f.official_stop_md5) verified_source_match
FROM public.published_jrwest_kyoto_kobe_2611_source_fleet f
LEFT JOIN public.manual_timetable_templates m ON m.id=f.source_template_id
LEFT JOIN LATERAL (
 SELECT count(*)::integer n, md5(string_agg(concat_ws('|',s.stop_sequence,
 coalesce(s.departure_station_urn,s.arrival_station_urn,''),
 coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),
 E'\n' ORDER BY s.stop_sequence)) md5
 FROM public.manual_timetable_template_stops s WHERE s.template_id=f.source_template_id
) x ON true
WHERE f.official_train_number IS NOT NULL;
DO $proof$
BEGIN
 IF (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence)<>5
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
 WHERE verified_source_match)<>5
 OR EXISTS (SELECT 1 FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence
 WHERE number_date_verified OR actual_vehicle_confirmed OR authorizes_png)
 THEN RAISE EXCEPTION 'Kyoto/Kobe five verified source segments changed'; END IF;
END $proof$;
COMMIT;