-- JR-West Nara Line, November 2026: original source-clock proofs.
-- Eleven original-source rows retain their historical source train ID,
-- stop list and original (incorrect for 26xx/806x) type. Published type
-- is separately verified against the JR-West official individual train
-- pages; do not mutate original manual templates or invent train trips.
-- Calendar-specific fingerprints disallow using weekday 601/621 times
-- for holiday service; 2646M weekday has DIFFERENT clocks and is NOT
-- certified by this holiday-only proof. 2601MH remains unverified here.
-- 8061/8062 are seasonal "Inishie" express trains, NOT Nara Line locals.
BEGIN;
SELECT pg_advisory_xact_lock(26110734);
CREATE TABLE IF NOT EXISTS public.published_jrwest_nara_2611_verified_source_clocks (
 source_template_id bigint PRIMARY KEY REFERENCES public.manual_timetable_templates(id) ON DELETE CASCADE,
 edition text NOT NULL DEFAULT '2611' CHECK(edition='2611'),
 line_key text NOT NULL DEFAULT 'Nara' CHECK(line_key='Nara'),
 source_train_number text NOT NULL CHECK(source_train_number~'^[0-9]{3,4}MH?$'),
 published_train_number text NOT NULL CHECK(published_train_number~'^[0-9]{3,4}M$'),
 calendar_urn text NOT NULL CHECK(calendar_urn IN('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
 direction_urn text NOT NULL CHECK(direction_urn IN('odpt.RailDirection:Inbound','odpt.RailDirection:Outbound')),
 source_train_type_urn text NOT NULL CHECK(source_train_type_urn='odpt.TrainType:JR-West.Local'),
 published_train_type text NOT NULL CHECK(published_train_type IN ('Local','MiyakojiRapid','LimitedExpress')),
 published_train_type_label text NOT NULL CHECK(published_train_type_label IN ('普通','みやこ路快速','特急')),
 published_service_name text NOT NULL DEFAULT '',
 source_stop_count integer NOT NULL CHECK(source_stop_count IN(3,11,21)),
 source_stops_md5 text NOT NULL CHECK(source_stops_md5~'^[a-f0-9]{32}$'),
 source_clock_verification text NOT NULL DEFAULT 'original_source_stops_compared_with_official'
  CHECK(source_clock_verification='original_source_stops_compared_with_official'),
 official_source_url text NOT NULL CHECK(official_source_url LIKE 'https://timetable.jr-odekake.net/train-timetable/%'),
 official_issue text NOT NULL DEFAULT '2026-11' CHECK(official_issue='2026-11'),
 valid_from date NOT NULL DEFAULT date '2026-11-01' CHECK(valid_from=date '2026-11-01'),
 valid_to date NOT NULL DEFAULT date '2026-11-30' CHECK(valid_to=date '2026-11-30'),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 authorizes_png boolean NOT NULL DEFAULT false CHECK(NOT authorizes_png),
 CONSTRAINT nara_2611_source_calendar_number_check CHECK(
   (calendar_urn='odpt.Calendar:Weekday' AND source_train_number=published_train_number)
   OR
   (calendar_urn='odpt.Calendar:SaturdayHoliday' AND source_train_number=published_train_number||'H')),
 CONSTRAINT nara_2611_official_type_scope CHECK(
    (published_train_type='Local' AND published_train_type_label='普通'
     AND published_train_number IN('601M','602M','621M') AND source_stop_count=21
     AND published_service_name='')
    OR
    (published_train_type='MiyakojiRapid' AND published_train_type_label='みやこ路快速'
     AND published_train_number IN('2636M','2646M') AND source_stop_count=11
     AND published_service_name IN('Ｄみやこ路快速636号','Ｄみやこ路快速646号'))
    OR
    (published_train_type='LimitedExpress' AND published_train_type_label='特急'
     AND published_train_number IN('8061M','8062M') AND source_stop_count=3
     AND published_service_name IN('いにしへ61号','いにしへ62号')
     AND calendar_urn='odpt.Calendar:SaturdayHoliday'))
);
ALTER TABLE public.published_jrwest_nara_2611_verified_source_clocks ENABLE ROW LEVEL SECURITY;
WITH e(source_train_number,calendar_token,direction_token,published_type,
       official_label,expected_count,expected_hash,official_url,service_name) AS (VALUES
('601M','Weekday','Outbound','Local','普通','21','7db854f2c5c08e8445eddc9bd3585f64','https://timetable.jr-odekake.net/train-timetable/44201?date=20261028',''),
('601MH','SaturdayHoliday','Outbound','Local','普通','21','d099033f51feddfa9e06976d3e647458','https://timetable.jr-odekake.net/train-timetable/44201?date=20261018',''),
('602M','Weekday','Inbound','Local','普通','21','e884b6ae1a49c18a3ca4bd50b27088af','https://timetable.jr-odekake.net/train-timetable/44291?date=20261028',''),
('602MH','SaturdayHoliday','Inbound','Local','普通','21','e884b6ae1a49c18a3ca4bd50b27088af','https://timetable.jr-odekake.net/train-timetable/44291?date=20261028',''),
('621M','Weekday','Outbound','Local','普通','21','12122dadb9c23af33481eb925ebb0d33','https://timetable.jr-odekake.net/train-timetable/45791?date=20261028',''),
('621MH','SaturdayHoliday','Outbound','Local','普通','21','a186987f1b9106df75f898dccc993627','https://timetable.jr-odekake.net/train-timetable/45811?date=20261025',''),
('2636M','Weekday','Inbound','MiyakojiRapid','みやこ路快速','11','7df8790db317a341f987b3d51b7358af','https://timetable.jr-odekake.net/train-timetable/26111?date=20261104','Ｄみやこ路快速636号'),
('2636MH','SaturdayHoliday','Inbound','MiyakojiRapid','みやこ路快速','11','7df8790db317a341f987b3d51b7358af','https://timetable.jr-odekake.net/train-timetable/26111?date=20261104','Ｄみやこ路快速636号'),
('2646MH','SaturdayHoliday','Inbound','MiyakojiRapid','みやこ路快速','11','27994a84b0f3e8d3330996ee7f86f959','https://timetable.jr-odekake.net/train-timetable/322681?date=20261103','Ｄみやこ路快速646号'),
('8061MH','SaturdayHoliday','Outbound','LimitedExpress','特急','3','48e5d106110131702c3aad8bc7d6a144','https://timetable.jr-odekake.net/train-timetable/321941?date=20261025','いにしへ61号'),
('8062MH','SaturdayHoliday','Inbound','LimitedExpress','特急','3','df659fc2b8d9fc63f43258e1e5aa5f42','https://timetable.jr-odekake.net/train-timetable/321951?date=20261024','いにしへ62号')
), original AS (
 SELECT m.id,m.train_number,m.calendar_urn,m.direction_urn,m.train_type_urn,
        count(*)::integer stop_count,
        md5(string_agg(concat_ws('|',s.stop_sequence,
             coalesce(s.departure_station_urn,s.arrival_station_urn,''),
             coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),
             E'\n' ORDER BY s.stop_sequence)) source_hash
 FROM public.manual_timetable_templates m
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key='Nara' AND m.railway_urn='odpt.Railway:JR-West.Nara'
   AND m.source_path='data/timetables/Nara-manual.js'
   AND m.source_occurrence=0 AND m.source_revision_date IS NULL
   AND m.train_type_urn='odpt.TrainType:JR-West.Local'
 GROUP BY m.id,m.train_number,m.calendar_urn,m.direction_urn,m.train_type_urn
)
INSERT INTO public.published_jrwest_nara_2611_verified_source_clocks
(source_template_id,source_train_number,published_train_number,
 calendar_urn,direction_urn,source_train_type_urn,
 published_train_type,published_train_type_label,published_service_name,
 source_stop_count,source_stops_md5,official_source_url)
SELECT o.id,o.train_number,regexp_replace(o.train_number,'H$',''),
       o.calendar_urn,o.direction_urn,o.train_type_urn,
       e.published_type,e.official_label,e.service_name,
       o.stop_count,o.source_hash,e.official_url
FROM e JOIN original o ON o.train_number=e.source_train_number
 AND o.calendar_urn='odpt.Calendar:'||e.calendar_token
 AND o.direction_urn='odpt.RailDirection:'||e.direction_token
 AND o.stop_count=e.expected_count::integer
 AND o.source_hash=e.expected_hash
ON CONFLICT (source_template_id) DO NOTHING;
CREATE OR REPLACE VIEW public.published_jrwest_nara_2611_clock_evidence
WITH (security_invoker=true) AS
SELECT p.source_template_id,p.source_train_number,p.published_train_number,
       p.calendar_urn,p.direction_urn,p.source_train_type_urn,
       p.published_train_type,p.published_train_type_label,p.published_service_name,
       p.source_stop_count,p.official_source_url,p.valid_from,p.valid_to,
       p.actual_vehicle_confirmed,p.authorizes_png,
       (m.id IS NOT NULL AND m.line_key='Nara'
        AND m.railway_urn='odpt.Railway:JR-West.Nara'
        AND m.train_number=p.source_train_number
        AND m.calendar_urn=p.calendar_urn AND m.direction_urn=p.direction_urn
        AND m.train_type_urn=p.source_train_type_urn
        AND m.source_path='data/timetables/Nara-manual.js'
        AND m.source_occurrence=0 AND m.source_revision_date IS NULL
        AND p.source_clock_verification='original_source_stops_compared_with_official'
        AND o.stop_count=p.source_stop_count AND o.source_hash=p.source_stops_md5
        AND p.published_train_number=regexp_replace(p.source_train_number,'H$','')
       ) AS verified_source_match
FROM public.published_jrwest_nara_2611_verified_source_clocks p
LEFT JOIN public.manual_timetable_templates m ON m.id=p.source_template_id
LEFT JOIN LATERAL(
 SELECT count(*)::integer stop_count,
   md5(string_agg(concat_ws('|',s.stop_sequence,
       coalesce(s.departure_station_urn,s.arrival_station_urn,''),
       coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),
       E'\n' ORDER BY s.stop_sequence)) source_hash
 FROM public.manual_timetable_template_stops s
 WHERE s.template_id=p.source_template_id
) o ON true;
DO $proof$
BEGIN
 IF (SELECT count(*) FROM public.published_jrwest_nara_2611_clock_evidence)<>11
 OR (SELECT count(*) FROM public.published_jrwest_nara_2611_clock_evidence
     WHERE verified_source_match)<>11
 OR (SELECT count(*) FROM public.published_jrwest_nara_2611_clock_evidence
     WHERE calendar_urn='odpt.Calendar:Weekday')<>4
 OR (SELECT count(*) FROM public.published_jrwest_nara_2611_clock_evidence
     WHERE calendar_urn='odpt.Calendar:SaturdayHoliday')<>7
 OR (SELECT count(*) FROM public.published_jrwest_nara_2611_clock_evidence
     WHERE published_train_type='Local')<>6
 OR (SELECT count(*) FROM public.published_jrwest_nara_2611_clock_evidence
     WHERE published_train_type='MiyakojiRapid')<>3
 OR (SELECT count(*) FROM public.published_jrwest_nara_2611_clock_evidence
     WHERE published_train_type='LimitedExpress')<>2
 OR EXISTS (SELECT 1 FROM public.published_jrwest_nara_2611_clock_evidence
     WHERE actual_vehicle_confirmed OR authorizes_png)
 THEN RAISE EXCEPTION 'Nara 2611 original-source clock verification mismatch'; END IF;
END $proof$;
COMMIT;